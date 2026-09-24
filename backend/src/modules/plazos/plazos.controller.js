// ============================================================
// CONTROLLER: PlazoJudicial
// Traduce req/res de Express hacia/desde el service. No contiene
// lógica de negocio — solo parseo de params/query/body y manejo
// de errores.
// ============================================================

const plazoService = require('./plazos.service');

// GET /api/expedientes/:expedienteId/plazos/calcular
// Solo calcula y devuelve la sugerencia — NO guarda nada.
// Query params: fechaNotificacion, diasCantidad, modalidad.
async function calcular(req, res, next) {
  try {
    const expedienteId = Number(req.params.expedienteId);
    const { fechaNotificacion, diasCantidad, modalidad } = req.query;

    if (!fechaNotificacion || !diasCantidad || !modalidad) {
      return res.status(400).json({
        error: 'fechaNotificacion, diasCantidad y modalidad son obligatorios.',
      });
    }

    const sugerencia = await plazoService.calcularSugerencia(expedienteId, {
      fechaNotificacion,
      diasCantidad: Number(diasCantidad),
      modalidad,
    });

    return res.json(sugerencia);
  } catch (error) {
    return next(error);
  }
}

// POST /api/expedientes/:expedienteId/plazos
async function crear(req, res, next) {
  try {
    const expedienteId = Number(req.params.expedienteId);
    const {
      actuacionId,
      tipoPlazoId,
      diasCantidad,
      modalidad,
      fechaNotificacion,
      fechaVencimiento,
      horaLimite,
      observaciones,
    } = req.body;

    if (!tipoPlazoId || !diasCantidad || !modalidad || !fechaNotificacion) {
      return res.status(400).json({
        error: 'tipoPlazoId, diasCantidad, modalidad y fechaNotificacion son obligatorios.',
      });
    }

    const plazo = await plazoService.crearPlazo(expedienteId, {
      actuacionId: actuacionId ? Number(actuacionId) : null,
      tipoPlazoId: Number(tipoPlazoId),
      diasCantidad: Number(diasCantidad),
      modalidad,
      fechaNotificacion,
      fechaVencimiento,
      horaLimite,
      observaciones,
    });

    return res.status(201).json(plazo);
  } catch (error) {
    return next(error);
  }
}

// GET /api/expedientes/:expedienteId/plazos
async function listarPorExpediente(req, res, next) {
  try {
    const expedienteId = Number(req.params.expedienteId);
    const plazos = await plazoService.listarPorExpediente(expedienteId);
    return res.json(plazos);
  } catch (error) {
    return next(error);
  }
}

// GET /api/plazos?incluirCumplidos=true
// Panel de alertas / dashboard: por defecto solo pendientes,
// ordenados por urgencia (vencido > rojo > amarillo > verde).
// Con incluirCumplidos=true trae también los ya resueltos, para
// la vista "Calendario & Plazos" (historial completo).
async function listarPendientesGlobal(req, res, next) {
  try {
    const incluirCumplidos = req.query.incluirCumplidos === 'true';
    const plazos = await plazoService.listarPendientesGlobal({ incluirCumplidos });
    return res.json(plazos);
  } catch (error) {
    return next(error);
  }
}

// GET /api/plazos/:id
async function obtener(req, res, next) {
  try {
    const id = Number(req.params.id);
    const plazo = await plazoService.obtenerPorId(id);
    return res.json(plazo);
  } catch (error) {
    return next(error);
  }
}

// PUT /api/plazos/:id
async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const {
      tipoPlazoId,
      diasCantidad,
      modalidad,
      fechaNotificacion,
      fechaVencimiento,
      horaLimite,
      observaciones,
    } = req.body;

    const plazo = await plazoService.actualizarPlazo(id, {
      tipoPlazoId: tipoPlazoId ? Number(tipoPlazoId) : undefined,
      diasCantidad: diasCantidad ? Number(diasCantidad) : undefined,
      modalidad,
      fechaNotificacion,
      fechaVencimiento,
      horaLimite,
      observaciones,
    });

    return res.json(plazo);
  } catch (error) {
    return next(error);
  }
}

// PATCH /api/plazos/:id/cumplido
async function marcarCumplido(req, res, next) {
  try {
    const id = Number(req.params.id);
    const plazo = await plazoService.marcarCumplido(id);
    return res.json(plazo);
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/plazos/:id
async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await plazoService.eliminarPlazo(id);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  calcular,
  crear,
  listarPorExpediente,
  listarPendientesGlobal,
  obtener,
  actualizar,
  marcarCumplido,
  eliminar,
};