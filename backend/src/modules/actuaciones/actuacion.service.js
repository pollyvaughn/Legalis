// ============================================================
// ACTUACION.SERVICE.JS
// Capa de acceso a datos + reglas de negocio del Módulo 2 (RF5).
// No conoce Express (req/res): recibe datos ya validados desde
// el controller y devuelve objetos planos o lanza errores con
// un campo .status para que el manejador global de errores
// responda con el código HTTP correcto.
//
// REGLA DE ELIMINACIÓN/EDICIÓN CON PLAZOS ASOCIADOS (acordada con
// Yael el 05/10/2026, reemplaza el bloqueo total anterior):
//   - Eliminar: si TODOS los plazos de la actuación están
//     PENDIENTE, se permite, mostrando antes el impacto (cuáles se
//     borran en cascada). Si HAY alguno CUMPLIDO, se bloquea
//     entero (un plazo cumplido es un hecho histórico).
//   - Editar fecha/fechaNotificacion: igual criterio. Si todos los
//     plazos asociados están PENDIENTE, se permite el cambio Y se
//     recalcula fechaVencimiento de cada uno (mismo cálculo que
//     calcularSugerencia). Si hay alguno CUMPLIDO, se bloquea.
// ============================================================

const prisma = require('../../config/database');
const { calcularFechaVencimiento } = require('../../utils/calendarioPlazos');
const { registrarAuditoria } = require('../../utils/auditoria');

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
// Helper interno: trae los DiaNoHabil vigentes para el cálculo,
// igual criterio que calcularSugerencia en plazo.service.js
// (solo se usa si modalidad === 'HABILES').
// ------------------------------------------------------------
async function obtenerDiasNoHabiles(tx) {
  return tx.diaNoHabil.findMany({
    select: { fechaDesde: true, fechaHasta: true },
  });
}

