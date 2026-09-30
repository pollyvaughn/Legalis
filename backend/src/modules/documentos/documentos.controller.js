// ============================================================
// DOCUMENTOS CONTROLLER — Módulo 1.3
// Recibe req/res, valida la entrada y delega en el service.
// Los handlers de trámite y expediente hacen lo mismo con distinto
// "padre": por eso comparten funciones internas.
// ============================================================
const service = require('./documentos.service');
const { responderError } = require('../../utils/errores');
const { siVino, entero, parsearFecha } = require('../../utils/entrada');
const { fechaDeHoy } = require('../../utils/calendarioRuc'); // el día de hoy en UTC

const NO_ENCONTRADO = 'Documento no encontrado';

// ------------------------------------------------------------
// HELPER: leerCampos
// Valida el body y devuelve { error } o { datos } (con la fecha ya
// convertida a Date). esCreacion = true exige tipo y fecha.
// ------------------------------------------------------------
const leerCampos = (body, esCreacion) => {
  const datos = {};

  if (esCreacion || siVino(body, 'tipoDocumento')) {
    if (typeof body.tipoDocumento !== 'string' || !body.tipoDocumento.trim()) {
      return { error: 'El tipo de documento es obligatorio' };
    }
    if (body.tipoDocumento.trim().length > 150) {
      return { error: 'El tipo de documento no puede superar 150 caracteres' };
    }
    datos.tipoDocumento = body.tipoDocumento;
  }

  if (esCreacion || siVino(body, 'fechaRecepcion')) {
    const fecha = parsearFecha(body.fechaRecepcion);
    if (!fecha) return { error: 'La fecha de recepción es obligatoria (formato AAAA-MM-DD)' };
    // Regla: no se puede registrar la recepción de algo que todavía no llegó
    if (fecha > fechaDeHoy()) return { error: 'La fecha de recepción no puede ser futura' };
    datos.fechaRecepcion = fecha;
  }

  if (siVino(body, 'observaciones')) {
    if (body.observaciones && body.observaciones.length > 500) {
      return { error: 'Las observaciones no pueden superar 500 caracteres' };
    }
    datos.observaciones = body.observaciones;
  }

  return { datos };
};

// ------------------------------------------------------------
// HELPERS internos: listar y crear para cualquier "padre"
// (padre = { tramiteId } o { expedienteId })
// ------------------------------------------------------------
const listarDe = async (res, padre) => {
  try {
    res.json(await service.listarDocumentos(padre));
  } catch (error) {
    responderError(res, error, 'Error al listar los documentos', NO_ENCONTRADO);
  }
};

const crearEn = async (req, res, padre) => {
  try {
    const { error, datos } = leerCampos(req.body, true);
    if (error) return res.status(400).json({ error });

    res.status(201).json(await service.crearDocumento(padre, datos, req.usuario.id));
  } catch (err) {
    responderError(res, err, 'Error al registrar el documento', NO_ENCONTRADO);
  }
};

// Lee el id del trámite/expediente de la URL; devuelve null si es inválido
const idDeUrl = (valor) => {
  const id = entero(valor);
  return Number.isInteger(id) ? id : null;
};

// ---------- Documentos de un TRÁMITE ----------
// GET  /api/tramites/:tramiteId/documentos
const listarDeTramite = async (req, res) => {
  const tramiteId = idDeUrl(req.params.tramiteId);
  if (!tramiteId) return res.status(400).json({ error: 'ID de trámite inválido' });
  return listarDe(res, { tramiteId });
};

// POST /api/tramites/:tramiteId/documentos
const crearEnTramite = async (req, res) => {
  const tramiteId = idDeUrl(req.params.tramiteId);
  if (!tramiteId) return res.status(400).json({ error: 'ID de trámite inválido' });
  return crearEn(req, res, { tramiteId });
};

// ---------- Documentos de un EXPEDIENTE ----------
// GET  /api/expedientes/:expedienteId/documentos
const listarDeExpediente = async (req, res) => {
  const expedienteId = idDeUrl(req.params.expedienteId);
  if (!expedienteId) return res.status(400).json({ error: 'ID de expediente inválido' });
  return listarDe(res, { expedienteId });
};

// POST /api/expedientes/:expedienteId/documentos
const crearEnExpediente = async (req, res) => {
  const expedienteId = idDeUrl(req.params.expedienteId);
  if (!expedienteId) return res.status(400).json({ error: 'ID de expediente inválido' });
  return crearEn(req, res, { expedienteId });
};

// ---------- Operaciones por id de documento ----------
// PUT /api/documentos/:id   body (parcial): { tipoDocumento?, fechaRecepcion?, observaciones? }
const actualizar = async (req, res) => {
  try {
    const id = idDeUrl(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const { error, datos } = leerCampos(req.body, false);
    if (error) return res.status(400).json({ error });
    if (Object.keys(datos).length === 0) {
      return res.status(400).json({ error: 'No hay nada para actualizar (tipoDocumento, fechaRecepcion u observaciones)' });
    }

    res.json(await service.actualizarDocumento(id, datos, req.usuario.id));
  } catch (err) {
    responderError(res, err, 'Error al actualizar el documento', NO_ENCONTRADO);
  }
};

// DELETE /api/documentos/:id
const eliminar = async (req, res) => {
  try {
    const id = idDeUrl(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    await service.eliminarDocumento(id, req.usuario.id);
    res.json({ mensaje: 'Documento eliminado' });
  } catch (err) {
    responderError(res, err, 'Error al eliminar el documento', NO_ENCONTRADO);
  }
};

module.exports = {
  listarDeTramite,
  crearEnTramite,
  listarDeExpediente,
  crearEnExpediente,
  actualizar,
  eliminar,
};