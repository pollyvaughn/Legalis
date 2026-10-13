// ============================================================
// FORMATO REPORTES
// Helpers compartidos por los reportes PDF (expedientes, vencimientos):
// formato de fechas y validación de las fechas que llegan por query.
// Funciones puras: no tocan la base de datos.
// ============================================================

const { ErrorNegocio } = require('./errores');

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

// ------------------------------------------------------------
// Date de una columna @db.Date (medianoche UTC) -> "DD/MM/AAAA".
// Se arma desde el ISO para que no se corra un día por la zona horaria.
// Sin fecha devuelve "—".
// ------------------------------------------------------------
function fechaCorta(fecha) {
  if (!fecha) return '—';
  const [anio, mes, dia] = new Date(fecha).toISOString().slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
}

// ------------------------------------------------------------
// "AAAA-MM-DD" (como llega del frontend) -> "DD/MM/AAAA"
// ------------------------------------------------------------
function fechaCortaDesdeTexto(texto) {
  const [anio, mes, dia] = texto.split('-');
  return `${dia}/${mes}/${anio}`;
}

// ------------------------------------------------------------
// Fecha y hora exactas, en hora de Paraguay y formato 24 h.
// Ej: "19/10/2026 15:30"
// ------------------------------------------------------------
function fechaHoraCorta(fecha) {
  return new Intl.DateTimeFormat('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Asuncion',
  })
    .format(new Date(fecha))
    .replace(', ', ' '); // "19/10/2026, 15:30" -> "19/10/2026 15:30"
}

// ------------------------------------------------------------
// Valida un "AAAA-MM-DD" opcional. Devuelve el texto (o null si no
// vino) o lanza 400 si no es una fecha real.
// Ojo: toISOString() lanza error con fechas imposibles (ej: mes 13),
// por eso primero se chequea que el Date sea válido.
// ------------------------------------------------------------
function validarFechaTexto(valor, nombre) {
  if (!valor) return null;
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  const esValida =
    FORMATO_FECHA.test(valor) && !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
  if (!esValida) {
    throw new ErrorNegocio(`La fecha "${nombre}" no es válida (formato AAAA-MM-DD).`, 400);
  }
  return valor;
}

module.exports = { fechaCorta, fechaCortaDesdeTexto, fechaHoraCorta, validarFechaTexto };