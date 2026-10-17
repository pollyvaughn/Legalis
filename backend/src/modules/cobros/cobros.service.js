// ============================================================
// COBROS SERVICE — Módulo 4 (RF10 / CU-26 y CU-27)
// Registra recibos (Cobro) de un expediente O de un trámite (RN-31),
// los lista y los anula (RN-35). "padre" es { expedienteId } o
// { tramiteId }: siempre uno solo, porque lo decide la URL, no el body
// (mismo patrón que liquidaciones y gastos).
//
// REGLAS (carpeta):
//  - RN-31: un recibo = un solo expediente o trámite; hasta una línea por
//           tipo (HONORARIOS, GASTOS, ANTICIPO).
//  - RN-32: el ANTICIPO solo resta del saldo (puede dejar saldo a favor).
//  - RN-33: cada línea de HONORARIOS o GASTOS <= saldo pendiente de ese tipo.
//  - RN-34: numero correlativo desde 1, no se reutiliza (los anulados cuentan).
//  - RN-35: los recibos no se borran: se anulan (motivo obligatorio) y sus
//           importes vuelven al saldo.
//
// Las cuentas (validaciones por tipo, reparto de estados) están en
// utils/calculoCobros.js. Acá solo se leen datos, se llama a esas funciones
// y se guarda TODO en una misma transacción junto con la auditoría.
//
// Decisión: se puede cobrar aunque el expediente o el cliente estén
// inactivos (hay que poder cobrar lo ya liquidado).
// ============================================================
const prisma = require('../../config/database');
const { ErrorNegocio } = require('../../utils/errores');
const { limpiarTexto } = require('../../utils/entrada');
const { registrarAuditoria } = require('../../utils/auditoria');
const { fechaDeHoy } = require('../../utils/calendarioRuc');
const { formatearGs } = require('../../utils/formatoHonorarios');
const { calcularSaldo } = require('../../utils/cuentaCorriente');
const {
  validarLineas,
  validarMetodoPago,
  sumarPorTipo,
  calcularSaldosPorTipo,
  validarContraSaldos,
  repartirEstados,
} = require('../../utils/calculoCobros');

const MOTIVO_MAXIMO = 300; // VarChar(300) de motivoAnulacion

// Nombre legible de cada tipo de línea (para el detalle de la auditoría)
const NOMBRE_LINEA = { HONORARIOS: 'honorarios', GASTOS: 'gastos', ANTICIPO: 'anticipo' };

// ------------------------------------------------------------
// Qué datos relacionados se traen junto con cada recibo
// ------------------------------------------------------------
const INCLUIR = {
  cliente: { select: { id: true, nombreRazonSocial: true, ruc: true } },
  expediente: { select: { id: true, numeroExpediente: true, anio: true, caratula: true, juzgado: true } },
  tramite: { select: { id: true, periodo: true, tipoTramite: { select: { nombre: true } } } },
  lineas: { orderBy: { id: 'asc' } },
  creadoPor: { select: { id: true, nombre: true } },
  anuladoPor: { select: { id: true, nombre: true } },
};

// ------------------------------------------------------------
// HELPER: formatearCobro
// Deja el recibo listo para el frontend: montos como número (Prisma
// devuelve los Decimal como objeto) y el total del recibo ya sumado.
// ------------------------------------------------------------
const formatearCobro = (c) => {
  const lineas = c.lineas.map((l) => ({ id: l.id, tipo: l.tipo, monto: Number(l.monto) }));
  return {
    id: c.id,
    numero: c.numero,
    fecha: c.fecha,
    estado: c.estado,
    metodoPago: c.metodoPago,
    referenciaPago: c.referenciaPago,
    concepto: c.concepto,
    cliente: c.cliente,
    expediente: c.expediente,
    tramite: c.tramite
      ? { id: c.tramite.id, periodo: c.tramite.periodo, tipo: c.tramite.tipoTramite.nombre }
      : null,
    lineas,
    total: lineas.reduce((suma, l) => suma + l.monto, 0),
    anulacion:
      c.estado === 'ANULADO'
        ? { fecha: c.anuladoEn, motivo: c.motivoAnulacion, por: c.anuladoPor }
        : null,
    creadoPor: c.creadoPor,
    creadoEn: c.creadoEn,
  };
};

