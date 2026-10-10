// ============================================================
// SERVICE: PlazoJudicial
// Capa de acceso a datos + orquestación de las funciones puras
// de backend/src/utils/calendarioPlazos.js.
// El service es quien sabe hablar con Prisma; las funciones de
// cálculo no saben nada de la base de datos (así se testean solas).
//
// AUDITORÍA (RN-41): crear, editar, marcar cumplido y eliminar
// registran quién lo hizo, dentro de la MISMA transacción que el
// cambio. "Marcar cumplido" se registra como EDITAR (no hay una
// acción propia en el enum) y se aclara en el detalle.
//
// BLOQUEO DE CUMPLIDOS: un plazo CUMPLIDO ya es un hecho cerrado
// (RN-24). No se puede editar, eliminar ni volver a marcar como
// cumplido: el backend lo rechaza con 400 aunque el frontend ya
// no muestre los botones.
// ============================================

const prisma = require('../../config/database');
const {
  calcularFechaVencimiento,
  calcularLimiteConGracia,
  calcularSemaforo,
  calcularSemaforoHoras,
} = require('../../utils/calendarioPlazos');
const { registrarAuditoria } = require('../../utils/auditoria');

// ------------------------------------------------------------
// Helper interno: Date (UTC, de una columna @db.Date) -> "DD/MM/AAAA"
// Se arma desde el ISO para que no se corra un día por la zona horaria.
// ------------------------------------------------------------
function formatearFechaUtc(fecha) {
  const [anio, mes, dia] = new Date(fecha).toISOString().slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
}

// ------------------------------------------------------------
// Helper interno: fecha (sin hora) de una horaLimite.
// PlazoJudicial.fechaVencimiento es obligatoria en el schema, también
// para modalidad HORAS: ahí se guarda el DÍA de horaLimite (en la zona
// horaria del servidor, la misma con la que se interpretó la hora que
// cargó la abogada). Se arma como medianoche UTC, que es como se
// guardan las columnas @db.Date.
// ------------------------------------------------------------
function fechaDeHoraLimite(horaLimite) {
  const hora = new Date(horaLimite);
  return new Date(Date.UTC(hora.getFullYear(), hora.getMonth(), hora.getDate()));
}

// ------------------------------------------------------------
// Helper interno: descripción corta de un plazo para la auditoría.
// Ej: "Contestación de demanda civil - exp. #12, vence 19/10/2026"
// Requiere que el plazo traiga tipoPlazo incluido.
// En modalidad HORAS se muestra la horaLimite (fecha y hora exactas).
// ------------------------------------------------------------
function descripcionPlazo(plazo) {
  let vence = '—';
  if (plazo.modalidad === 'HORAS' && plazo.horaLimite) {
    vence = new Date(plazo.horaLimite).toLocaleString('es-PY');
  } else if (plazo.fechaVencimiento) {
    vence = formatearFechaUtc(plazo.fechaVencimiento);
  }
  return `${plazo.tipoPlazo?.nombre ?? 'Plazo'} - exp. #${plazo.expedienteId}, vence ${vence}`;
}

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
// Helper interno: rechaza (400) cualquier cambio sobre un plazo
// ya CUMPLIDO. 'accion' completa el mensaje: "editar", "eliminar".
// Recibe el plazo ya traído de la base (con su campo estado).
// ------------------------------------------------------------
function exigirPlazoPendiente(plazo, accion) {
  if (plazo.estado === 'CUMPLIDO') {
    const error = new Error(`No se puede ${accion} un plazo cumplido.`);
    error.status = 400;
    throw error;
  }
}

