// ============================================================
// ENTRADA.JS — Helpers para leer y limpiar datos que llegan del frontend
// ============================================================

// true si el campo llegó en el body (aunque sea null).
// Sirve para que un PUT parcial no pise campos que no se enviaron.
const siVino = (obj, campo) => Object.prototype.hasOwnProperty.call(obj, campo);

// trim() a strings; texto vacío ("") pasa a null.
const limpiarTexto = (valor) => {
  if (typeof valor !== 'string') return valor;
  const limpio = valor.trim();
  return limpio === '' ? null : limpio;
};

// Convierte a número; si viene vacío o no es número devuelve NaN.
// (los ids llegan como texto cuando salen de un <select>)
const entero = (valor) => (valor === '' || valor === null || valor === undefined ? NaN : Number(valor));

// ------------------------------------------------------------
// parsearFecha("2026-10-19") -> Date en UTC a medianoche
// Devuelve null si el texto no es una fecha válida AAAA-MM-DD.
// Es el formato que manda <input type="date"> del navegador.
// ------------------------------------------------------------
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

const parsearFecha = (texto) => {
  if (typeof texto !== 'string' || !FECHA_ISO.test(texto)) return null;
  const fecha = new Date(`${texto}T00:00:00.000Z`);
  if (isNaN(fecha.getTime())) return null;
  // Ida y vuelta: si JS "corrigió" la fecha (ej: 2026-02-31 -> 2026-03-03)
  // el texto no coincide y se rechaza.
  return fecha.toISOString().slice(0, 10) === texto ? fecha : null;
};

module.exports = { siVino, limpiarTexto, entero, parsearFecha };