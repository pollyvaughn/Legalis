// ============================================================
// CONSTANTES DE PLANTILLAS (Módulo 1.4)
// Listas y etiquetas de los enums de PlantillaEscrito.
// Espejo de schema.prisma: si se cambia un enum allá, se cambia acá.
// ============================================================

import { etiquetaFuero } from './fueros';

// --- CLASE del escrito -------------------------------------
export const OPCIONES_CLASE = [
    { value: 'DE_FONDO', label: 'De fondo' },
    { value: 'DE_MERO_TRAMITE', label: 'De mero trámite' },
  ];
  
  // --- CATEGORÍA (tipo específico) ---------------------------
  export const OPCIONES_CATEGORIA = [
    { value: 'DEMANDA', label: 'Demanda' },
    { value: 'CONTESTACION', label: 'Contestación' },
    { value: 'EXCEPCION', label: 'Excepción' },
    { value: 'RECURSO', label: 'Recurso' },
    { value: 'IMPULSO_PROCESAL', label: 'Impulso procesal' },
    { value: 'SOLICITUD_OFICIO', label: 'Solicitud de oficio' },
    { value: 'DENUNCIA', label: 'Denuncia' },
    { value: 'MEDIACION', label: 'Mediación' },
    { value: 'MEDIDA_CAUTELAR', label: 'Medida cautelar' },
    { value: 'OTRO', label: 'Otro' },
  ];
  
  // --- ORIGEN del texto (trazabilidad) -----------------------
  export const OPCIONES_ORIGEN = [
    { value: 'PROPIA', label: 'Propia' },
    { value: 'IA', label: 'Generada con IA' },
    { value: 'OTRO', label: 'Otro' },
  ];
  
  // --- Traductores: valor del enum -> texto en español -------
  // Si el valor no existe devuelve "—" (para no mostrar "undefined")
  const buscarEtiqueta = (lista, valor) =>
    lista.find((op) => op.value === valor)?.label || '—';
  
  export const etiquetaClase = (valor) => buscarEtiqueta(OPCIONES_CLASE, valor);
  export const etiquetaCategoria = (valor) => buscarEtiqueta(OPCIONES_CATEGORIA, valor);
  export const etiquetaOrigen = (valor) => buscarEtiqueta(OPCIONES_ORIGEN, valor);
  
  // --- Color del Badge según categoría -----------------------
  // Tonos verificados contra Badge.jsx
  export const TONO_CATEGORIA = {
    DEMANDA: 'blue',
    CONTESTACION: 'blue',
    EXCEPCION: 'yellow',
    RECURSO: 'yellow',
    IMPULSO_PROCESAL: 'gray',
    SOLICITUD_OFICIO: 'gray',
    DENUNCIA: 'red',
    MEDIACION: 'green',
    MEDIDA_CAUTELAR: 'red',
    OTRO: 'gray',
  };

  // --- Fuero para mostrar: null significa "sirve para cualquier fuero" ---
export const textoFuero = (fuero) => (fuero ? etiquetaFuero(fuero) : 'Todos los fueros');