// ============================================================
// CONSTANTES DE TRÁMITES (Módulo 1.3)
// Estados de un vencimiento/trámite y su presentación.
// Espejo de EstadoTramite en schema.prisma.
// ============================================================

export const OPCIONES_ESTADO_TRAMITE = [
    { value: 'PENDIENTE', label: 'Pendiente' },
    { value: 'EN_PROCESO', label: 'En proceso' },
    { value: 'PRESENTADO', label: 'Presentado' },
    { value: 'FINALIZADO', label: 'Finalizado' },
  ];
  
  // Color del Badge según estado (tonos que soporta Badge.jsx)
  export const TONO_ESTADO_TRAMITE = {
    PENDIENTE: 'yellow',
    EN_PROCESO: 'blue',
    PRESENTADO: 'green',
    FINALIZADO: 'gray',
  };
  
  // valor del enum -> texto en español ("—" si no existe)
  export const etiquetaEstadoTramite = (valor) =>
    OPCIONES_ESTADO_TRAMITE.find((op) => op.value === valor)?.label || '—';

// ============================================================
// OBLIGACIONES PERIÓDICAS
// ============================================================

// Periodicidades soportadas (espejo de PeriodicidadTramite en schema.prisma)
export const OPCIONES_PERIODICIDAD = [
  { value: 'MENSUAL', label: 'Mensual' },
  { value: 'ANUAL', label: 'Anual' },
];

// Meses para el select (value como texto, porque los <option> manejan texto)
export const MESES = [
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

// "Mensual" o "Anual (Abril)" a partir de una obligación
export const etiquetaPeriodicidad = (obligacion) =>
  obligacion.periodicidad === 'MENSUAL'
    ? 'Mensual'
    : `Anual (${MESES[obligacion.mesAnual - 1]?.label || '—'})`;