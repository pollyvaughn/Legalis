// ============================================================
// FORMATO HONORARIOS
// Helpers compartidos por los reportes PDF del Módulo 3 (estado de
// cuenta, panel por cliente y proforma): moneda, etiquetas de enums y
// texto de cómo se calculó un honorario. Funciones puras: no tocan la
// base de datos.
//
// Las etiquetas son espejo de frontend/src/constants/honorarios.js
// (si cambian allá, actualizar acá).
// ============================================================

const { fechaCortaDesdeTexto } = require('./formatoReportes');

// ------------------------------------------------------------
// ETIQUETAS de los enums (MetodoHonorarios, TasaIva, estados)
// ------------------------------------------------------------
const ETIQUETA_METODO = {
  PORCENTAJE: 'Porcentaje',
  JORNALES: 'Jornales',
  MONTO_FIJO: 'Monto fijo',
};

const ETIQUETA_TASA_IVA = {
  IVA_10: 'IVA 10%',
  IVA_5: 'IVA 5%',
  EXENTA: 'Exenta de IVA',
};

const ETIQUETA_ESTADO_COBRO = {
  PENDIENTE: 'Pendiente',
  COBRADO_PARCIALMENTE: 'Cobrado parcialmente',
  COBRADO: 'Cobrado',
  ANULADO: 'Anulado',
};

// ------------------------------------------------------------
// MONEDA: 1500000 / "1500000.00" (Decimal de Prisma) -> "Gs. 1.500.000"
// Sin valor devuelve "—".
// ------------------------------------------------------------
function formatearGs(valor) {
  if (valor === null || valor === undefined || valor === '') return '—';
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '—';
  return `Gs. ${Math.round(numero).toLocaleString('es-PY')}`;
}

// ------------------------------------------------------------
// Cómo se calculó una liquidación (texto corto para el PDF)
//   PORCENTAJE -> "Gs. 10.000.000 × 10%"
//   JORNALES   -> "2,5 jornales × Gs. 150.000"
//   MONTO_FIJO -> "Monto fijo acordado"
// ------------------------------------------------------------
function describirCalculo(liq) {
  if (liq.metodo === 'PORCENTAJE') {
    return `${formatearGs(liq.montoBase)} × ${Number(liq.porcentaje).toLocaleString('es-PY')}%`;
  }
  if (liq.metodo === 'JORNALES') {
    return `${Number(liq.cantidadJornales).toLocaleString('es-PY')} jornales × ${formatearGs(liq.valorJornal)}`;
  }
  return 'Monto fijo acordado';
}

// ------------------------------------------------------------
// Neto e IVA de una liquidación, en una línea
// ------------------------------------------------------------
function describirIva(liq) {
  if (liq.tasaIva === 'EXENTA') return 'Exenta de IVA';
  return `Neto ${formatearGs(liq.montoNeto)} + IVA ${formatearGs(liq.montoIva)}`;
}

// ------------------------------------------------------------
// Día calendario en hora de Paraguay: Date -> "AAAA-MM-DD".
// Sirve para fechas con hora (creadoEn): sin esto, algo cargado a las
// 22:00 caería en el día siguiente (el servidor guarda en UTC).
// ------------------------------------------------------------
function diaLocal(fecha) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Asuncion' }).format(new Date(fecha));
}

// "DD/MM/AAAA" de una fecha con hora, en hora de Paraguay
function fechaLocalCorta(fecha) {
  return fechaCortaDesdeTexto(diaLocal(fecha));
}

module.exports = {
  ETIQUETA_METODO,
  ETIQUETA_TASA_IVA,
  ETIQUETA_ESTADO_COBRO,
  formatearGs,
  describirCalculo,
  describirIva,
  diaLocal,
  fechaLocalCorta,
};