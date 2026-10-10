// ============================================================
// CONTROLLER: DiaNoHabil
// req.usuario.id viene de verificarToken y se pasa al service
// en cada operación que escribe, para la auditoría.
// ============================================================

const diaNoHabilService = require('./dia-no-habil.service');

// POST /api/dias-no-habiles
async function crear(req, res, next) {
  try {
    const { fechaDesde, fechaHasta, descripcion } = req.body;

    if (!fechaDesde || !descripcion) {
      return res.status(400).json({ error: 'fechaDesde y descripcion son obligatorios.' });
    }

    const diaNoHabil = await diaNoHabilService.crear(
      { fechaDesde, fechaHasta, descripcion },
      req.usuario.id // auditoría
    );
    return res.status(201).json(diaNoHabil);
  } catch (error) {
    return next(error);
  }
}

// GET /api/dias-no-habiles
async function listar(req, res, next) {
  try {
    const dias = await diaNoHabilService.listar();
    return res.json(dias);
  } catch (error) {
    return next(error);
  }
}

// GET /api/dias-no-habiles/:id
async function obtener(req, res, next) {
  try {
    const id = Number(req.params.id);
    const diaNoHabil = await diaNoHabilService.obtenerPorId(id);
    return res.json(diaNoHabil);
  } catch (error) {
    return next(error);
  }
}

// PUT /api/dias-no-habiles/:id
async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { fechaDesde, fechaHasta, descripcion } = req.body;

    const diaNoHabil = await diaNoHabilService.actualizar(
      id,
      { fechaDesde, fechaHasta, descripcion },
      req.usuario.id // auditoría
    );

    return res.json(diaNoHabil);
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/dias-no-habiles/:id
async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await diaNoHabilService.eliminar(id, req.usuario.id); // auditoría
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  crear,
  listar,
  obtener,
  actualizar,
  eliminar,
};