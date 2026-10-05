// ============================================================
// ACTUACION.SERVICE.JS:
// Capa de acceso a datos + reglas de negocio del Módulo 2 (RF5).
// No conoce Express (req/res): recibe datos ya validados desde
// el controller y devuelve objetos planos o lanza errores con
// un campo .status para que el manejador global de errores
// responda con el código HTTP correcto.
// ============================================================

const prisma = require('../../config/database');

// ------------------------------------------------------------
// Helper: valida que una fecha no sea posterior a hoy.
// Mismo criterio ya usado en DocumentoRecibido.fechaRecepcion:
// una actuación registra algo que YA ocurrió, no algo previsto
// a futuro (para eso están los plazos/vencimientos del calendario).
// ------------------------------------------------------------
function validarFechaNoFutura(fecha, nombreCampo) {
  const fechaComoDate = new Date(fecha);
  const hoy = new Date();
  hoy.setHours(23, 59, 59, 999); // fin del día de hoy, para no rechazar "hoy" por la hora

  if (fechaComoDate > hoy) {
    const error = new Error(`${nombreCampo} no puede ser una fecha futura.`);
    error.status = 400;
    throw error;
  }
}

// ------------------------------------------------------------
// Crear actuación
// Requiere: expedienteId, tipo, fecha, descripcion.
// Opcionales: parteProcesalId, fechaNotificacion.
// ------------------------------------------------------------
async function crearActuacion(datos) {
  const { expedienteId, parteProcesalId, tipo, fecha, descripcion, fechaNotificacion } = datos;

  // Validación de fecha: una actuación registra un hecho ya ocurrido.
  validarFechaNoFutura(fecha, 'La fecha de la actuación');
  if (fechaNotificacion) {
    validarFechaNoFutura(fechaNotificacion, 'La fecha de notificación');
  }

  // El expediente debe existir y estar activo: no se cargan
  // actuaciones sobre expedientes inactivados o inexistentes.
  const expediente = await prisma.expediente.findUnique({
    where: { id: expedienteId },
  });
  if (!expediente) {
    const error = new Error('El expediente indicado no existe.');
    error.status = 404;
    throw error;
  }
  if (!expediente.activo) {
    const error = new Error('No se pueden registrar actuaciones sobre un expediente inactivo.');
    error.status = 400;
    throw error;
  }

  // Si se indica parteProcesalId, debe pertenecer a ESTE expediente
  // (no tiene sentido asociar una parte de otro caso).
  if (parteProcesalId) {
    const parte = await prisma.parteProcesal.findUnique({
      where: { id: parteProcesalId },
    });
    if (!parte || parte.expedienteId !== expedienteId) {
      const error = new Error('La parte procesal indicada no corresponde a este expediente.');
      error.status = 400;
      throw error;
    }
  }

  return prisma.actuacion.create({
    data: {
      expedienteId,
      parteProcesalId: parteProcesalId ?? null,
      tipo,
      fecha: new Date(fecha),
      descripcion,
      fechaNotificacion: fechaNotificacion ? new Date(fechaNotificacion) : null,
    },
  });
}

// ------------------------------------------------------------
// Listar actuaciones de un expediente
// Orden cronológico DESCENDENTE (la más reciente primero) —
// es el uso principal en la ficha del expediente.
// ------------------------------------------------------------
async function listarPorExpediente(expedienteId) {
  return prisma.actuacion.findMany({
    where: { expedienteId },
    orderBy: { fecha: 'desc' },
    include: {
      // solo lo necesario para mostrar en la lista, sin traer el objeto completo
      parteProcesal: { select: { id: true, nombre: true, rol: true } },
    },
  });
}

// ------------------------------------------------------------
// Obtener una actuación puntual (para ver detalle o antes de editar)
// ------------------------------------------------------------
async function obtenerPorId(id) {
  const actuacion = await prisma.actuacion.findUnique({
    where: { id },
    include: {
      parteProcesal: { select: { id: true, nombre: true, rol: true } },
    },
  });
  if (!actuacion) {
    const error = new Error('Actuación no encontrada.');
    error.status = 404;
    throw error;
  }
  return actuacion;
}

