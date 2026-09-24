// ============================================================
// constants/tiposActuacion.js
// Lista de valores del enum TipoActuacion (backend), con su
// etiqueta legible. Mismo patrón que fueros.js/estadosProcesales.js
// — si el enum cambia en el schema de Prisma, hay que actualizar
// esta lista a mano.
// ============================================================

export const OPCIONES_TIPO_ACTUACION = [
    { value: 'PROVIDENCIA', label: 'Providencia' },
    { value: 'RESOLUCION', label: 'Resolución' },
    { value: 'SENTENCIA', label: 'Sentencia' },
    { value: 'ESCRITO_PRESENTADO', label: 'Escrito presentado' },
    { value: 'AUDIENCIA', label: 'Audiencia' },
    { value: 'NOTIFICACION', label: 'Notificación' },
    { value: 'OFICIO', label: 'Oficio' },
    { value: 'OTRO', label: 'Otro' },
  ];
  
  // Traduce el value del enum a su etiqueta legible. Si no encuentra
  // el valor (por ejemplo, dato viejo o enum desactualizado), devuelve
  // el value tal cual en vez de romper la pantalla.
  export function etiquetaTipoActuacion(value) {
    const opcion = OPCIONES_TIPO_ACTUACION.find((o) => o.value === value);
    return opcion ? opcion.label : value;
  }