// ------------------------------------------------------------
// HELPER: resolverPadre
// Confirma que el expediente / trámite exista (404 si no) y devuelve
// el clienteId dueño. Recibe "db" (prisma o tx) para poder usarse
// dentro de una transacción.
// ------------------------------------------------------------
const resolverPadre = async (db, { expedienteId, tramiteId }) => {
  if (tramiteId) {
    const tramite = await db.tramite.findUnique({ where: { id: tramiteId }, select: { clienteId: true } });
    if (!tramite) throw new ErrorNegocio('Trámite no encontrado', 404);
    return { clienteId: tramite.clienteId };
  }
  const expediente = await db.expediente.findUnique({ where: { id: expedienteId }, select: { clienteId: true } });
  if (!expediente) throw new ErrorNegocio('Expediente no encontrado', 404);
  return { clienteId: expediente.clienteId };
};

// ------------------------------------------------------------
// HELPER: leerMovimientos
// Lee TODO lo que hace falta para las cuentas de un expediente/trámite:
//  - liquidaciones y gastos NO anulados, de la más antigua a la más
//    nueva (el orden que usa repartirEstados)
//  - líneas de recibos EMITIDOS (los anulados no cuentan)
// Las consultas van una tras otra (no en paralelo) porque pueden correr
// dentro de una transacción.
// ------------------------------------------------------------
const leerMovimientos = async (db, padre) => {
  const orden = [{ creadoEn: 'asc' }, { id: 'asc' }];

  const liquidaciones = await db.liquidacionHonorarios.findMany({
    where: padre,
    select: { id: true, montoTotal: true, estado: true },
    orderBy: orden,
  });
  const gastos = await db.gastoReembolsable.findMany({
    where: { ...padre, estado: { not: 'ANULADO' } },
    select: { id: true, monto: true, estado: true },
    orderBy: orden,
  });
  const lineas = await db.cobroLinea.findMany({
    where: { cobro: { ...padre, estado: 'EMITIDO' } },
    select: { tipo: true, monto: true },
  });

  return {
    liquidaciones,
    gastos,
    cobrado: sumarPorTipo(lineas),
    honorariosTotal: liquidaciones.reduce((suma, l) => suma + Number(l.montoTotal), 0),
    gastosTotal: gastos.reduce((suma, g) => suma + Number(g.monto), 0),
  };
};

// ------------------------------------------------------------
// HELPER: saldoDe — saldo total del expediente/trámite (RN-29).
// Puede dar negativo = saldo a favor del cliente (anticipos).
// ------------------------------------------------------------
const saldoDe = (mov) =>
  calcularSaldo({
    honorariosTotal: mov.honorariosTotal,
    gastosTotal: mov.gastosTotal,
    cobrado: mov.cobrado.total,
  });

// ------------------------------------------------------------
// HELPER: actualizarEstados
// Recalcula el estado de cada liquidación y gasto (PENDIENTE /
// COBRADO_PARCIALMENTE / COBRADO) con lo cobrado hoy y guarda SOLO
// los que cambiaron. Se llama después de cada cobro y de cada
// anulación, dentro de la misma transacción.
// ------------------------------------------------------------
const actualizarEstados = async (tx, mov) => {
  const nuevosHonorarios = repartirEstados(
    mov.liquidaciones.map((l) => ({ id: l.id, monto: l.montoTotal })),
    mov.cobrado.honorarios
  );
  const estadoActualLiq = new Map(mov.liquidaciones.map((l) => [l.id, l.estado]));
  for (const { id, estado } of nuevosHonorarios) {
    if (estadoActualLiq.get(id) !== estado) {
      await tx.liquidacionHonorarios.update({ where: { id }, data: { estado } });
    }
  }

  const nuevosGastos = repartirEstados(
    mov.gastos.map((g) => ({ id: g.id, monto: g.monto })),
    mov.cobrado.gastos
  );
  const estadoActualGasto = new Map(mov.gastos.map((g) => [g.id, g.estado]));
  for (const { id, estado } of nuevosGastos) {
    if (estadoActualGasto.get(id) !== estado) {
      await tx.gastoReembolsable.update({ where: { id }, data: { estado } });
    }
  }
};

