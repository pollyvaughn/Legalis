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