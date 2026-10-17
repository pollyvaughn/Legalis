// ============================================================
// CONSTANTES DE COBROS (Módulo 4)
// Etiquetas, colores de Badge y helpers para recibos. Espejo de
// MetodoPago, TipoLineaCobro y EstadoCobro en schema.prisma
// (los valores deben coincidir con los del backend).
// ============================================================

// ------------------------------------------------------------
// MÉTODOS DE PAGO (pendiente de validar con la abogada)
// ------------------------------------------------------------
export const OPCIONES_METODO_PAGO = [
    { value: 'EFECTIVO', label: 'Efectivo' },
    { value: 'TRANSFERENCIA', label: 'Transferencia' },
    { value: 'CHEQUE', label: 'Cheque' },
    { value: 'OTRO', label: 'Otro' },
  ];
  
  export const etiquetaMetodoPago = (valor) =>
    OPCIONES_METODO_PAGO.find((op) => op.value === valor)?.label || '—';
  
  // ------------------------------------------------------------
  // TIPOS DE LÍNEA DE UN RECIBO (RN-31)
  // Un recibo tiene hasta una línea de cada tipo.
  // ------------------------------------------------------------
  export const ETIQUETA_LINEA = {
    HONORARIOS: 'Honorarios',
    GASTOS: 'Devolución de gastos',
    ANTICIPO: 'Anticipo',
  };
  
  export const etiquetaLinea = (valor) => ETIQUETA_LINEA[valor] || valor;
  
  // Para los filtros (pantalla /cobros): "" = sin filtrar
  export const OPCIONES_TIPO_LINEA = [
    { value: '', label: 'Todos los conceptos' },
    { value: 'HONORARIOS', label: 'Honorarios' },
    { value: 'GASTOS', label: 'Devolución de gastos' },
    { value: 'ANTICIPO', label: 'Anticipos' },
  ];
  
  // ------------------------------------------------------------
  // ESTADOS DEL RECIBO (RN-35: no se borran, se anulan)
  // ------------------------------------------------------------
  export const OPCIONES_ESTADO_RECIBO = [
    { value: '', label: 'Todos los estados' },
    { value: 'EMITIDO', label: 'Emitidos' },
    { value: 'ANULADO', label: 'Anulados' },
  ];
  
  const ETIQUETA_ESTADO_RECIBO = { EMITIDO: 'Emitido', ANULADO: 'Anulado' };
  export const etiquetaEstadoRecibo = (valor) => ETIQUETA_ESTADO_RECIBO[valor] || '—';
  
  // Color del Badge según estado (tonos que soporta Badge.jsx)
  export const TONO_ESTADO_RECIBO = { EMITIDO: 'green', ANULADO: 'gray' };
  
  // Largo máximo del motivo de anulación (igual que el backend: VarChar(300))
  export const MOTIVO_MAXIMO = 300;
  
  // ------------------------------------------------------------
  // HELPER: origenDeCobro
  // Un recibo es de un expediente O de un trámite. Devuelve el texto
  // para mostrar y el enlace a esa pantalla (mismo criterio que la
  // cuenta corriente del cliente).
  //   -> { texto: "123/2025 — Pérez c/ Gómez", enlace: "/expedientes/5" }
  // ------------------------------------------------------------
  export function origenDeCobro(cobro) {
    if (cobro.expediente) {
      const e = cobro.expediente;
      return { texto: `${e.numeroExpediente}/${e.anio} — ${e.caratula}`, enlace: `/expedientes/${e.id}` };
    }
    if (cobro.tramite) {
      const t = cobro.tramite;
      return {
        texto: `${t.tipo}${t.periodo ? ` (${t.periodo})` : ''}`,
        enlace: `/asesorias?tramiteId=${t.id}`,
      };
    }
    return { texto: '—', enlace: null };
  }