// ============================================================
// TEXTOS.JS — helpers de texto para mensajes en pantalla
// ============================================================

// plural(1, 'vencimiento') -> "1 vencimiento" | plural(3, 'vencimiento') -> "3 vencimientos"
export function plural(cantidad, singular) {
    return `${cantidad} ${singular}${cantidad === 1 ? '' : 's'}`;
  }