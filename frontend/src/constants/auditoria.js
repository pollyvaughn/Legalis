// ============================================================
// CONSTANTES DE AUDITORÍA
// Traduce el enum AccionAuditoria a etiquetas legibles en español,
// y les asigna un tono de Badge.
// ============================================================

export const ETIQUETA_ACCION = {
    CREAR: 'Creación',
    EDITAR: 'Edición',
    INACTIVAR: 'Inactivación',
    REACTIVAR: 'Reactivación',
    ELIMINAR: 'Eliminación',
    BAJA: 'Baja definitiva',
    COBRAR: 'Cobro',
    ANULAR: 'Anulación',
  };
  
  export const TONO_ACCION = {
    CREAR: 'green',
    EDITAR: 'yellow',
    INACTIVAR: 'orange',
    REACTIVAR: 'green',
    ELIMINAR: 'red',
    BAJA: 'red',
    COBRAR: 'green',
    ANULAR: 'red',
  };