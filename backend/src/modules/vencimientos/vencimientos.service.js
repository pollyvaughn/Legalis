// ============================================================
// VENCIMIENTOS.SERVICE.JS
// Reporte PDF del LISTADO DE VENCIMIENTOS PENDIENTES (RF6): junta
// los plazos judiciales pendientes y los vencimientos de RUC
// (trámites abiertos de Asesorías), igual que el calendario, y los
// ordena por urgencia. No genera el PDF ni conoce Express: devuelve
// { titulo, subtitulo, columnas, filas, multilinea, nombreArchivo }
// listo para generarListadoPdf.
//
// Filtros (todos opcionales):
//   tipo  -> 'todos' (por defecto) | 'plazos' | 'ruc'
//   desde / hasta -> 'AAAA-MM-DD', sobre la fecha de vencimiento.
//     Con solo "hasta" entran también los VENCIDOS que siguen
//     pendientes (no tienen límite inferior): un listado de "próximos
//     30 días" no puede esconder lo que ya venció.
// ============================================================

const plazosService = require('../plazos/plazos.service');
const tramitesService = require('../tramites/tramites.service');
const { ErrorNegocio } = require('../../utils/errores');
const {
  fechaCorta,
  fechaCortaDesdeTexto,
  fechaHoraCorta,
  validarFechaTexto,
} = require('../../utils/formatoReportes');

const TIPOS_VALIDOS = ['todos', 'plazos', 'ruc'];
const ETIQUETA_TIPO_FILTRO = { todos: 'Plazos judiciales y RUC', plazos: 'Solo plazos judiciales', ruc: 'Solo RUC' };
const ETIQUETA_SEMAFORO = { VERDE: 'Al día', AMARILLO: 'Próximo', ROJO: 'Urgente', VENCIDO: 'Vencido' };
// Orden de urgencia: vencidos primero, después rojo, amarillo y verde
const PRIORIDAD = { VENCIDO: 0, ROJO: 1, AMARILLO: 2, VERDE: 3 };

// ------------------------------------------------------------
// Helper: Date -> "AAAA-MM-DD" (día calendario UTC, como se guardan
// las columnas @db.Date). Sirve para comparar contra desde/hasta.
// ------------------------------------------------------------
function aDiaTexto(fecha) {
  return new Date(fecha).toISOString().slice(0, 10);
}

// ------------------------------------------------------------
// Normaliza un plazo judicial al formato común de fila.
// En modalidad HORAS se muestra la hora exacta y se ordena por ella.
// ------------------------------------------------------------
function plazoAItem(plazo) {
  const conHora = plazo.modalidad === 'HORAS' && plazo.horaLimite;
  const expediente = plazo.expediente;
  return {
    tipo: 'Plazo judicial',
    dia: aDiaTexto(plazo.fechaVencimiento),
    momento: new Date(conHora ? plazo.horaLimite : plazo.fechaVencimiento).getTime(),
    semaforo: plazo.semaforo,
    vence: conHora ? fechaHoraCorta(plazo.horaLimite) : fechaCorta(plazo.fechaVencimiento),
    detalle: plazo.tipoPlazo?.nombre ?? '—',
    referencia: expediente ? `Expte. ${expediente.numeroExpediente} — ${expediente.caratula}` : '—',
  };
}

// ------------------------------------------------------------
// Normaliza un vencimiento de RUC (trámite abierto) al mismo formato.
// ------------------------------------------------------------
function tramiteAItem(tramite) {
  const ruc = tramite.cliente?.ruc ? ` (RUC ${tramite.cliente.ruc})` : '';
  return {
    tipo: 'Vencimiento RUC',
    dia: aDiaTexto(tramite.fechaVencimiento),
    momento: new Date(tramite.fechaVencimiento).getTime(),
    semaforo: tramite.semaforo,
    vence: fechaCorta(tramite.fechaVencimiento),
    detalle: tramite.tipoTramite?.nombre ?? '—',
    referencia: `${tramite.cliente?.nombreRazonSocial ?? '—'}${ruc}`,
  };
}

// ------------------------------------------------------------
// Texto del filtro de fechas para el subtítulo del PDF
// ------------------------------------------------------------
function textoPeriodo(desde, hasta) {
  if (desde && hasta) return `Del ${fechaCortaDesdeTexto(desde)} al ${fechaCortaDesdeTexto(hasta)}`;
  if (desde) return `Desde el ${fechaCortaDesdeTexto(desde)}`;
  if (hasta) return `Vencidos y hasta el ${fechaCortaDesdeTexto(hasta)}`;
  return 'Todos los pendientes';
}

// ------------------------------------------------------------
// PUNTO DE ENTRADA: valida parámetros y arma el reporte.
// ------------------------------------------------------------
async function armarReporte({ tipo = 'todos', desde, hasta }) {
  if (!TIPOS_VALIDOS.includes(tipo)) {
    throw new ErrorNegocio('El tipo debe ser "todos", "plazos" o "ruc".', 400);
  }
  const desdeOk = validarFechaTexto(desde, 'desde');
  const hastaOk = validarFechaTexto(hasta, 'hasta');
  if (desdeOk && hastaOk && desdeOk > hastaOk) {
    throw new ErrorNegocio('La fecha "desde" no puede ser posterior a "hasta".', 400);
  }

  // Solo se consulta lo que hace falta según el tipo elegido.
  // listarPendientesGlobal() sin parámetros trae solo PENDIENTES.
  const [plazos, tramites] = await Promise.all([
    tipo === 'ruc' ? [] : plazosService.listarPendientesGlobal(),
    tipo === 'plazos' ? [] : tramitesService.listarParaCalendario(),
  ]);

  const items = [...plazos.map(plazoAItem), ...tramites.map(tramiteAItem)]
    .filter((item) => (!desdeOk || item.dia >= desdeOk) && (!hastaOk || item.dia <= hastaOk))
    .sort(
      (a, b) =>
        (PRIORIDAD[a.semaforo] ?? 4) - (PRIORIDAD[b.semaforo] ?? 4) || a.momento - b.momento
    );

  return {
    titulo: 'Vencimientos pendientes',
    subtitulo: `${ETIQUETA_TIPO_FILTRO[tipo]} · ${textoPeriodo(desdeOk, hastaOk)} · Situación al ${fechaHoraCorta(new Date())}`,
    // Anchos: suman ~760 pt (ancho útil de A4 horizontal con margen 40)
    columnas: [
      { encabezado: 'Tipo', ancho: 90 },
      { encabezado: 'Vence', ancho: 100 },
      { encabezado: 'Estado', ancho: 65 },
      { encabezado: 'Detalle', ancho: 190 },
      { encabezado: 'Expediente / Cliente', ancho: 315 },
    ],
    filas: items.map((i) => [
      i.tipo,
      i.vence,
      ETIQUETA_SEMAFORO[i.semaforo] ?? '—',
      i.detalle,
      i.referencia,
    ]),
    multilinea: true,
    nombreArchivo: 'vencimientos-pendientes.pdf',
  };
}

module.exports = { armarReporte };