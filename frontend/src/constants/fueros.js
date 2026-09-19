// ============================================================
// fueros.js
// Lista de fueros judiciales, según el enum "Fuero" del schema
// de Prisma (backend/prisma/schema.prisma). Si el enum cambia
// ahí, hay que actualizar esta lista para que coincidan.
//
// USO en un <SelectInput>:
//   <SelectInput label="Fuero" opciones={OPCIONES_FUERO} ... />
//
// USO para traducir un valor guardado a su etiqueta legible:
//   etiquetaFuero(expediente.fuero) → "Civil y Comercial"
// ============================================================

export const OPCIONES_FUERO = [
    { value: 'CIVIL_COMERCIAL', label: 'Civil y Comercial' },
    { value: 'LABORAL', label: 'Laboral' },
    { value: 'PENAL', label: 'Penal' },
    { value: 'NINEZ_ADOLESCENCIA', label: 'Niñez y Adolescencia' },
    { value: 'CONTENCIOSO_ADMINISTRATIVO', label: 'Contencioso Administrativo' },
    { value: 'OTRO', label: 'Otro' },
  ];
  
  // Traduce el valor crudo del enum (ej: "CIVIL_COMERCIAL") a su
  // etiqueta legible (ej: "Civil y Comercial"). Si el valor no
  // coincide con ninguna opción conocida (o es null/undefined),
  // devuelve el valor tal cual, o un guión si está vacío.
  export function etiquetaFuero(valor) {
    if (!valor) return '—';
    const opcion = OPCIONES_FUERO.find((o) => o.value === valor);
    return opcion ? opcion.label : valor;
  }