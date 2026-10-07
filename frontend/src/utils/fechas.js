// ============================================================
// FECHAS.JS — helpers de formato de fecha para mostrar en pantalla
// ============================================================

// Convierte un ISO ("2026-09-10T14:30:00.000Z") a texto corto: "10 sep 2026".
// Devuelve "—" si no hay fecha.
export function formatearFecha(iso) {
  if (!iso) return '—';

  return new Intl.DateTimeFormat('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));
}

  // ============================================================
// FECHAS SIN HORA (vencimientos, recepciones)
// El backend las manda a medianoche UTC. Si se formatean en la zona
// horaria local (Paraguay, UTC-3) se muestran un día antes; por eso
// todo esto trabaja en UTC.
// ============================================================

// "2026-10-19T00:00:00.000Z" -> "19 oct 2026"
export function formatearFechaSola(iso) {
  if (!iso) return '—';

  return new Intl.DateTimeFormat('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(iso));
}

export function formatearFechaHora(iso) {
  if (!iso) return '—';

  return new Intl.DateTimeFormat('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

// ISO -> "AAAA-MM-DD" (el formato que usa <input type="date">)
export function aInputFecha(iso) {
  return iso ? iso.slice(0, 10) : '';
}

// Hoy (según la fecha LOCAL del navegador) como "AAAA-MM-DD"
export function hoyInput() {
  const ahora = new Date();
  const dos = (n) => String(n).padStart(2, '0');
  return `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}`;
}

// Días que faltan desde hoy hasta la fecha. Negativo = ya pasó. 0 = hoy.
export function diasHasta(iso) {
  const hoy = new Date(`${hoyInput()}T00:00:00.000Z`);
  const fecha = new Date(`${aInputFecha(iso)}T00:00:00.000Z`);
  return Math.round((fecha - hoy) / 86400000); // 86.400.000 ms = 1 día
}