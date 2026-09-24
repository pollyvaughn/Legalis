// ============================================================
// constants/semaforoPlazos.js
// Traduce el valor de 'semaforo' que devuelve el backend
// (calculado al vuelo, nunca guardado — ver calendarioPlazos.js)
// al tone de Badge y a la etiqueta que se muestra en pantalla.
// ============================================================

// Mapeo semáforo → tone de Badge.
// ROJO y VENCIDO usan colores distintos (naranja vs rojo) a
// propósito: ambos son urgentes, pero VENCIDO es más grave
// (ya pasó la fecha) y merece distinguirse de un vistazo.
export const TONO_SEMAFORO = {
    VERDE: 'green',
    AMARILLO: 'yellow',
    ROJO: 'orange',
    VENCIDO: 'red',
    CUMPLIDO: 'gray',
  };
  
  // Etiqueta legible para cada valor de semáforo.
  export const ETIQUETA_SEMAFORO = {
    VERDE: 'Al día',
    AMARILLO: 'Próximo',
    ROJO: 'Urgente',
    VENCIDO: 'Vencido',
    CUMPLIDO: 'Cumplido',
  };