// ============================================================
// SERVICE: PlazoJudicial
// Capa de acceso a datos + orquestación de las funciones puras
// de backend/src/utils/calendarioPlazos.js.
// El service es quien sabe hablar con Prisma; las funciones de
// cálculo no saben nada de la base de datos (así se testean solas).
// ============================================================

const prisma = require('../../config/database');
const {
  calcularFechaVencimiento,
  calcularLimiteConGracia,
  calcularSemaforo,
} = require('../../utils/calendarioPlazos');

// ------------------------------------------------------------
// Helper interno: trae los DiaNoHabil vigentes para el cálculo.
// Por ahora trae TODOS (la tabla no es gigante: son feriados +
// asuetos + feria judicial, unas pocas decenas de filas por año).
// Si en el futuro crece mucho, se puede filtrar por rango de
// fechas cercano a la notificación.
// ------------------------------------------------------------
async function obtenerDiasNoHabiles() {
  return prisma.diaNoHabil.findMany({
    select: { fechaDesde: true, fechaHasta: true },
  });
}

// ------------------------------------------------------------
// Helper interno: determina si el expediente es de fuero Penal
// (para saber si corresponde informar el límite con gracia, RN-19).
// Lanza 404 si el expediente no existe — se reutiliza en varias
// funciones de este service.
// ------------------------------------------------------------
async function obtenerExpedienteOFallar(expedienteId) {
  const expediente = await prisma.expediente.findUnique({
    where: { id: expedienteId },
  });
  if (!expediente) {
    const error = new Error('El expediente indicado no existe.');
    error.status = 404;
    throw error;
  }
  return expediente;
}

// ------------------------------------------------------------
// CALCULAR (sin guardar nada) — RN-20: "el sistema propone la
// fecha y ella puede corregirla". Se llama ANTES de crear el
// PlazoJudicial, para mostrar la sugerencia en el formulario.
//
// Devuelve: { fechaVencimiento, limiteConGracia (o null si es
// fuero Penal, RN-19) }
// ------------------------------------------------------------
async function calcularSugerencia(expedienteId, { fechaNotificacion, diasCantidad, modalidad }) {
  if (modalidad === 'HORAS') {
    // En HORAS no hay nada que calcular: la abogada carga la
    // fecha y hora límite directamente.
    return { fechaVencimiento: null, limiteConGracia: null };
  }

  const expediente = await obtenerExpedienteOFallar(expedienteId);
  const diasNoHabiles = modalidad === 'HABILES' ? await obtenerDiasNoHabiles() : [];

  const fechaVencimiento = calcularFechaVencimiento({
    fechaNotificacion: new Date(fechaNotificacion),
    diasCantidad,
    modalidad,
    diasNoHabiles,
  });

  // RN-19: el fuero Penal no tiene plazo de gracia.
  const esPenal = expediente.fuero === 'PENAL';
  const limiteConGracia = esPenal
    ? null
    : calcularLimiteConGracia({ fechaVencimiento, diasNoHabiles });

  return { fechaVencimiento, limiteConGracia };
}

// ------------------------------------------------------------
// CREAR PlazoJudicial
// A esta altura fechaVencimiento ya viene decidida (calculada
// por el endpoint de arriba, y potencialmente corregida por la
// abogada en el formulario) — el service NO vuelve a calcularla,
// solo valida y guarda lo que llega.
// ------------------------------------------------------------
async function crearPlazo(expedienteId, datos) {
  const {
    actuacionId,
    tipoPlazoId,
    diasCantidad,
    modalidad,
    fechaNotificacion,
    fechaVencimiento,
    horaLimite,
    observaciones,
  } = datos;

  await obtenerExpedienteOFallar(expedienteId);

  // Si se indica actuacionId, validar que pertenezca a este expediente.
  if (actuacionId) {
    const actuacion = await prisma.actuacion.findUnique({ where: { id: actuacionId } });
    if (!actuacion || actuacion.expedienteId !== expedienteId) {
      const error = new Error('La actuación indicada no corresponde a este expediente.');
      error.status = 400;
      throw error;
    }
  }

  // modalidad HORAS exige horaLimite; las otras dos exigen fechaVencimiento.
  if (modalidad === 'HORAS' && !horaLimite) {
    const error = new Error('Para modalidad HORAS, horaLimite es obligatorio.');
    error.status = 400;
    throw error;
  }
  if (modalidad !== 'HORAS' && !fechaVencimiento) {
    const error = new Error('fechaVencimiento es obligatorio para esta modalidad.');
    error.status = 400;
    throw error;
  }

  const plazo = await prisma.plazoJudicial.create({
    data: {
      expedienteId,
      actuacionId: actuacionId ?? null,
      tipoPlazoId,
      diasCantidad,
      modalidad,
      fechaNotificacion: new Date(fechaNotificacion),
      fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
      horaLimite: horaLimite ? new Date(horaLimite) : null,
      observaciones: observaciones ?? null,
    },
    include: {
      tipoPlazo: { select: { id: true, nombre: true } },
    },
  });
  
  return conSemaforo(plazo);
}

