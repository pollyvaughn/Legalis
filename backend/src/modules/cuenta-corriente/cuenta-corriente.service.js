// ============================================================
// CUENTA CORRIENTE SERVICE — Módulo 3 (RF8)
// Solo LEE y suma: no crea ni modifica nada (por eso no audita).
// Dos vistas, por separado (decisión 13/10/2026):
//  1) por EXPEDIENTE o por TRÁMITE  -> resumen de ese caso
//  2) por CLIENTE (consolidada)     -> suma de todos sus expedientes y
//     trámites, con el detalle de cuánto aporta cada uno
//
// Qué suma: honorarios (neto + IVA) + gastos NO anulados − cobrado.
// El "cobrado" es 0 hasta el Módulo 4 (ver obtenerCobrado).
// ============================================================
const prisma = require('../../config/database');
const { ErrorNegocio } = require('../../utils/errores');
const { calcularSaldo } = require('../../utils/cuentaCorriente');

// Los Decimal de Prisma llegan como objeto: Number() los convierte.
// Un _sum sin filas es null -> 0.
const aNumero = (valor) => Number(valor ?? 0);

// Los gastos ANULADOS no cuentan en el saldo
const SIN_ANULADOS = { estado: { not: 'ANULADO' } };

// ------------------------------------------------------------
// GANCHO PARA EL MÓDULO 4 (cobros y recibos)
// Hoy no existen cobros, así que lo cobrado es 0. Cuando exista el
// Módulo 4, esta función debe sumar los cobros aplicados a las
// liquidaciones y gastos que cumplan el filtro "where".
// ------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
const obtenerCobrado = async (where) => 0;

// ------------------------------------------------------------
// HELPER: resumenDe
// Suma honorarios y gastos de TODO lo que cumpla el filtro "where"
// (un expediente, un trámite, o todos los de un cliente).
// ------------------------------------------------------------
const resumenDe = async (where) => {
  const [liquidaciones, gastos, gastosAnulados, cobrado] = await Promise.all([
    prisma.liquidacionHonorarios.aggregate({
      where,
      _sum: { montoNeto: true, montoIva: true, montoTotal: true },
      _count: { _all: true },
    }),
    prisma.gastoReembolsable.aggregate({
      where: { ...where, ...SIN_ANULADOS },
      _sum: { monto: true },
      _count: { _all: true },
    }),
    prisma.gastoReembolsable.count({ where: { ...where, estado: 'ANULADO' } }),
    obtenerCobrado(where),
  ]);

  const honorariosTotal = aNumero(liquidaciones._sum.montoTotal);
  const gastosTotal = aNumero(gastos._sum.monto);

  return {
    honorarios: {
      cantidad: liquidaciones._count._all,
      neto: aNumero(liquidaciones._sum.montoNeto),
      iva: aNumero(liquidaciones._sum.montoIva),
      total: honorariosTotal,
    },
    gastos: {
      cantidad: gastos._count._all, // sin contar anulados
      anulados: gastosAnulados, // aparte, solo informativo
      total: gastosTotal,
    },
    ...calcularSaldo({ honorariosTotal, gastosTotal, cobrado }),
  };
};

// ------------------------------------------------------------
// VISTA 1a: cuenta corriente de un EXPEDIENTE
// ------------------------------------------------------------
const resumenDeExpediente = async (expedienteId) => {
  const expediente = await prisma.expediente.findUnique({
    where: { id: expedienteId },
    select: { id: true },
  });
  if (!expediente) throw new ErrorNegocio('Expediente no encontrado', 404);
  return resumenDe({ expedienteId });
};

// ------------------------------------------------------------
// VISTA 1b: cuenta corriente de un TRÁMITE
// ------------------------------------------------------------
const resumenDeTramite = async (tramiteId) => {
  const tramite = await prisma.tramite.findUnique({ where: { id: tramiteId }, select: { id: true } });
  if (!tramite) throw new ErrorNegocio('Trámite no encontrado', 404);
  return resumenDe({ tramiteId });
};

