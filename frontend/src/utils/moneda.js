// ============================================================
// MONEDA.JS — helpers para mostrar guaraníes en pantalla
// Los montos llegan del backend como string (Prisma Decimal):
// "1500000.00". Acá se convierten con Number() para mostrarlos.
// ============================================================

// "1500000.00" -> "Gs. 1.500.000" ("—" si no hay valor)
export function formatearGs(valor) {
    if (valor === null || valor === undefined || valor === '') return '—';
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return '—';
    return `Gs. ${Math.round(numero).toLocaleString('es-PY')}`;
  }