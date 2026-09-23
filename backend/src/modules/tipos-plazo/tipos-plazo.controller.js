// ============================================================
// CONTROLLER: TipoPlazo
// ============================================================

const tipoPlazoService = require('./tipos-plazo.service');

// POST /api/tipos-plazo
async function crear(req, res, next) {
  try {
    const { nombre, fuero, diasDefault, modalidadDefault } = req.body;

    if (!nombre || !diasDefault) {
      return res.status(400).json({ error: 'nombre y diasDefault son obligatorios.' });
    }

    const tipoPlazo = await tipoPlazoService.crear({
      nombre,
      fuero,
      diasDefault: Number(diasDefault),
      modalidadDefault,
    });

    return res.status(201).json(tipoPlazo);
  } catch (error) {
    return next(error);
  }
}

// GET /api/tipos-plazo?incluirInactivos=true
async function listar(req, res, next) {
  try {
    const incluirInactivos = req.query.incluirInactivos === 'true';
    const tipos = await tipoPlazoService.listar({ incluirInactivos });
    return res.json(tipos);
  } catch (error) {
    return next(error);
  }
}

// GET /api/tipos-plazo/:id
async function obtener(req, res, next) {
  try {
    const id = Number(req.params.id);
    const tipoPlazo = await tipoPlazoService.obtenerPorId(id);
    return res.json(tipoPlazo);
  } catch (error) {
    return next(error);
  }
}

// PUT /api/tipos-plazo/:id
async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { nombre, fuero, diasDefault, modalidadDefault } = req.body;

    const tipoPlazo = await tipoPlazoService.actualizar(id, {
      nombre,
      fuero,
      diasDefault: diasDefault ? Number(diasDefault) : undefined,
      modalidadDefault,
    });

    return res.json(tipoPlazo);
  } catch (error) {
    return next(error);
  }
}

// PATCH /api/tipos-plazo/:id/activo  body: { activo: true|false }
async function cambiarActivo(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { activo } = req.body;
    const tipoPlazo = await tipoPlazoService.cambiarActivo(id, Boolean(activo));
    return res.json(tipoPlazo);
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/tipos-plazo/:id
async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await tipoPlazoService.eliminar(id);
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
  cambiarActivo,
  eliminar,
};