// ------------------------------------------------------------
// Crear actuación
// Requiere: expedienteId, tipo, fecha, descripcion.
// Opcionales: parteProcesalId, fechaNotificacion.
// ------------------------------------------------------------
async function crearActuacion(datos, usuarioId) {
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

  return prisma.$transaction(async (tx) => {
    const actuacion = await tx.actuacion.create({
      data: {
        expedienteId,
        parteProcesalId: parteProcesalId ?? null,
        tipo,
        fecha: new Date(fecha),
        descripcion,
        fechaNotificacion: fechaNotificacion ? new Date(fechaNotificacion) : null,
      },
    });

    await registrarAuditoria(tx, {
      usuarioId,
      accion: 'CREAR',
      entidad: 'Actuacion',
      entidadId: actuacion.id,
      detalle: `Actuación ${tipo} registrada en expediente ${expedienteId}`,
    });

    return actuacion;
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
// Helper interno: trae los plazos asociados a una actuación, con
// los campos que hacen falta para decidir impacto y recalcular.
// ------------------------------------------------------------
async function obtenerPlazosDeActuacion(actuacionId, client = prisma) {
  return client.plazoJudicial.findMany({
    where: { actuacionId },
    include: { tipoPlazo: { select: { nombre: true } } },
  });
}

// ------------------------------------------------------------
// Helper interno: separa los plazos en pendientes/cumplidos y
// arma el motivo de bloqueo si corresponde. Se reutiliza tanto
// para eliminar como para editar fecha/fechaNotificacion, porque
// ambas operaciones comparten el mismo criterio (bloquear solo si
// hay algún CUMPLIDO).
// ------------------------------------------------------------
function separarPorEstado(plazos) {
  const pendientes = plazos.filter((p) => p.estado === 'PENDIENTE');
  const cumplidos = plazos.filter((p) => p.estado === 'CUMPLIDO');
  return { pendientes, cumplidos };
}

// ------------------------------------------------------------
// IMPACTO DE ELIMINACIÓN (nuevo, RN pendiente de numerar)
// Endpoint de consulta previo al DELETE: le dice al frontend si
// la eliminación es posible y, si lo es, qué plazos se van a
// borrar en cascada — para armar el mensaje de confirmación con
// la abogada ANTES de ejecutar nada. No modifica datos.
// ------------------------------------------------------------
async function obtenerImpactoEliminacion(id) {
  await obtenerPorId(id); // valida existencia (404 si no está)

  const plazos = await obtenerPlazosDeActuacion(id);
  const { pendientes, cumplidos } = separarPorEstado(plazos);

  if (cumplidos.length > 0) {
    return {
      puedeEliminar: false,
      motivo:
        'Esta actuación tiene al menos un plazo ya marcado como cumplido, que es un hecho histórico. No se puede eliminar.',
      plazosPendientes: [],
      plazosCumplidos: cumplidos.map((p) => ({ id: p.id, tipoPlazo: p.tipoPlazo?.nombre })),
    };
  }

  return {
    puedeEliminar: true,
    motivo: null,
    plazosPendientes: pendientes.map((p) => ({ id: p.id, tipoPlazo: p.tipoPlazo?.nombre })),
    plazosCumplidos: [],
  };
}

// ------------------------------------------------------------
// Editar actuación
// Si cambia fecha o fechaNotificacion y hay plazos asociados:
//   - si hay algún CUMPLIDO, se bloquea el cambio por completo.
//   - si todos están PENDIENTE, se permite y se recalcula
//     fechaVencimiento de cada uno (mismo criterio que
//     calcularSugerencia en plazo.service.js).
// El resto de los campos (tipo, descripcion, parteProcesalId) se
// puede seguir editando libremente, sin tocar ningún plazo.
// ------------------------------------------------------------
async function actualizarActuacion(id, datos, usuarioId) {
  const actuacionExistente = await obtenerPorId(id); // valida existencia (tira 404 si no está)

  const { parteProcesalId, tipo, fecha, descripcion, fechaNotificacion } = datos;

  const intentaCambiarFechas =
    (fecha && new Date(fecha).getTime() !== new Date(actuacionExistente.fecha).getTime()) ||
    (fechaNotificacion &&
      new Date(fechaNotificacion).getTime() !==
        new Date(actuacionExistente.fechaNotificacion ?? 0).getTime());

  // Misma validación de siempre, solo si se está enviando una fecha nueva.
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

  // Caso simple: no toca fechas (o no hay plazos asociados todavía) →
  // UPDATE directo, sin transacción especial ni recálculo.
  if (!intentaCambiarFechas) {
    return prisma.$transaction(async (tx) => {
      const actuacion = await tx.actuacion.update({
        where: { id },
        data: {
          parteProcesalId: parteProcesalId ?? null,
          tipo,
          descripcion,
        },
      });

      await registrarAuditoria(tx, {
        usuarioId,
        accion: 'EDITAR',
        entidad: 'Actuacion',
        entidadId: id,
        detalle: `Actuación ${id} editada (sin cambio de fechas)`,
      });

      return actuacion;
    });
  }

  // Caso con cambio de fecha: hay que revisar los plazos asociados.
  const plazos = await obtenerPlazosDeActuacion(id);
  const { pendientes, cumplidos } = separarPorEstado(plazos);

  if (cumplidos.length > 0) {
    const error = new Error(
      'Esta actuación tiene un plazo ya cumplido: no se puede modificar su fecha ni fecha de notificación.'
    );
    error.status = 400;
    throw error;
  }

  const nuevaFechaNotificacion = fechaNotificacion
    ? new Date(fechaNotificacion)
    : actuacionExistente.fechaNotificacion;

  return prisma.$transaction(async (tx) => {
    const actuacion = await tx.actuacion.update({
      where: { id },
      data: {
        parteProcesalId: parteProcesalId ?? null,
        tipo,
        fecha: fecha ? new Date(fecha) : undefined,
        descripcion,
        fechaNotificacion: fechaNotificacion ? new Date(fechaNotificacion) : null,
      },
    });

    await registrarAuditoria(tx, {
      usuarioId,
      accion: 'EDITAR',
      entidad: 'Actuacion',
      entidadId: id,
      detalle: `Actuación ${id} editada (fecha/notificación modificada)`,
    });

    // Recalcula cada plazo PENDIENTE asociado, con la nueva
    // fechaNotificacion. Si no hay fechaNotificacion (nunca la
    // tuvo), no hay nada que recalcular — no debería pasar en la
    // práctica, porque un plazo exige fechaNotificacion para
    // existir, pero se cubre por las dudas.
    const plazosRecalculados = [];
    if (nuevaFechaNotificacion) {
      for (const plazo of pendientes) {
        // modalidad HORAS no se recalcula: la hora límite se
        // cargó a mano y no depende de este cálculo.
        if (plazo.modalidad === 'HORAS') continue;

        const diasNoHabiles =
          plazo.modalidad === 'HABILES' ? await obtenerDiasNoHabiles(tx) : [];

        const fechaVencimiento = calcularFechaVencimiento({
          fechaNotificacion: nuevaFechaNotificacion,
          diasCantidad: plazo.diasCantidad,
          modalidad: plazo.modalidad,
          diasNoHabiles,
        });

        const plazoActualizado = await tx.plazoJudicial.update({
          where: { id: plazo.id },
          data: { fechaNotificacion: nuevaFechaNotificacion, fechaVencimiento },
        });

        await registrarAuditoria(tx, {
          usuarioId,
          accion: 'EDITAR',
          entidad: 'PlazoJudicial',
          entidadId: plazo.id,
          detalle: `Vencimiento recalculado por cambio de fecha en actuación ${id}`,
        });

        plazosRecalculados.push(plazoActualizado);
      }
    }

    return { ...actuacion, plazosRecalculados };
  });
}

// ------------------------------------------------------------
// Eliminar actuación
// Hard-delete real (no soft-delete): cargarla mal es un error de
// tipeo, no un hecho procesal a conservar (mismo criterio que
// ParteProcesal en Módulo 1).
//
// Si tiene plazos asociados:
//   - si HAY alguno CUMPLIDO, se bloquea entero.
//   - si TODOS están PENDIENTE, se borra la actuación Y esos
//     plazos en cascada (el frontend ya mostró el impacto antes,
//     vía obtenerImpactoEliminacion, así que acá se ejecuta
//     directo sin volver a preguntar).
// ------------------------------------------------------------
async function eliminarActuacion(id, usuarioId) {
  const actuacionExistente = await obtenerPorId(id); // valida existencia (tira 404 si no está)

  const plazos = await obtenerPlazosDeActuacion(id);
  const { pendientes, cumplidos } = separarPorEstado(plazos);

  if (cumplidos.length > 0) {
    const error = new Error(
      'No se puede eliminar esta actuación: tiene al menos un plazo ya cumplido.'
    );
    error.status = 400;
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    // Auditar cada plazo en cascada ANTES de borrarlo (una vez
    // eliminado, ya no se puede volver a leer para describirlo).
    for (const plazo of pendientes) {
      await registrarAuditoria(tx, {
        usuarioId,
        accion: 'ELIMINAR',
        entidad: 'PlazoJudicial',
        entidadId: plazo.id,
        detalle: `Eliminado en cascada al borrar la actuación ${id}`,
      });
    }

    // Prisma no borra en cascada por FK acá (la relación no tiene
    // onDelete: Cascade), así que se borran los plazos a mano
    // antes de borrar la actuación.
    await tx.plazoJudicial.deleteMany({ where: { actuacionId: id } });

    await tx.actuacion.delete({ where: { id } });

    await registrarAuditoria(tx, {
      usuarioId,
      accion: 'ELIMINAR',
      entidad: 'Actuacion',
      entidadId: id,
      detalle: `Actuación ${actuacionExistente.tipo} eliminada (expediente ${actuacionExistente.expedienteId})${
        pendientes.length > 0 ? `, junto con ${pendientes.length} plazo(s) pendiente(s)` : ''
      }`,
    });
  });
}

module.exports = {
  crearActuacion,
  listarPorExpediente,
  obtenerPorId,
  obtenerImpactoEliminacion,
  actualizarActuacion,
  eliminarActuacion,
};