// ------------------------------------------------------------
// CALCULAR (sin guardar nada) — RN-20: "el sistema propone la
// fecha y ella puede corregirla". Se llama ANTES de crear el
// PlazoJudicial, para mostrar la sugerencia en el formulario.
// No se audita: no modifica datos.
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
// CREAR PlazoJudicial (+ auditoría CREAR)
// A esta altura fechaVencimiento ya viene decidida (calculada
// por el endpoint de arriba, y potencialmente corregida por la
// abogada en el formulario) — el service NO vuelve a calcularla,
// solo valida y guarda lo que llega.
// Ahora recibe usuarioId (3er parámetro) para la auditoría.
// ------------------------------------------------------------
async function crearPlazo(expedienteId, datos, usuarioId) {
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

  // Transacción: crear el plazo + registrar la auditoría, todo o nada
  const plazo = await prisma.$transaction(async (tx) => {
    const nuevo = await tx.plazoJudicial.create({
      data: {
        expedienteId,
        actuacionId: actuacionId ?? null,
        tipoPlazoId,
        diasCantidad,
        modalidad,
        fechaNotificacion: new Date(fechaNotificacion),
        // HORAS: el día de horaLimite (la columna es obligatoria); resto: la
        // fecha calculada/corregida que llega del formulario.
        fechaVencimiento:
          modalidad === 'HORAS' ? fechaDeHoraLimite(horaLimite) : new Date(fechaVencimiento),
        horaLimite: horaLimite ? new Date(horaLimite) : null,
        observaciones: observaciones ?? null,
      },
      include: {
        tipoPlazo: { select: { id: true, nombre: true } },
      },
    });

    await registrarAuditoria(tx, {
      usuarioId,
      accion: 'CREAR',
      entidad: 'PlazoJudicial',
      entidadId: nuevo.id,
      detalle: descripcionPlazo(nuevo),
    });

    return nuevo;
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
  // modalidad HORAS: el semáforo se mide en horas sobre horaLimite
  // (VENCIDO apenas pasa ese momento exacto).
  if (plazo.modalidad === 'HORAS') {
    if (!plazo.horaLimite) {
      return { ...plazo, semaforo: null };
    }
    return { ...plazo, semaforo: calcularSemaforoHoras({ horaLimite: plazo.horaLimite }) };
  }
  // Resto de modalidades: semáforo por días sobre fechaVencimiento.
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
// Editar plazo (+ auditoría EDITAR)
// A diferencia de la primera versión, ahora SÍ permite cambiar
// tipoPlazoId, diasCantidad, modalidad y fechaNotificacion — si
// alguno de esos cambia, se recalcula fechaVencimiento (y el
// límite con gracia se vuelve a calcular en el service pero no
// se persiste, igual que en la creación). Si en cambio solo se
// envía una fechaVencimiento corregida a mano (sin tocar los
// datos de origen), se respeta esa corrección manual y NO se
// recalcula (RN-20: "ella puede corregirla").
// Ahora recibe usuarioId (3er parámetro) para la auditoría.
// ------------------------------------------------------------
async function actualizarPlazo(id, datos, usuarioId) {
  const plazoExistente = await obtenerPorId(id); // valida existencia (404 si no está)
  exigirPlazoPendiente(plazoExistente, 'editar'); // un cumplido queda bloqueado

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

  const modalidadFinal = modalidad ?? plazoExistente.modalidad;
  let fechaVencimientoFinal = fechaVencimiento ? new Date(fechaVencimiento) : undefined;

  // HORAS: la fecha de vencimiento siempre sigue al día de horaLimite
  // (cada vez que llega una horaLimite nueva, se actualiza también).
  if (modalidadFinal === 'HORAS' && horaLimite) {
    fechaVencimientoFinal = fechaDeHoraLimite(horaLimite);
  }

  if (cambioDatoDeOrigen && !fechaVencimiento) {

    if (modalidadFinal === 'HORAS') {
      // En HORAS no hay cálculo: si cambiaron a esta modalidad,
      // exigimos que manden horaLimite en el mismo pedido.
      if (!horaLimite) {
        const error = new Error('Al cambiar a modalidad HORAS, horaLimite es obligatorio.');
        error.status = 400;
        throw error;
      }
      fechaVencimientoFinal = fechaDeHoraLimite(horaLimite);
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

  // Transacción: actualizar el plazo + registrar la auditoría, todo o nada
  const plazoActualizado = await prisma.$transaction(async (tx) => {
    const actualizado = await tx.plazoJudicial.update({
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
      // tipoPlazo incluido para poder describir el plazo en la auditoría
      include: { tipoPlazo: { select: { id: true, nombre: true } } },
    });

    await registrarAuditoria(tx, {
      usuarioId,
      accion: 'EDITAR',
      entidad: 'PlazoJudicial',
      entidadId: id,
      detalle: descripcionPlazo(actualizado),
    });

    return actualizado;
  });

  // Se devuelve con el semáforo ya calculado: el frontend reemplaza
  // el plazo en su lista sin tener que volver a pedir todo.
  return conSemaforo(plazoActualizado);
}

// ------------------------------------------------------------
// Marcar como cumplido (RN-24: retira la alerta activa)
// Auditoría: se registra como EDITAR (no hay acción propia en el
// enum) y el detalle empieza con "Marcado como cumplido".
// Ahora recibe usuarioId (2do parámetro) para la auditoría.
// ------------------------------------------------------------
async function marcarCumplido(id, usuarioId) {
  const plazoExistente = await obtenerPorId(id); // valida existencia (404 si no está)

  // No se vuelve a marcar: pisaría fechaCumplido con una fecha posterior.
  if (plazoExistente.estado === 'CUMPLIDO') {
    const error = new Error('El plazo ya está marcado como cumplido.');
    error.status = 400;
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    const cumplido = await tx.plazoJudicial.update({
      where: { id },
      data: {
        estado: 'CUMPLIDO',
        fechaCumplido: new Date(),
      },
      include: { tipoPlazo: { select: { id: true, nombre: true } } },
    });

    await registrarAuditoria(tx, {
      usuarioId,
      accion: 'EDITAR',
      entidad: 'PlazoJudicial',
      entidadId: id,
      detalle: `Marcado como cumplido: ${descripcionPlazo(cumplido)}`,
    });

    return cumplido;
  });
}

// ------------------------------------------------------------
// Eliminar plazo (+ auditoría ELIMINAR)
// Hard-delete: cargar un plazo por error (tipo, expediente o
// cantidad de días equivocados) es un error de tipeo, no un
// hecho procesal a conservar en el historial.
// La descripción se arma ANTES de borrar (después ya no se puede
// leer de la base); obtenerPorId ya trae el tipoPlazo incluido.
// Ahora recibe usuarioId (2do parámetro) para la auditoría.
// ------------------------------------------------------------
async function eliminarPlazo(id, usuarioId) {
  const plazo = await obtenerPorId(id); // valida existencia (404 si no está)
  exigirPlazoPendiente(plazo, 'eliminar'); // un cumplido queda bloqueado

  await prisma.$transaction(async (tx) => {
    await tx.plazoJudicial.delete({ where: { id } });

    await registrarAuditoria(tx, {
      usuarioId,
      accion: 'ELIMINAR',
      entidad: 'PlazoJudicial',
      entidadId: id,
      detalle: descripcionPlazo(plazo),
    });
  });
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