// ------------------------------------------------------------
// Helper interno: agrega el semáforo calculado al vuelo a un
// PlazoJudicial ya traído de la base. No modifica la base de
// datos — solo enriquece el objeto que se devuelve al frontend.
// ------------------------------------------------------------
function conSemaforo(plazo) {
  // Un plazo ya CUMPLIDO no tiene urgencia: se muestra tal cual.
  if (plazo.estado === 'CUMPLIDO') {
    return { ...plazo, semaforo: 'CUMPLIDO' };
  }
  // modalidad HORAS no usa fechaVencimiento para el semáforo de
  // días — de todos modos, si algún día se quiere alertar por
  // horas, se agrega acá. Por ahora, si no hay fechaVencimiento
  // (caso HORAS), no se calcula semáforo de días.
  if (!plazo.fechaVencimiento) {
    return { ...plazo, semaforo: null };
  }
  return { ...plazo, semaforo: calcularSemaforo({ fechaVencimiento: plazo.fechaVencimiento }) };
}

// ------------------------------------------------------------
// Listar plazos de un expediente
// ------------------------------------------------------------
async function listarPorExpediente(expedienteId) {
  const plazos = await prisma.plazoJudicial.findMany({
    where: { expedienteId },
    orderBy: { fechaVencimiento: 'asc' },
    include: {
      tipoPlazo: { select: { id: true, nombre: true } },
    },
  });
  return plazos.map(conSemaforo);
}

// ------------------------------------------------------------
// Listar plazos del estudio para el panel de alertas / calendario
// (RF6). Por defecto solo PENDIENTES (uso original: dashboard de
// alertas). Con incluirCumplidos=true trae también los CUMPLIDOS,
// para la vista "Calendario & Plazos" que necesita historial
// completo, no solo lo pendiente. El nombre de la función quedó
// desde la versión original (solo pendientes); se mantiene para
// no romper el import en el controller.
// ------------------------------------------------------------
async function listarPendientesGlobal({ incluirCumplidos = false } = {}) {
  const plazos = await prisma.plazoJudicial.findMany({
    where: incluirCumplidos ? {} : { estado: 'PENDIENTE' },
    orderBy: { fechaVencimiento: 'asc' },
    include: {
      tipoPlazo: { select: { id: true, nombre: true } },
      expediente: { select: { id: true, numeroExpediente: true, caratula: true } },
    },
  });
  const conColor = plazos.map(conSemaforo);

  // Orden final "por urgencia": vencidos primero, después rojo,
  // amarillo, verde, y cumplidos al final. orderBy de Prisma ya
  // ordenó por fecha, pero como el semáforo no es un campo de la
  // base, este reordenamiento fino se hace acá en memoria (la
  // cantidad de plazos de un estudio unipersonal es chica, no hay
  // problema de rendimiento).
  const prioridad = { VENCIDO: 0, ROJO: 1, AMARILLO: 2, VERDE: 3, CUMPLIDO: 4 };
  return conColor.sort((a, b) => prioridad[a.semaforo] - prioridad[b.semaforo]);
}

// ------------------------------------------------------------
// Obtener un plazo puntual
// ------------------------------------------------------------
async function obtenerPorId(id) {
  const plazo = await prisma.plazoJudicial.findUnique({
    where: { id },
    include: {
      tipoPlazo: { select: { id: true, nombre: true } },
    },
  });
  if (!plazo) {
    const error = new Error('Plazo judicial no encontrado.');
    error.status = 404;
    throw error;
  }
  return conSemaforo(plazo);
}

