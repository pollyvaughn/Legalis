// ============================================================
// TIPOS-TRAMITE CONTROLLER — Módulo 1.3
// Recibe req/res, valida la entrada y delega en el service.
// ============================================================
const service = require('./tipos-tramite.service');
const { ErrorNegocio } = require('../../utils/errores');

// ------------------------------------------------------------
// HELPER: validar
// Devuelve un string con el error, o null si todo está bien.
// esCreacion = true exige el nombre.
// ------------------------------------------------------------
const validar = (body, esCreacion) => {
  if (esCreacion || body.nombre !== undefined) {
    if (typeof body.nombre !== 'string' || !body.nombre.trim()) return 'El nombre es obligatorio';
    if (body.nombre.trim().length > 120) return 'El nombre no puede superar 120 caracteres';
  }
  if (body.descripcion && body.descripcion.length > 300) return 'La descripción no puede superar 300 caracteres';
  if (body.activo !== undefined && typeof body.activo !== 'boolean') return 'activo debe ser true o false';
  return null;
};

// ------------------------------------------------------------
// HELPER: responderError
// Un solo lugar para traducir errores a respuestas HTTP:
//  - ErrorNegocio -> su propio código (409, 400...)
//  - P2025 (Prisma: registro no encontrado) -> 404
//  - cualquier otro -> 500
// ------------------------------------------------------------
const responderError = (res, error, mensajeGenerico) => {
  if (error instanceof ErrorNegocio) return res.status(error.status).json({ error: error.message });
  if (error.code === 'P2025') return res.status(404).json({ error: 'Trámite no encontrado en el catálogo' });
  console.error(mensajeGenerico, error);
  return res.status(500).json({ error: mensajeGenerico });
};

// GET /api/tipos-tramite?estado=activos|inactivos|todos&busqueda=...
const listar = async (req, res) => {
  try {
    const { estado, busqueda } = req.query;
    res.json(await service.listarTipos({ estado, busqueda }));
  } catch (error) {
    responderError(res, error, 'Error al listar el catálogo de trámites');
  }
};

// GET /api/tipos-tramite/opciones  (solo activos, para selects)
const opciones = async (req, res) => {
  try {
    res.json(await service.listarOpciones());
  } catch (error) {
    responderError(res, error, 'Error al obtener las opciones de trámites');
  }
};

// GET /api/tipos-tramite/:id
const obtener = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const tipo = await service.obtenerTipoPorId(id);
    if (!tipo) return res.status(404).json({ error: 'Trámite no encontrado en el catálogo' });
    res.json(tipo);
  } catch (error) {
    responderError(res, error, 'Error al obtener el trámite');
  }
};

// POST /api/tipos-tramite
const crear = async (req, res) => {
  try {
    const errorValidacion = validar(req.body, true);
    if (errorValidacion) return res.status(400).json({ error: errorValidacion });

    res.status(201).json(await service.crearTipo(req.body));
  } catch (error) {
    responderError(res, error, 'Error al crear el trámite');
  }
};

// PUT /api/tipos-tramite/:id  (parcial: nombre, descripcion, activo)
const actualizar = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const errorValidacion = validar(req.body, false);
    if (errorValidacion) return res.status(400).json({ error: errorValidacion });

    res.json(await service.actualizarTipo(id, req.body));
  } catch (error) {
    responderError(res, error, 'Error al actualizar el trámite');
  }
};

// DELETE /api/tipos-tramite/:id  (solo si nunca se usó)
const eliminar = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    await service.eliminarTipo(id);
    res.json({ mensaje: 'Trámite eliminado del catálogo' });
  } catch (error) {
    responderError(res, error, 'Error al eliminar el trámite');
  }
};

module.exports = { listar, opciones, obtener, crear, actualizar, eliminar };