// ============================================================
// LIQUIDACIONES SERVICE — Módulo 3 (RF7 / CU-22)
// Liquidación de honorarios de un expediente O de un trámite (RN-26).
// "padre" es { expedienteId } o { tramiteId }: siempre uno solo,
// porque lo decide la URL, no el body (mismo patrón que documentos).
// El cálculo (neto + IVA + total) vive en utils/calculoHonorarios.js.
// ============================================================
const prisma = require('../../config/database');
const { ErrorNegocio } = require('../../utils/errores');
const { siVino, limpiarTexto } = require('../../utils/entrada');
const { registrarAuditoria } = require('../../utils/auditoria');
const { calcularLiquidacion } = require('../../utils/calculoHonorarios');

// Tope de Decimal(15,2): 13 dígitos enteros. Evita que Postgres reviente con un 500.
const MONTO_MAXIMO = 9999999999999;

// ------------------------------------------------------------
// HELPER: verificarPadre
// Confirma que el expediente / trámite exista (404 si no).
// Con exigirActivo (por defecto) un expediente inactivo no recibe
// cargas nuevas (igual que actuaciones y plazos).
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
    throw new ErrorNegocio('No se pueden registrar honorarios sobre un expediente inactivo.', 409);
  }
};

// ------------------------------------------------------------
// HELPER: calcularConTope
// Llama al cálculo puro y además controla el tope de la columna.
// ------------------------------------------------------------
const calcularConTope = (datos) => {
  const resultado = calcularLiquidacion(datos);
  if (resultado.montoTotal > MONTO_MAXIMO) {
    throw new ErrorNegocio('El monto total supera el máximo permitido');
  }
  return resultado;
};

// ------------------------------------------------------------
// HELPER: soloEntradasDelMetodo
// Guarda solo los datos de entrada que aplican al método elegido;
// el resto queda en null (así la tabla no mezcla datos de métodos).
// ------------------------------------------------------------
const soloEntradasDelMetodo = ({ metodo, montoBase, porcentaje, cantidadJornales, valorJornal }) => ({
  montoBase: metodo === 'PORCENTAJE' ? montoBase : null,
  porcentaje: metodo === 'PORCENTAJE' ? porcentaje : null,
  cantidadJornales: metodo === 'JORNALES' ? cantidadJornales : null,
  valorJornal: metodo === 'JORNALES' ? valorJornal : null,
});

// ------------------------------------------------------------
// HELPER: describir — texto legible para la auditoría
// ------------------------------------------------------------
const describir = (liq) => {
  const origen = liq.tramiteId ? `trámite #${liq.tramiteId}` : `expediente #${liq.expedienteId}`;
  const total = Number(liq.montoTotal).toLocaleString('es-PY');
  return `Honorarios ${liq.metodo} Gs. ${total} (${liq.concepto || 'sin concepto'}) en ${origen}`;
};

// ------------------------------------------------------------
// CALCULAR (solo muestra el resultado, NO guarda nada) — RF7:
// "cálculo en pantalla antes de confirmar".
// ------------------------------------------------------------
const calcular = (datos) => calcularConTope(datos);

// ------------------------------------------------------------
// LISTAR las liquidaciones de un expediente o trámite (más nuevas primero)
// ------------------------------------------------------------
const listarLiquidaciones = async (padre) => {
  // Para LISTAR no importa si el expediente está inactivo: solo que exista.
  await verificarPadre(padre, { exigirActivo: false });
  return prisma.liquidacionHonorarios.findMany({
    where: padre,
    orderBy: [{ creadoEn: 'desc' }, { id: 'desc' }],
  });
};

const obtenerLiquidacion = (id) => prisma.liquidacionHonorarios.findUniqueOrThrow({ where: { id } });

// ------------------------------------------------------------
// CREAR: recalcula en el servidor (nunca se confía en un total que
// venga del frontend) y guarda entrada + resultado (snapshot).
// ------------------------------------------------------------
const crearLiquidacion = async (padre, datos, usuarioId) => {
  await verificarPadre(padre);
  const resultado = calcularConTope(datos);

  return prisma.$transaction(async (tx) => {
    const liquidacion = await tx.liquidacionHonorarios.create({
      data: {
        ...padre, // completa SOLO una de las dos claves foráneas
        metodo: datos.metodo,
        concepto: limpiarTexto(datos.concepto),
        ...soloEntradasDelMetodo(datos),
        tasaIva: datos.tasaIva,
        ...resultado,
        observaciones: limpiarTexto(datos.observaciones),
      },
    });

    await registrarAuditoria(tx, {
      usuarioId,
      accion: 'CREAR',
      entidad: 'LiquidacionHonorarios',
      entidadId: liquidacion.id,
      detalle: describir(liquidacion),
    });
    return liquidacion;
  });
};