// ------------------------------------------------------------
// Editar actuación
// Si esta actuación ya generó uno o más PlazoJudicial, se
// bloquea el cambio de 'fecha' y 'fechaNotificacion' (tocarlas
// desincronizaría el vencimiento ya calculado a partir de ellas).
// El resto de los campos (tipo, descripcion, parteProcesalId)
// se puede seguir editando libremente.
// ------------------------------------------------------------
async function actualizarActuacion(id, datos) {
  const actuacionExistente = await obtenerPorId(id); // valida existencia (tira 404 si no está)

  const { parteProcesalId, tipo, fecha, descripcion, fechaNotificacion } = datos;

  // Si se intenta cambiar fecha o fechaNotificacion, verificar
  // primero que no haya un plazo ya generado desde esta actuación.
  const intentaCambiarFechas =
    (fecha && new Date(fecha).getTime() !== new Date(actuacionExistente.fecha).getTime()) ||
    (fechaNotificacion &&
      new Date(fechaNotificacion).getTime() !==
        new Date(actuacionExistente.fechaNotificacion ?? 0).getTime());

  if (intentaCambiarFechas) {
    const cantidadPlazos = await prisma.plazoJudicial.count({
      where: { actuacionId: id },
    });
    if (cantidadPlazos > 0) {
      const error = new Error(
        'Esta actuación ya generó un plazo judicial: no se puede modificar su fecha ni fecha de notificación.'
      );
      error.status = 400;
      throw error;
    }
  }

  // Misma validación que en la creación, solo si se está enviando
  // una fecha nueva (en edición parcial puede no venir).
  if (fecha) {
    validarFechaNoFutura(fecha, 'La fecha de la actuación');
  }
  if (fechaNotificacion) {
    validarFechaNoFutura(fechaNotificacion, 'La fecha de notificación');
  }

  // Si se cambia la parte procesal, re-validar que sea del mismo expediente
  // (el expediente de una actuación no se cambia, se usa el que ya tiene)
  if (parteProcesalId) {
    const parte = await prisma.parteProcesal.findUnique({
      where: { id: parteProcesalId },
    });
    if (!parte || parte.expedienteId !== actuacionExistente.expedienteId) {
      const error = new Error('La parte procesal indicada no corresponde a este expediente.');
      error.status = 400;
      throw error;
    }
  }

  return prisma.actuacion.update({
    where: { id },
    data: {
      parteProcesalId: parteProcesalId ?? null,
      tipo,
      fecha: fecha ? new Date(fecha) : undefined,
      descripcion,
      fechaNotificacion: fechaNotificacion ? new Date(fechaNotificacion) : null,
    },
  });
}

// ------------------------------------------------------------
// Eliminar actuación
// Hard-delete real (no soft-delete): cargarla mal es un error de
// tipeo, no un hecho procesal a conservar (mismo criterio que
// ParteProcesal en Módulo 1).
// Si ya generó un PlazoJudicial, se bloquea el borrado por
// completo: aunque la FK usa onDelete: SetNull (no rompería la
// base), se perdería la trazabilidad de qué actuación originó
// ese plazo — se pide anular/corregir el plazo primero.
// ------------------------------------------------------------
async function eliminarActuacion(id) {
  await obtenerPorId(id); // valida existencia (tira 404 si no está)

  const cantidadPlazos = await prisma.plazoJudicial.count({
    where: { actuacionId: id },
  });
  if (cantidadPlazos > 0) {
    const error = new Error(
      'No se puede eliminar esta actuación: ya generó un plazo judicial asociado.'
    );
    error.status = 400;
    throw error;
  }

  await prisma.actuacion.delete({ where: { id } });
}

module.exports = {
  crearActuacion,
  listarPorExpediente,
  obtenerPorId,
  actualizarActuacion,
  eliminarActuacion,
};