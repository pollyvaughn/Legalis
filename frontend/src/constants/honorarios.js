// ============================================================
// CONSTANTES DE HONORARIOS Y GASTOS (Módulo 3)
// Etiquetas y colores de Badge para métodos de cálculo, tasas de IVA
// y estados. Espejo de MetodoHonorarios, TasaIva, EstadoLiquidacion
// y EstadoGasto en schema.prisma (los valores deben coincidir).
// ============================================================

// ------------------------------------------------------------
// MÉTODOS DE CÁLCULO (RF7)
// ------------------------------------------------------------
export const OPCIONES_METODO = [
    { value: 'PORCENTAJE', label: 'Porcentaje del monto del juicio' },
    { value: 'JORNALES', label: 'Jornales' },
    { value: 'MONTO_FIJO', label: 'Monto fijo' },
  ];
  
  // Etiqueta corta (para la lista): PORCENTAJE -> "Porcentaje"
  const ETIQUETA_METODO_CORTA = {
    PORCENTAJE: 'Porcentaje',
    JORNALES: 'Jornales',
    MONTO_FIJO: 'Monto fijo',
  };
  export const etiquetaMetodo = (valor) => ETIQUETA_METODO_CORTA[valor] || '—';
  
  // ------------------------------------------------------------
  // TASAS DE IVA (se SUMA encima del honorario neto)
  // ------------------------------------------------------------
  export const OPCIONES_TASA_IVA = [
    { value: 'IVA_10', label: 'IVA 10%' },
    { value: 'IVA_5', label: 'IVA 5%' },
    { value: 'EXENTA', label: 'Exenta de IVA' },
  ];
  
  export const etiquetaTasaIva = (valor) =>
    OPCIONES_TASA_IVA.find((op) => op.value === valor)?.label || '—';
  
  // ------------------------------------------------------------
  // ESTADOS DE COBRO (liquidaciones y gastos)
  // ANULADO solo existe en gastos. Los pasa a COBRADO_* el Módulo 4.
  // ------------------------------------------------------------
  const ETIQUETA_ESTADO_COBRO = {
    PENDIENTE: 'Pendiente',
    COBRADO_PARCIALMENTE: 'Cobrado parcialmente',
    COBRADO: 'Cobrado',
    ANULADO: 'Anulado',
  };
  export const etiquetaEstadoCobro = (valor) => ETIQUETA_ESTADO_COBRO[valor] || '—';
  
  // Color del Badge según estado (tonos que soporta Badge.jsx)
  export const TONO_ESTADO_COBRO = {
    PENDIENTE: 'yellow',
    COBRADO_PARCIALMENTE: 'blue',
    COBRADO: 'green',
    ANULADO: 'gray',
  };