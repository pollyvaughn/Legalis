// ============================================================
// LIQUIDACIONES.PROFORMA.SERVICE.JS — Módulo 3 (RF7)
// Junta los datos de UNA liquidación para su PDF de proforma: cliente,
// expediente o trámite al que pertenece, cómo se calculó y los
// importes (neto + IVA discriminado = total). No genera el PDF ni
// conoce Express: devuelve el objeto que espera generarProformaPdf.
//
// Se puede emitir la proforma de una liquidación en cualquier estado,
// y de expedientes inactivos (es solo lectura).
// ============================================================

const prisma = require('../../config/database');
const {
  ETIQUETA_METODO,
  ETIQUETA_TASA_IVA,
  formatearGs,
  describirCalculo,
  fechaLocalCorta,
} = require('../../utils/formatoHonorarios');

// Datos del cliente que se piden en las dos ramas (expediente / trámite)
const SELECT_CLIENTE = { select: { nombreRazonSocial: true, ruc: true } };

// "2026-10" -> "10/2026"
const periodoLegible = (periodo) => {
  const [anio, mes] = periodo.split('-');
  return `${mes}/${anio}`;
};

// ------------------------------------------------------------
// ARMAR PROFORMA de una liquidación.
// findUniqueOrThrow: si no existe, Prisma lanza P2025 y el controller
// lo responde como 404 (responderError).
// ------------------------------------------------------------
async function armarProforma(id) {
  const liq = await prisma.liquidacionHonorarios.findUniqueOrThrow({
    where: { id },
    include: {
      expediente: {
        select: { numeroExpediente: true, anio: true, caratula: true, juzgado: true, cliente: SELECT_CLIENTE },
      },
      tramite: {
        select: {
          periodo: true,
          descripcion: true,
          tipoTramite: { select: { nombre: true } },
          cliente: SELECT_CLIENTE,
        },
      },
    },
  });

  // La liquidación es de un expediente O de un trámite (RN-26)
  let cliente;
  let referencia;
  if (liq.expediente) {
    const e = liq.expediente;
    cliente = e.cliente;
    referencia = [
      ['Expediente', `${e.numeroExpediente}/${e.anio}`],
      ['Carátula', e.caratula],
      ['Juzgado', e.juzgado],
    ];
  } else {
    const t = liq.tramite;
    cliente = t.cliente;
    referencia = [['Trámite', t.tipoTramite.nombre]];
    if (t.periodo) referencia.push(['Período', periodoLegible(t.periodo)]);
    if (t.descripcion) referencia.push(['Descripción', t.descripcion]);
  }

  return {
    numero: liq.id,
    fechaEmision: fechaLocalCorta(new Date()), // fecha de hoy, en hora de Paraguay
    cliente: { nombre: cliente.nombreRazonSocial, ruc: cliente.ruc },
    referencia,
    concepto: liq.concepto || ETIQUETA_METODO[liq.metodo],
    calculo: `${ETIQUETA_METODO[liq.metodo]}: ${describirCalculo(liq)}`,
    ivaEtiqueta: ETIQUETA_TASA_IVA[liq.tasaIva],
    neto: formatearGs(liq.montoNeto),
    iva: formatearGs(liq.montoIva),
    total: formatearGs(liq.montoTotal),
    observaciones: liq.observaciones,
    nombreArchivo: `proforma-${liq.id}.pdf`,
  };
}

module.exports = { armarProforma };