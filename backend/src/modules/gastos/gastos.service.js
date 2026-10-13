// ============================================================
// GASTOS SERVICE — Módulo 3 (RF8 / CU-23)
// Gasto reembolsable de un expediente O de un trámite (RN-26).
// "padre" es { expedienteId } o { tramiteId }: siempre uno solo,
// porque lo decide la URL, no el body (mismo patrón que liquidaciones).
//
// REGLAS:
//  - Los gastos NO llevan IVA (es devolución de lo desembolsado).
//  - Se editan solo si están PENDIENTE (sin cobros).
//  - NO se borran: se ANULAN (estado ANULADO + auditoría ANULAR).
//    Un gasto ANULADO no cuenta en el saldo (cuenta corriente, 3.4).
// ============================================================
const prisma = require('../../config/database');
const { ErrorNegocio } = require('../../utils/errores');
const { siVino, limpiarTexto } = require('../../utils/entrada');
const { registrarAuditoria } = require('../../utils/auditoria');
const { fechaDeHoy } = require('../../utils/calendarioRuc');

// Tope de Decimal(15,2): 13 dígitos enteros. Evita que Postgres reviente con un 500.
const MONTO_MAXIMO = 9999999999999;

// ------------------------------------------------------------
// HELPER: verificarPadre
// Confirma que el expediente / trámite exista (404 si no).
// Con exigirActivo (por defecto) un expediente inactivo no recibe
// gastos nuevos (igual que liquidaciones, actuaciones y plazos).
// ------------------------------------------------------------
const verificarPadre = async ({ expedienteId, tramiteId }, { exigirActivo = true } = {}) => {
  if (tramiteId) {
    const tramite = await prisma.tramite.findUnique({ where: { id: tramiteId }, select: { id: true } });
    if (!tramite) throw new ErrorNegocio('Trámite no encontrado', 404);
    return;
  }
  const expediente = await prisma.expediente.findUnique({
    where: { id: expedienteId },
    select: { id: true, activo: true },
  });
  if (!expediente) throw new ErrorNegocio('Expediente no encontrado', 404);
  if (exigirActivo && !expediente.activo) {
    throw new ErrorNegocio('No se pueden registrar gastos sobre un expediente inactivo.', 409);
  }
};

// ------------------------------------------------------------
// HELPER: validarMonto
// Guaraníes enteros (igual que los honorarios), mayor a 0 y con tope.
// Acepta número o texto ("150000"), porque así llega del formulario.
// ------------------------------------------------------------
const validarMonto = (valor) => {
  const n = Number(valor);
  if (valor === null || valor === undefined || valor === '' || !Number.isFinite(n) || n <= 0) {
    throw new ErrorNegocio('El monto debe ser un número mayor a 0');
  }
  if (!Number.isInteger(n)) {
    throw new ErrorNegocio('El monto se expresa en guaraníes enteros, sin decimales');
  }
  if (n > MONTO_MAXIMO) throw new ErrorNegocio('El monto supera el máximo permitido');
  return n;
};

// ------------------------------------------------------------
// HELPER: validarFecha
// La fecha del gasto es un desembolso que YA ocurrió: no puede ser
// futura. "fecha" llega como Date UTC a medianoche (parsearFecha);
// fechaDeHoy() también, así que se comparan directo.
// ------------------------------------------------------------
const validarFecha = (fecha) => {
  if (fecha > fechaDeHoy()) throw new ErrorNegocio('La fecha del gasto no puede ser futura');
  return fecha;
};

// ------------------------------------------------------------
// HELPER: describir — texto legible para la auditoría
// ------------------------------------------------------------
const describir = (gasto) => {
  const origen = gasto.tramiteId ? `trámite #${gasto.tramiteId}` : `expediente #${gasto.expedienteId}`;
  const monto = Number(gasto.monto).toLocaleString('es-PY');
  return `Gasto Gs. ${monto} (${gasto.concepto}) en ${origen}`;
};

// ------------------------------------------------------------
// LISTAR los gastos de un expediente o trámite (más nuevos primero).
// Incluye los ANULADOS: el frontend los muestra tachados y no los suma.
// ------------------------------------------------------------
const listarGastos = async (padre) => {
  // Para LISTAR no importa si el expediente está inactivo: solo que exista.
  await verificarPadre(padre, { exigirActivo: false });
  return prisma.gastoReembolsable.findMany({
    where: padre,
    orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
  });
};

