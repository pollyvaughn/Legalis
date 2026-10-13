// ============================================================
// GASTOS CONTROLLER — Módulo 3 (RF8 / CU-23)
// Recibe req/res, valida la forma de la entrada y delega en el service.
// Las reglas de negocio (monto > 0, tope, fecha no futura, estados)
// las valida gastos.service.js y llegan como ErrorNegocio.
// ============================================================
const service = require('./gastos.service');
const { responderError } = require('../../utils/errores');
const { siVino, entero, parsearFecha } = require('../../utils/entrada');

const NO_ENCONTRADO = 'Gasto no encontrado';

// ------------------------------------------------------------
// HELPER: leerCampos
// Devuelve { error } o { datos }. esCreacion = true exige concepto,
// fecha y monto; en edición (PUT parcial) solo se leen los que vienen.
// ------------------------------------------------------------
const leerCampos = (body, esCreacion) => {
  const datos = {};

  // Concepto: obligatorio, hasta 200 caracteres
  if (esCreacion || siVino(body, 'concepto')) {
    if (typeof body.concepto !== 'string' || !body.concepto.trim()) {
      return { error: 'El concepto es obligatorio' };
    }
    if (body.concepto.trim().length > 200) return { error: 'El concepto no puede superar 200 caracteres' };
    datos.concepto = body.concepto;
  }

  // Fecha: AAAA-MM-DD válida (que no sea futura lo controla el service)
  if (esCreacion || siVino(body, 'fecha')) {
    const fecha = parsearFecha(body.fecha);
    if (!fecha) return { error: 'La fecha es obligatoria y debe tener formato AAAA-MM-DD' };
    datos.fecha = fecha;
  }

  // Monto: se pasa tal cual al service, que lo valida
  if (esCreacion || siVino(body, 'monto')) {
    datos.monto = body.monto;
  }

  // Comprobante: opcional, hasta 100 caracteres
  if (siVino(body, 'comprobante')) {
    if (body.comprobante !== null && typeof body.comprobante !== 'string') {
      return { error: 'El comprobante debe ser texto' };
    }
    if (body.comprobante && body.comprobante.trim().length > 100) {
      return { error: 'El comprobante no puede superar 100 caracteres' };
    }
    datos.comprobante = body.comprobante;
  }

  return { datos };
};

const idDeUrl = (valor) => {
  const id = entero(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// ---------- Helpers internos: listar y crear para cualquier "padre" ----------
const listarDe = async (res, padre) => {
  try {
    res.json(await service.listarGastos(padre));
  } catch (err) {
    responderError(res, err, 'Error al listar los gastos', NO_ENCONTRADO);
  }
};

const crearEn = async (req, res, padre) => {
  try {
    const { error, datos } = leerCampos(req.body, true);
    if (error) return res.status(400).json({ error });
    res.status(201).json(await service.crearGasto(padre, datos, req.usuario.id));
  } catch (err) {
    responderError(res, err, 'Error al registrar el gasto', NO_ENCONTRADO);
  }
};

// ---------- De un EXPEDIENTE ----------
const listarDeExpediente = (req, res) => {
  const expedienteId = idDeUrl(req.params.expedienteId);
  if (!expedienteId) return res.status(400).json({ error: 'ID de expediente inválido' });
  return listarDe(res, { expedienteId });
};
const crearEnExpediente = (req, res) => {
  const expedienteId = idDeUrl(req.params.expedienteId);
  if (!expedienteId) return res.status(400).json({ error: 'ID de expediente inválido' });
  return crearEn(req, res, { expedienteId });
};

// ---------- De un TRÁMITE ----------
const listarDeTramite = (req, res) => {
  const tramiteId = idDeUrl(req.params.tramiteId);
  if (!tramiteId) return res.status(400).json({ error: 'ID de trámite inválido' });
  return listarDe(res, { tramiteId });
};
const crearEnTramite = (req, res) => {
  const tramiteId = idDeUrl(req.params.tramiteId);
  if (!tramiteId) return res.status(400).json({ error: 'ID de trámite inválido' });
  return crearEn(req, res, { tramiteId });
};

// ---------- Por id de gasto ----------
// GET /api/gastos/:id
const obtener = async (req, res) => {
  try {
    const id = idDeUrl(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });
    res.json(await service.obtenerGasto(id));
  } catch (err) {
    responderError(res, err, 'Error al obtener el gasto', NO_ENCONTRADO);
  }
};

// PUT /api/gastos/:id  (parcial; solo si está PENDIENTE)
const actualizar = async (req, res) => {
  try {
    const id = idDeUrl(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const { error, datos } = leerCampos(req.body, false);
    if (error) return res.status(400).json({ error });
    if (Object.keys(datos).length === 0) return res.status(400).json({ error: 'No hay nada para actualizar' });

    res.json(await service.actualizarGasto(id, datos, req.usuario.id));
  } catch (err) {
    responderError(res, err, 'Error al actualizar el gasto', NO_ENCONTRADO);
  }
};

// POST /api/gastos/:id/anular  (no borra: pasa a ANULADO)
const anular = async (req, res) => {
  try {
    const id = idDeUrl(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });
    res.json(await service.anularGasto(id, req.usuario.id));
  } catch (err) {
    responderError(res, err, 'Error al anular el gasto', NO_ENCONTRADO);
  }
};

module.exports = {
  listarDeExpediente,
  crearEnExpediente,
  listarDeTramite,
  crearEnTramite,
  obtener,
  actualizar,
  anular,
};