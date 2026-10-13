// ============================================================
// LIQUIDACIONES CONTROLLER — Módulo 3 (RF7 / CU-22)
// Recibe req/res, valida la forma de la entrada y delega en el service.
// Las reglas de los números (> 0, 2 decimales, máx. 100%) las valida
// utils/calculoHonorarios.js y llegan como ErrorNegocio (400).
// ============================================================
const service = require('./liquidaciones.service');
const { responderError } = require('../../utils/errores');
const { siVino, entero } = require('../../utils/entrada');
const { METODOS, TASAS_IVA } = require('../../utils/calculoHonorarios');

const NO_ENCONTRADO = 'Liquidación no encontrada';

// Campos numéricos de entrada (se pasan tal cual al cálculo, que los valida)
const CAMPOS_NUMERICOS = ['montoBase', 'porcentaje', 'cantidadJornales', 'valorJornal', 'montoFijo'];

// ------------------------------------------------------------
// HELPER: leerCampos
// Devuelve { error } o { datos }. esCreacion = true exige metodo y
// tasaIva; exigirConcepto = true exige concepto en MONTO_FIJO.
// ------------------------------------------------------------
const leerCampos = (body, esCreacion, exigirConcepto = esCreacion) => {
  const datos = {};

  if (esCreacion || siVino(body, 'metodo')) {
    if (!METODOS.includes(body.metodo)) return { error: `Método inválido. Valores permitidos: ${METODOS.join(', ')}` };
    datos.metodo = body.metodo;
  }

  if (esCreacion || siVino(body, 'tasaIva')) {
    if (!Object.prototype.hasOwnProperty.call(TASAS_IVA, body.tasaIva)) {
      return { error: `Tasa de IVA inválida. Valores permitidos: ${Object.keys(TASAS_IVA).join(', ')}` };
    }
    datos.tasaIva = body.tasaIva;
  }

  for (const campo of CAMPOS_NUMERICOS) {
    if (siVino(body, campo)) datos[campo] = body[campo];
  }

  if (siVino(body, 'concepto')) {
    if (body.concepto && body.concepto.length > 200) return { error: 'El concepto no puede superar 200 caracteres' };
    datos.concepto = body.concepto;
  }
  if (exigirConcepto && datos.metodo === 'MONTO_FIJO' && !(typeof body.concepto === 'string' && body.concepto.trim())) {
    return { error: 'El concepto es obligatorio en monto fijo' };
  }

  if (siVino(body, 'observaciones')) {
    if (body.observaciones && body.observaciones.length > 300) {
      return { error: 'Las observaciones no pueden superar 300 caracteres' };
    }
    datos.observaciones = body.observaciones;
  }

  return { datos };
};

const idDeUrl = (valor) => {
  const id = entero(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// ---------- Cálculo previo (no guarda) ----------
// GET /api/liquidaciones/calcular?metodo=PORCENTAJE&montoBase=10000000&porcentaje=10&tasaIva=IVA_10
const calcular = (req, res) => {
  try {
    // El concepto no hace falta para calcular, solo para guardar
    const { error, datos } = leerCampos(req.query, true, false);
    if (error) return res.status(400).json({ error });
    res.json(service.calcular(datos));
  } catch (err) {
    responderError(res, err, 'Error al calcular los honorarios');
  }
};

// ---------- Helpers internos: listar y crear para cualquier "padre" ----------
const listarDe = async (res, padre) => {
  try {
    res.json(await service.listarLiquidaciones(padre));
  } catch (err) {
    responderError(res, err, 'Error al listar las liquidaciones', NO_ENCONTRADO);
  }
};

const crearEn = async (req, res, padre) => {
  try {
    const { error, datos } = leerCampos(req.body, true);
    if (error) return res.status(400).json({ error });
    res.status(201).json(await service.crearLiquidacion(padre, datos, req.usuario.id));
  } catch (err) {
    responderError(res, err, 'Error al registrar la liquidación', NO_ENCONTRADO);
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

// ---------- Por id de liquidación ----------
// GET /api/liquidaciones/:id
const obtener = async (req, res) => {
  try {
    const id = idDeUrl(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });
    res.json(await service.obtenerLiquidacion(id));
  } catch (err) {
    responderError(res, err, 'Error al obtener la liquidación', NO_ENCONTRADO);
  }
};

// PUT /api/liquidaciones/:id  (parcial; el método no se puede cambiar)
const actualizar = async (req, res) => {
  try {
    const id = idDeUrl(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const { error, datos } = leerCampos(req.body, false);
    if (error) return res.status(400).json({ error });
    if (Object.keys(datos).length === 0) return res.status(400).json({ error: 'No hay nada para actualizar' });

    res.json(await service.actualizarLiquidacion(id, datos, req.usuario.id));
  } catch (err) {
    responderError(res, err, 'Error al actualizar la liquidación', NO_ENCONTRADO);
  }
};

// DELETE /api/liquidaciones/:id
const eliminar = async (req, res) => {
  try {
    const id = idDeUrl(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });
    await service.eliminarLiquidacion(id, req.usuario.id);
    res.json({ mensaje: 'Liquidación eliminada' });
  } catch (err) {
    responderError(res, err, 'Error al eliminar la liquidación', NO_ENCONTRADO);
  }
};

module.exports = {
  calcular,
  listarDeExpediente,
  crearEnExpediente,
  listarDeTramite,
  crearEnTramite,
  obtener,
  actualizar,
  eliminar,
};