// ------------------------------------------------------------
// HELPER: describir — texto legible para la auditoría
// ------------------------------------------------------------
const describir = (cobro, lineas) => {
  const origen = cobro.tramiteId ? `trámite #${cobro.tramiteId}` : `expediente #${cobro.expedienteId}`;
  const total = lineas.reduce((suma, l) => suma + l.monto, 0);
  const partes = lineas.map((l) => `${NOMBRE_LINEA[l.tipo]} ${formatearGs(l.monto)}`).join(', ');
  return `Recibo N° ${cobro.numero} — ${formatearGs(total)} (${partes}) en ${origen}`;
};

// ============================================================
// REGISTRAR UN COBRO (CU-26)
// datos: { fecha (Date), metodoPago, referenciaPago?, concepto?, lineas: [{tipo, monto}] }
// ============================================================
const registrarCobro = async (padre, datos, usuarioId) => {
  // Validaciones que no necesitan la base
  const lineas = validarLineas(datos.lineas);
  const metodoPago = validarMetodoPago(datos.metodoPago);
  // "fecha" llega como Date UTC a medianoche y fechaDeHoy() también: se comparan directo
  if (datos.fecha > fechaDeHoy()) throw new ErrorNegocio('La fecha del cobro no puede ser futura');

  try {
    return await prisma.$transaction(async (tx) => {
      const { clienteId } = await resolverPadre(tx, padre);

      // RN-33: cada línea contra el saldo pendiente de su tipo
      const antes = await leerMovimientos(tx, padre);
      validarContraSaldos(
        lineas,
        calcularSaldosPorTipo({
          honorariosTotal: antes.honorariosTotal,
          gastosTotal: antes.gastosTotal,
          cobradoHonorarios: antes.cobrado.honorarios,
          cobradoGastos: antes.cobrado.gastos,
        })
      );

      // RN-34: siguiente número = máximo + 1 (los recibos anulados siguen
      // en la tabla, así que su número nunca se reutiliza)
      const { _max } = await tx.cobro.aggregate({ _max: { numero: true } });
      const numero = (_max.numero ?? 0) + 1;

      const cobro = await tx.cobro.create({
        data: {
          numero,
          clienteId,
          ...padre, // completa SOLO una de las dos claves foráneas
          fecha: datos.fecha,
          metodoPago,
          referenciaPago: limpiarTexto(datos.referenciaPago) ?? null,
          concepto: limpiarTexto(datos.concepto) ?? null,
          creadoPorId: usuarioId,
          lineas: { create: lineas },
        },
        include: INCLUIR,
      });

      // Con este recibo ya guardado, se actualiza el estado de lo cobrado
      const despues = await leerMovimientos(tx, padre);
      await actualizarEstados(tx, despues);

      await registrarAuditoria(tx, {
        usuarioId,
        accion: 'COBRAR',
        entidad: 'Cobro',
        entidadId: cobro.id,
        detalle: describir(cobro, lineas),
      });

      return { ...formatearCobro(cobro), saldoActual: saldoDe(despues) };
    });
  } catch (error) {
    // P2002 = número de recibo repetido: pasa solo si dos cobros se
    // registran en el mismo instante. Se pide reintentar en vez de un 500.
    if (error.code === 'P2002') {
      throw new ErrorNegocio('No se pudo asignar el número de recibo. Intentá de nuevo.', 409);
    }
    throw error;
  }
};

// ============================================================
// LISTAR los recibos de un expediente o trámite (más nuevos primero)
// Incluye los ANULADOS: el frontend los muestra marcados y no los suma.
// ============================================================
const listarDePadre = async (padre) => {
  await resolverPadre(prisma, padre);
  const cobros = await prisma.cobro.findMany({
    where: padre,
    include: INCLUIR,
    orderBy: { numero: 'desc' },
  });
  return cobros.map(formatearCobro);
};