const obtenerGasto = (id) => prisma.gastoReembolsable.findUniqueOrThrow({ where: { id } });

// ------------------------------------------------------------
// CREAR: nace PENDIENTE (default del schema).
// ------------------------------------------------------------
const crearGasto = async (padre, datos, usuarioId) => {
  await verificarPadre(padre);
  const monto = validarMonto(datos.monto);
  const fecha = validarFecha(datos.fecha);

  return prisma.$transaction(async (tx) => {
    const gasto = await tx.gastoReembolsable.create({
      data: {
        ...padre, // completa SOLO una de las dos claves foráneas
        concepto: limpiarTexto(datos.concepto),
        fecha,
        monto,
        comprobante: limpiarTexto(datos.comprobante),
      },
    });

    await registrarAuditoria(tx, {
      usuarioId,
      accion: 'CREAR',
      entidad: 'GastoReembolsable',
      entidadId: gasto.id,
      detalle: describir(gasto),
    });
    return gasto;
  });
};

// ------------------------------------------------------------
// ACTUALIZAR (PUT parcial) — solo si está PENDIENTE.
// Un ANULADO no se toca (queda como registro) y uno con cobros ya es
// un hecho contable (el Módulo 4 lo pasa a COBRADO_PARCIALMENTE / COBRADO).
// ------------------------------------------------------------
const actualizarGasto = async (id, datos, usuarioId) => {
  const actual = await prisma.gastoReembolsable.findUniqueOrThrow({ where: { id } });

  if (actual.estado === 'ANULADO') {
    throw new ErrorNegocio('Un gasto anulado no se puede editar.', 409);
  }
  if (actual.estado !== 'PENDIENTE') {
    throw new ErrorNegocio('Solo se puede editar un gasto sin cobros (estado PENDIENTE).', 409);
  }

  // Lo nuevo si vino, si no lo que ya estaba guardado
  const monto = siVino(datos, 'monto') ? validarMonto(datos.monto) : Number(actual.monto);
  const fecha = siVino(datos, 'fecha') ? validarFecha(datos.fecha) : actual.fecha;
  const concepto = siVino(datos, 'concepto') ? limpiarTexto(datos.concepto) : actual.concepto;
  const comprobante = siVino(datos, 'comprobante') ? limpiarTexto(datos.comprobante) : actual.comprobante;

  if (!concepto) throw new ErrorNegocio('El concepto es obligatorio');

  return prisma.$transaction(async (tx) => {
    const gasto = await tx.gastoReembolsable.update({
      where: { id },
      data: { concepto, fecha, monto, comprobante },
    });

    await registrarAuditoria(tx, {
      usuarioId,
      accion: 'EDITAR',
      entidad: 'GastoReembolsable',
      entidadId: id,
      detalle: describir(gasto),
    });
    return gasto;
  });
};

// ------------------------------------------------------------
// ANULAR (CU-23: "anular un gasto cargado por error").
// No borra: cambia el estado a ANULADO y deja el registro.
// Solo si está PENDIENTE (si ya tiene cobros, se anula el cobro en
// el Módulo 4, no el gasto).
// ------------------------------------------------------------
const anularGasto = async (id, usuarioId) => {
  const actual = await prisma.gastoReembolsable.findUniqueOrThrow({ where: { id } });

  if (actual.estado === 'ANULADO') {
    throw new ErrorNegocio('El gasto ya está anulado.', 409);
  }
  if (actual.estado !== 'PENDIENTE') {
    throw new ErrorNegocio('Solo se puede anular un gasto sin cobros (estado PENDIENTE).', 409);
  }

  return prisma.$transaction(async (tx) => {
    const gasto = await tx.gastoReembolsable.update({
      where: { id },
      data: { estado: 'ANULADO' },
    });

    await registrarAuditoria(tx, {
      usuarioId,
      accion: 'ANULAR',
      entidad: 'GastoReembolsable',
      entidadId: id,
      detalle: describir(gasto),
    });
    return gasto;
  });
};

module.exports = {
  listarGastos,
  obtenerGasto,
  crearGasto,
  actualizarGasto,
  anularGasto,
};