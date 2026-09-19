// ============================================================
// estadosProcesales.js
// Lista de estados procesales, según el enum "EstadoProcesal"
// del schema de Prisma (backend/prisma/schema.prisma).
// Si el enum cambia ahí, hay que actualizar esta lista.
//
// USO en un <SelectInput>:
//   <SelectInput label="Estado procesal" opciones={OPCIONES_ESTADO_PROCESAL} ... />
//
// USO para traducir un valor guardado a su etiqueta legible:
//   etiquetaEstadoProcesal(expediente.estadoProcesal) → "En trámite"
// ============================================================

export const OPCIONES_ESTADO_PROCESAL = [
    { value: 'EN_TRAMITE', label: 'En trámite' },
    { value: 'EN_APELACION', label: 'En apelación' },
    { value: 'SUSPENDIDO', label: 'Suspendido' },
    { value: 'ARCHIVADO', label: 'Archivado' },
    { value: 'CONCLUIDO', label: 'Concluido' },
  ];
  
  // Traduce el valor crudo del enum (ej: "EN_TRAMITE") a su etiqueta
  // legible (ej: "En trámite"). Si el valor no coincide con ninguna
  // opción conocida (o es null/undefined), devuelve el valor tal cual,
  // o un guión si está vacío.
  export function etiquetaEstadoProcesal(valor) {
    if (!valor) return '—';
    const opcion = OPCIONES_ESTADO_PROCESAL.find((o) => o.value === valor);
    return opcion ? opcion.label : valor;
  }