// ------------------------------------------------------------
// ACTUALIZAR (PUT parcial)
// - El método NO se puede cambiar (define la naturaleza de la
//   liquidación, igual que Cliente.tipo): si se eligió mal, se elimina
//   y se carga de nuevo.
// - Solo si está PENDIENTE: una liquidación con cobros ya es un hecho
//   contable (el Módulo 4 la pasa a COBRADO_PARCIALMENTE / COBRADO).
// - Se mezclan los datos guardados con los nuevos y se RECALCULA.
// ------------------------------------------------------------
const actualizarLiquidacion = async (id, datos, usuarioId) => {
  const actual = await prisma.liquidacionHonorarios.findUniqueOrThrow({ where: { id } });

  if (actual.estado !== 'PENDIENTE') {
    throw new ErrorNegocio('Solo se puede editar una liquidación sin cobros (estado PENDIENTE).', 409);
  }
  if (siVino(datos, 'metodo') && datos.metodo !== actual.metodo) {
    throw new ErrorNegocio('El método de cálculo no se puede cambiar. Eliminá la liquidación y cargala de nuevo.', 409);
  }

  // Datos de entrada: lo nuevo si vino, si no lo que ya estaba guardado
  const entrada = {
    metodo: actual.metodo,
    montoBase: siVino(datos, 'montoBase') ? datos.montoBase : actual.montoBase,
    porcentaje: siVino(datos, 'porcentaje') ? datos.porcentaje : actual.porcentaje,
    cantidadJornales: siVino(datos, 'cantidadJornales') ? datos.cantidadJornales : actual.cantidadJornales,
    valorJornal: siVino(datos, 'valorJornal') ? datos.valorJornal : actual.valorJornal,
    // En MONTO_FIJO el neto ingresado es el montoNeto guardado
    montoFijo: siVino(datos, 'montoFijo') ? datos.montoFijo : actual.montoNeto,
    tasaIva: siVino(datos, 'tasaIva') ? datos.tasaIva : actual.tasaIva,
  };
  const resultado = calcularConTope(entrada);

  const concepto = siVino(datos, 'concepto') ? limpiarTexto(datos.concepto) : actual.concepto;
  if (actual.metodo === 'MONTO_FIJO' && !concepto) {
    throw new ErrorNegocio('El concepto es obligatorio en monto fijo');
  }

  return prisma.$transaction(async (tx) => {
    const liquidacion = await tx.liquidacionHonorarios.update({
      where: { id },
      data: {
        concepto,
        ...soloEntradasDelMetodo(entrada),
        tasaIva: entrada.tasaIva,
        ...resultado,
        observaciones: siVino(datos, 'observaciones') ? limpiarTexto(datos.observaciones) : actual.observaciones,
      },
    });

    await registrarAuditoria(tx, {
      usuarioId,
      accion: 'EDITAR',
      entidad: 'LiquidacionHonorarios',
      entidadId: id,
      detalle: describir(liquidacion),
    });
    return liquidacion;
  });
};

// ------------------------------------------------------------
// ELIMINAR (definitivo, solo si está PENDIENTE).
// Se lee ANTES de borrar para poder auditar qué se borró.
// ------------------------------------------------------------
const eliminarLiquidacion = async (id, usuarioId) => {
  const liquidacion = await prisma.liquidacionHonorarios.findUniqueOrThrow({ where: { id } });

  if (liquidacion.estado !== 'PENDIENTE') {
    throw new ErrorNegocio('Solo se puede eliminar una liquidación sin cobros (estado PENDIENTE).', 409);
  }

  return prisma.$transaction(async (tx) => {
    await tx.liquidacionHonorarios.delete({ where: { id } });
    await registrarAuditoria(tx, {
      usuarioId,
      accion: 'ELIMINAR',
      entidad: 'LiquidacionHonorarios',
      entidadId: id,
      detalle: describir(liquidacion),
    });
  });
};

module.exports = {
  calcular,
  listarLiquidaciones,
  obtenerLiquidacion,
  crearLiquidacion,
  actualizarLiquidacion,
  eliminarLiquidacion,
};