// ------------------------------------------------------------
// Editar plazo
// A diferencia de la primera versión, ahora SÍ permite cambiar
// tipoPlazoId, diasCantidad, modalidad y fechaNotificacion — si
// alguno de esos cambia, se recalcula fechaVencimiento (y el
// límite con gracia se vuelve a calcular en el service pero no
// se persiste, igual que en la creación). Si en cambio solo se
// envía una fechaVencimiento corregida a mano (sin tocar los
// datos de origen), se respeta esa corrección manual y NO se
// recalcula (RN-20: "ella puede corregirla").
// ------------------------------------------------------------
async function actualizarPlazo(id, datos) {
  const plazoExistente = await obtenerPorId(id); // valida existencia (404 si no está)

  const {
    tipoPlazoId,
    diasCantidad,
    modalidad,
    fechaNotificacion,
    fechaVencimiento, // si viene, es una corrección manual explícita
    horaLimite,
    observaciones,
  } = datos;

  // ¿Cambió algún dato de origen del cálculo? Si es así, y no vino
  // una fechaVencimiento manual en el mismo pedido, recalculamos.
  const cambioDatoDeOrigen =
    (tipoPlazoId && tipoPlazoId !== plazoExistente.tipoPlazoId) ||
    (diasCantidad && diasCantidad !== plazoExistente.diasCantidad) ||
    (modalidad && modalidad !== plazoExistente.modalidad) ||
    (fechaNotificacion && new Date(fechaNotificacion).getTime() !== new Date(plazoExistente.fechaNotificacion).getTime());

  let fechaVencimientoFinal = fechaVencimiento ? new Date(fechaVencimiento) : undefined;

  if (cambioDatoDeOrigen && !fechaVencimiento) {
    const modalidadFinal = modalidad ?? plazoExistente.modalidad;

    if (modalidadFinal === 'HORAS') {
      // En HORAS no hay cálculo: si cambiaron a esta modalidad,
      // exigimos que manden horaLimite en el mismo pedido.
      if (!horaLimite) {
        const error = new Error('Al cambiar a modalidad HORAS, horaLimite es obligatorio.');
        error.status = 400;
        throw error;
      }
      fechaVencimientoFinal = null;
    } else {
      const diasNoHabiles = modalidadFinal === 'HABILES' ? await obtenerDiasNoHabiles() : [];
      fechaVencimientoFinal = calcularFechaVencimiento({
        fechaNotificacion: fechaNotificacion ? new Date(fechaNotificacion) : plazoExistente.fechaNotificacion,
        diasCantidad: diasCantidad ?? plazoExistente.diasCantidad,
        modalidad: modalidadFinal,
        diasNoHabiles,
      });
    }
  }

  return prisma.plazoJudicial.update({
    where: { id },
    data: {
      tipoPlazoId: tipoPlazoId ?? undefined,
      diasCantidad: diasCantidad ?? undefined,
      modalidad: modalidad ?? undefined,
      fechaNotificacion: fechaNotificacion ? new Date(fechaNotificacion) : undefined,
      fechaVencimiento: fechaVencimientoFinal,
      horaLimite: horaLimite ? new Date(horaLimite) : undefined,
      observaciones,
    },
  });
}

// ------------------------------------------------------------
// Marcar como cumplido (RN-24: retira la alerta activa)
// ------------------------------------------------------------
async function marcarCumplido(id) {
  await obtenerPorId(id); // valida existencia (404 si no está)

  return prisma.plazoJudicial.update({
    where: { id },
    data: {
      estado: 'CUMPLIDO',
      fechaCumplido: new Date(),
    },
  });
}

// ------------------------------------------------------------
// Eliminar plazo
// Hard-delete: cargar un plazo por error (tipo, expediente o
// cantidad de días equivocados) es un error de tipeo, no un
// hecho procesal a conservar en el historial.
// ------------------------------------------------------------
async function eliminarPlazo(id) {
  await obtenerPorId(id); // valida existencia (404 si no está)
  await prisma.plazoJudicial.delete({ where: { id } });
}

module.exports = {
  calcularSugerencia,
  crearPlazo,
  listarPorExpediente,
  listarPendientesGlobal,
  obtenerPorId,
  actualizarPlazo,
  marcarCumplido,
  eliminarPlazo,
};