// ============================================================
// LISTAR todos los recibos con filtros y paginación (pantalla /cobros
// y reportes del 4.5). Responde { datos, total, pagina, limite, totalPaginas }.
// filtros: { estado, clienteId, expedienteId, tramiteId, desde, hasta, tipo, pagina, limite }
//   estado -> EMITIDO | ANULADO (sin valor = todos)
//   tipo   -> solo recibos que tengan una línea de ese tipo
//   desde / hasta -> Date (fecha del cobro, ambos inclusive)
// ============================================================
const listarCobros = async (filtros = {}) => {
  const pagina = Math.max(1, Number(filtros.pagina) || 1);
  const limite = Math.max(1, Number(filtros.limite) || 20);

  const where = {};
  if (filtros.estado) where.estado = filtros.estado;
  if (filtros.clienteId) where.clienteId = filtros.clienteId;
  if (filtros.expedienteId) where.expedienteId = filtros.expedienteId;
  if (filtros.tramiteId) where.tramiteId = filtros.tramiteId;
  if (filtros.tipo) where.lineas = { some: { tipo: filtros.tipo } };
  if (filtros.desde || filtros.hasta) {
    where.fecha = {};
    if (filtros.desde) where.fecha.gte = filtros.desde;
    if (filtros.hasta) where.fecha.lte = filtros.hasta;
  }

  const [total, cobros] = await Promise.all([
    prisma.cobro.count({ where }),
    prisma.cobro.findMany({
      where,
      include: INCLUIR,
      orderBy: { numero: 'desc' },
      skip: (pagina - 1) * limite,
      take: limite,
    }),
  ]);

  return {
    datos: cobros.map(formatearCobro),
    total,
    pagina,
    limite,
    totalPaginas: Math.max(1, Math.ceil(total / limite)),
  };
};

// ============================================================
// OBTENER un recibo por id, con el saldo actual de su expediente/trámite
// ============================================================
const obtenerCobro = async (id) => {
  const cobro = await prisma.cobro.findUnique({ where: { id }, include: INCLUIR });
  if (!cobro) throw new ErrorNegocio('Recibo no encontrado', 404);

  const padre = cobro.tramiteId ? { tramiteId: cobro.tramiteId } : { expedienteId: cobro.expedienteId };
  const mov = await leerMovimientos(prisma, padre);
  return { ...formatearCobro(cobro), saldoActual: saldoDe(mov) };
};

// ============================================================
// ANULAR un recibo (CU-27, RN-35)
// No borra: pasa a ANULADO, conserva el número y registra fecha, motivo
// y quién lo anuló. Sus importes vuelven al saldo y los estados de
// liquidaciones y gastos se recalculan.
// ============================================================
const anularCobro = async (id, motivoCrudo, usuarioId) => {
  const motivo = limpiarTexto(motivoCrudo);
  if (typeof motivo !== 'string' || !motivo) {
    throw new ErrorNegocio('El motivo de la anulación es obligatorio');
  }
  if (motivo.length > MOTIVO_MAXIMO) {
    throw new ErrorNegocio(`El motivo no puede superar ${MOTIVO_MAXIMO} caracteres`);
  }

  return prisma.$transaction(async (tx) => {
    const actual = await tx.cobro.findUnique({ where: { id }, include: { lineas: true } });
    if (!actual) throw new ErrorNegocio('Recibo no encontrado', 404);
    if (actual.estado === 'ANULADO') throw new ErrorNegocio('El recibo ya está anulado.', 409);

    const cobro = await tx.cobro.update({
      where: { id },
      data: { estado: 'ANULADO', anuladoEn: new Date(), motivoAnulacion: motivo, anuladoPorId: usuarioId },
      include: INCLUIR,
    });

    // Sin este recibo, lo cobrado baja: se recalculan los estados
    const padre = actual.tramiteId ? { tramiteId: actual.tramiteId } : { expedienteId: actual.expedienteId };
    const despues = await leerMovimientos(tx, padre);
    await actualizarEstados(tx, despues);

    await registrarAuditoria(tx, {
      usuarioId,
      accion: 'ANULAR',
      entidad: 'Cobro',
      entidadId: id,
      detalle: `${describir(actual, actual.lineas.map((l) => ({ tipo: l.tipo, monto: Number(l.monto) })))} — motivo: ${motivo}`,
    });

    return { ...formatearCobro(cobro), saldoActual: saldoDe(despues) };
  });
};

module.exports = {
  registrarCobro,
  listarDePadre,
  listarCobros,
  obtenerCobro,
  anularCobro,
};