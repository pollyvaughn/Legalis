// ============================================================
// FECHAS.JS — helpers de formato de fecha para mostrar en pantalla
// ============================================================

// Convierte un ISO ("2026-09-10T14:30:00.000Z") a texto corto: "10 sep 2026".
// Devuelve "—" si no hay fecha.
export function formatearFecha(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-PY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }