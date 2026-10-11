// ============================================================
// EXPEDIENTES.REPORTE.SERVICE.JS
// Arma los datos de los reportes PDF de UN expediente (Módulo 2):
//   - "actuaciones": historial cronológico, con período opcional
//   - "plazos":      plazos judiciales PENDIENTES (sin período)
// No genera el PDF ni conoce Express: devuelve { titulo, subtitulo,
// columnas, filas, nombreArchivo } listo para generarListadoPdf.
//
// Los plazos pendientes NO llevan período a propósito: son lo que
// está abierto hoy, y filtrarlos por fecha podría esconder un plazo
// que está por vencer.
// ============================================================

const prisma = require('../../config/database');
const plazosService = require('../plazos/plazos.service');
const { ErrorNegocio } = require('../../utils/errores');

// Etiquetas legibles de los enums (espejo de las constantes del
// frontend: constants/tiposActuacion.js, tiposPlazo.js y
// semaforoPlazos.js — si cambian allá, actualizar acá).
const ETIQUETA_TIPO_ACTUACION = {
  PROVIDENCIA: 'Providencia',
  RESOLUCION: 'Resolución',
  SENTENCIA: 'Sentencia',
  ESCRITO_PRESENTADO: 'Escrito presentado',
  AUDIENCIA: 'Audiencia',
  NOTIFICACION: 'Notificación',
  OFICIO: 'Oficio',
  OTRO: 'Otro',
};
const ETIQUETA_MODALIDAD = { HABILES: 'Días hábiles', CORRIDOS: 'Días corridos', HORAS: 'Horas' };
const ETIQUETA_SEMAFORO = { VERDE: 'Al día', AMARILLO: 'Próximo', ROJO: 'Urgente', VENCIDO: 'Vencido' };

const CONTENIDOS_VALIDOS = ['actuaciones', 'plazos'];
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

// ------------------------------------------------------------
// Helper: Date de una columna @db.Date (medianoche UTC) -> "DD/MM/AAAA".
// Se arma desde el ISO para que no se corra un día por la zona horaria.
// ------------------------------------------------------------
function fechaCorta(fecha) {
  if (!fecha) return '—';
  const [anio, mes, dia] = new Date(fecha).toISOString().slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
}

// ------------------------------------------------------------
// Helper: "AAAA-MM-DD" (como llega del frontend) -> "DD/MM/AAAA"
// ------------------------------------------------------------
function fechaCortaDesdeTexto(texto) {
  const [anio, mes, dia] = texto.split('-');
  return `${dia}/${mes}/${anio}`;
}

// ------------------------------------------------------------
// Helper: fecha y hora exactas de una horaLimite, en hora de
// Paraguay y formato 24 h. Ej: "19/10/2026 15:30"
// ------------------------------------------------------------
function fechaHoraCorta(fecha) {
  return new Intl.DateTimeFormat('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Asuncion',
  })
    .format(new Date(fecha))
    .replace(', ', ' '); // "19/10/2026, 15:30" -> "19/10/2026 15:30"
}

// ------------------------------------------------------------
// Helper: valida un "AAAA-MM-DD" opcional. Devuelve el texto
// (o null si no vino) o lanza 400 si no es una fecha real.
// ------------------------------------------------------------
function validarFechaTexto(valor, nombre) {
  if (!valor) return null;
  // Ojo: toISOString() lanza error con fechas imposibles (ej: mes 13),
  // por eso primero se chequea que el Date sea válido.
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  const esValida =
    FORMATO_FECHA.test(valor) && !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
  if (!esValida) {
    throw new ErrorNegocio(`La fecha "${nombre}" no es válida (formato AAAA-MM-DD).`, 400);
  }
  return valor;
}

// ------------------------------------------------------------
// Reporte de ACTUACIONES de un expediente, con período opcional.
// desde / hasta: "AAAA-MM-DD" (inclusive los dos extremos).
// Orden cronológico ascendente (de la más antigua a la más reciente):
// en papel el historial se lee de arriba hacia abajo como un relato.
// ------------------------------------------------------------
async function reporteActuaciones(expediente, { desde, hasta }) {
  // Filtro de período sobre Actuacion.fecha (@db.Date → medianoche UTC)
  const filtroFecha = {};
  if (desde) filtroFecha.gte = new Date(`${desde}T00:00:00.000Z`);
  if (hasta) filtroFecha.lte = new Date(`${hasta}T00:00:00.000Z`);

  const actuaciones = await prisma.actuacion.findMany({
    where: {
      expedienteId: expediente.id,
      ...(desde || hasta ? { fecha: filtroFecha } : {}),
    },
    orderBy: [{ fecha: 'asc' }, { id: 'asc' }], // id desempata actuaciones del mismo día
    include: { parteProcesal: { select: { nombre: true } } },
  });

  // Texto del período para el subtítulo del PDF
  let periodo = 'Todo el historial';
  if (desde && hasta) periodo = `Del ${fechaCortaDesdeTexto(desde)} al ${fechaCortaDesdeTexto(hasta)}`;
  else if (desde) periodo = `Desde el ${fechaCortaDesdeTexto(desde)}`;
  else if (hasta) periodo = `Hasta el ${fechaCortaDesdeTexto(hasta)}`;

  return {
    titulo: 'Historial de actuaciones',
    subtitulo: `${encabezadoExpediente(expediente)} · ${periodo}`,
    // Anchos: suman ~760 pt (ancho útil de A4 horizontal con margen 40)
    columnas: [
      { encabezado: 'Fecha', ancho: 65 },
      { encabezado: 'Tipo', ancho: 105 },
      { encabezado: 'Descripción', ancho: 360 },
      { encabezado: 'Notificada el', ancho: 75 },
      { encabezado: 'Parte procesal', ancho: 155 },
    ],
    filas: actuaciones.map((a) => [
      fechaCorta(a.fecha),
      ETIQUETA_TIPO_ACTUACION[a.tipo] ?? a.tipo,
      a.descripcion,
      fechaCorta(a.fechaNotificacion),
      a.parteProcesal?.nombre ?? '—',
    ]),
    multilinea: true, // las descripciones son texto libre: que no se corten
    nombreArchivo: `actuaciones-expte-${expediente.numeroExpediente}-${expediente.anio}.pdf`,
  };
}

// ------------------------------------------------------------
// Reporte de PLAZOS PENDIENTES de un expediente.
// Reutiliza listarPorExpediente (que ya calcula el semáforo al vuelo)
// y se queda solo con los PENDIENTE. Orden: el más próximo primero
// (los vencidos, que siguen pendientes, quedan arriba).
// ------------------------------------------------------------
async function reportePlazosPendientes(expediente) {
  const todos = await plazosService.listarPorExpediente(expediente.id);
  const pendientes = todos.filter((p) => p.estado === 'PENDIENTE');

  return {
    titulo: 'Plazos pendientes',
    subtitulo: `${encabezadoExpediente(expediente)} · Situación al ${fechaHoraCorta(new Date())}`,
    columnas: [
      { encabezado: 'Plazo', ancho: 170 },
      { encabezado: 'Notificación', ancho: 70 },
      { encabezado: 'Cómputo', ancho: 85 },
      { encabezado: 'Vence', ancho: 95 },
      { encabezado: 'Estado', ancho: 65 },
      { encabezado: 'Observaciones', ancho: 275 },
    ],
    filas: pendientes.map((p) => [
      p.tipoPlazo?.nombre ?? '—',
      fechaCorta(p.fechaNotificacion),
      // Ej: "18 días hábiles" / "24 horas"
      p.modalidad === 'HORAS'
        ? `${p.diasCantidad} horas`
        : `${p.diasCantidad} ${ETIQUETA_MODALIDAD[p.modalidad].toLowerCase()}`,
      // HORAS: fecha y hora exactas; resto: solo la fecha
      p.modalidad === 'HORAS' && p.horaLimite ? fechaHoraCorta(p.horaLimite) : fechaCorta(p.fechaVencimiento),
      ETIQUETA_SEMAFORO[p.semaforo] ?? '—',
      p.observaciones ?? '—',
    ]),
    multilinea: true,
    nombreArchivo: `plazos-pendientes-expte-${expediente.numeroExpediente}-${expediente.anio}.pdf`,
  };
}

// ------------------------------------------------------------
// Línea de identificación del expediente para el subtítulo
// Ej: "Expte. 123/2026 — Pérez c/ Gómez s/ Cobro · Cliente: Juan Pérez"
// ------------------------------------------------------------
function encabezadoExpediente(expediente) {
  const cliente = expediente.cliente?.nombreRazonSocial;
  return (
    `Expte. ${expediente.numeroExpediente}/${expediente.anio} — ${expediente.caratula}` +
    (cliente ? ` · Cliente: ${cliente}` : '')
  );
}

// ------------------------------------------------------------
// PUNTO DE ENTRADA: valida los parámetros y delega en el reporte
// que corresponda. Lanza ErrorNegocio (400/404) si algo no cierra.
// Acepta expedientes inactivos (se puede imprimir uno dado de baja).
// ------------------------------------------------------------
async function armarReporte(expedienteId, { contenido, desde, hasta }) {
  if (!CONTENIDOS_VALIDOS.includes(contenido)) {
    throw new ErrorNegocio('El contenido a exportar debe ser "actuaciones" o "plazos".', 400);
  }

  const desdeOk = validarFechaTexto(desde, 'desde');
  const hastaOk = validarFechaTexto(hasta, 'hasta');
  if (desdeOk && hastaOk && desdeOk > hastaOk) {
    throw new ErrorNegocio('La fecha "desde" no puede ser posterior a "hasta".', 400);
  }

  const id = Number(expedienteId);
  if (!Number.isInteger(id)) {
    throw new ErrorNegocio('El expediente indicado no es válido.', 400);
  }

  const expediente = await prisma.expediente.findUnique({
    where: { id },
    select: {
      id: true,
      numeroExpediente: true,
      anio: true,
      caratula: true,
      cliente: { select: { nombreRazonSocial: true } },
    },
  });
  if (!expediente) {
    throw new ErrorNegocio('Expediente no encontrado.', 404);
  }

  return contenido === 'actuaciones'
    ? reporteActuaciones(expediente, { desde: desdeOk, hasta: hastaOk })
    : reportePlazosPendientes(expediente);
}

module.exports = { armarReporte };