// ------------------------------------------------------------
// VISTA 2: cuenta corriente consolidada de un CLIENTE
// = resumen de todo lo que cuelga de sus expedientes y trámites,
// más "detalle": una fila por expediente/trámite que tenga movimientos.
// ------------------------------------------------------------
const resumenDeCliente = async (clienteId) => {
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { id: true, nombreRazonSocial: true },
  });
  if (!cliente) throw new ErrorNegocio('Cliente no encontrado', 404);

  // Filtro: lo que pertenece a un expediente O a un trámite de este cliente
  const where = { OR: [{ expediente: { clienteId } }, { tramite: { clienteId } }] };

  // Totales por expediente/trámite (una fila por cada uno que tenga movimientos)
  const [resumen, liqPorPadre, gasPorPadre] = await Promise.all([
    resumenDe(where),
    prisma.liquidacionHonorarios.groupBy({
      by: ['expedienteId', 'tramiteId'],
      where,
      _sum: { montoTotal: true },
    }),
    prisma.gastoReembolsable.groupBy({
      by: ['expedienteId', 'tramiteId'],
      where: { ...where, ...SIN_ANULADOS },
      _sum: { monto: true },
    }),
  ]);

  // Une honorarios y gastos de cada expediente/trámite en una sola fila
  const filas = new Map(); // clave: "E5" (expediente 5) o "T3" (trámite 3)
  const fila = (expedienteId, tramiteId) => {
    const tipo = expedienteId ? 'EXPEDIENTE' : 'TRAMITE';
    const id = expedienteId || tramiteId;
    const clave = `${tipo[0]}${id}`;
    if (!filas.has(clave)) filas.set(clave, { tipo, id, honorariosTotal: 0, gastosTotal: 0 });
    return filas.get(clave);
  };
  liqPorPadre.forEach((g) => {
    fila(g.expedienteId, g.tramiteId).honorariosTotal = aNumero(g._sum.montoTotal);
  });
  gasPorPadre.forEach((g) => {
    fila(g.expedienteId, g.tramiteId).gastosTotal = aNumero(g._sum.monto);
  });

  // Títulos legibles (número/año/carátula del expediente, tipo y período del trámite)
  const idsExpediente = [...filas.values()].filter((f) => f.tipo === 'EXPEDIENTE').map((f) => f.id);
  const idsTramite = [...filas.values()].filter((f) => f.tipo === 'TRAMITE').map((f) => f.id);
  const [expedientes, tramites] = await Promise.all([
    prisma.expediente.findMany({
      where: { id: { in: idsExpediente } },
      select: { id: true, numeroExpediente: true, anio: true, caratula: true },
    }),
    prisma.tramite.findMany({
      where: { id: { in: idsTramite } },
      select: { id: true, periodo: true, tipoTramite: { select: { nombre: true } } },
    }),
  ]);
  const tituloExpediente = new Map(
    expedientes.map((e) => [e.id, `${e.numeroExpediente}/${e.anio} — ${e.caratula}`])
  );
  const tituloTramite = new Map(
    tramites.map((t) => [t.id, `${t.tipoTramite.nombre}${t.periodo ? ` (${t.periodo})` : ''}`])
  );

  const detalle = [...filas.values()]
    .map((f) => ({
      tipo: f.tipo,
      id: f.id,
      titulo: (f.tipo === 'EXPEDIENTE' ? tituloExpediente : tituloTramite).get(f.id) || `#${f.id}`,
      honorariosTotal: f.honorariosTotal,
      gastosTotal: f.gastosTotal,
      ...calcularSaldo({ honorariosTotal: f.honorariosTotal, gastosTotal: f.gastosTotal }),
    }))
    // Lo que más se debe, primero
    .sort((a, b) => b.saldo - a.saldo || a.titulo.localeCompare(b.titulo));

  return { cliente, ...resumen, detalle };
};

module.exports = { resumenDeExpediente, resumenDeTramite, resumenDeCliente };