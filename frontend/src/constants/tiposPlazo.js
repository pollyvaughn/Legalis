// ============================================================
// constants/tiposPlazo.js
// Opciones de los enums FueroAplicable y ModalidadPlazo (backend),
// usados en el catálogo de TipoPlazo. Mismo patrón que fueros.js.
// ============================================================

// FueroAplicable: igual que el enum Fuero de Expediente, pero con
// un valor extra TODOS (el tipo de plazo se sugiere sin importar
// el fuero del expediente) — ver nota en el schema de Prisma.
export const OPCIONES_FUERO_APLICABLE = [
    { value: 'TODOS', label: 'Todos los fueros' },
    { value: 'CIVIL_COMERCIAL', label: 'Civil y comercial' },
    { value: 'LABORAL', label: 'Laboral' },
    { value: 'PENAL', label: 'Penal' },
    { value: 'NINEZ_ADOLESCENCIA', label: 'Niñez y adolescencia' },
    { value: 'CONTENCIOSO_ADMINISTRATIVO', label: 'Contencioso administrativo' },
    { value: 'OTRO', label: 'Otro' },
  ];
  
  export function etiquetaFueroAplicable(value) {
    const opcion = OPCIONES_FUERO_APLICABLE.find((o) => o.value === value);
    return opcion ? opcion.label : value;
  }
  
  export const OPCIONES_MODALIDAD_PLAZO = [
    { value: 'HABILES', label: 'Días hábiles' },
    { value: 'CORRIDOS', label: 'Días corridos' },
    { value: 'HORAS', label: 'Horas (carga manual)' },
  ];
  
  export function etiquetaModalidadPlazo(value) {
    const opcion = OPCIONES_MODALIDAD_PLAZO.find((o) => o.value === value);
    return opcion ? opcion.label : value;
  }