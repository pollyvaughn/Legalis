// ============================================================
// COBROS CONTROLLER — Módulo 4 (RF10 / CU-26 y CU-27)
// Recibe req/res, valida la forma de la entrada y delega en el service.
// Las reglas de negocio (saldos, líneas, método de pago, fecha no
// futura, anulación) las valida cobros.service.js y llegan como
// ErrorNegocio.
// ============================================================
const service = require('./cobros.service');
const { responderError } = require('../../utils/errores');
const { siVino, entero, parsearFecha } = require('../../utils/entrada');
const { TIPOS_LINEA } = require('../../utils/calculoCobros');

const NO_ENCONTRADO = 'Recibo no encontrado';
const LIMITE_MAXIMO = 100; // tope de filas por página en la pantalla

// ------------------------------------------------------------
// HELPER: leerCampos (alta de un cobro)
// Devuelve { error } o { datos }. Método de pago y líneas se pasan tal
// cual al service, que los valida con las reglas del Módulo 4.
// El cliente NO viene en el body: es el dueño del expediente/trámite.
// ------------------------------------------------------------
const leerCampos = (body) => {
  // Fecha del cobro: AAAA-MM-DD válida (que no sea futura lo controla el service)
  const fecha = parsearFecha(body.fecha);
  if (!fecha) return { error: 'La fecha es obligatoria y debe tener formato AAAA-MM-DD' };

  const datos = { fecha, metodoPago: body.metodoPago, lineas: body.lineas };

  // Referencia de pago: opcional, hasta 100 caracteres
  if (siVino(body, 'referenciaPago')) {
    if (body.referenciaPago !== null && typeof body.referenciaPago !== 'string') {
      return { error: 'La referencia de pago debe ser texto' };
    }
    if (body.referenciaPago && body.referenciaPago.trim().length > 100) {
      return { error: 'La referencia de pago no puede superar 100 caracteres' };
    }
    datos.referenciaPago = body.referenciaPago;
  }

  // Concepto: opcional, hasta 200 caracteres
  if (siVino(body, 'concepto')) {
    if (body.concepto !== null && typeof body.concepto !== 'string') {
      return { error: 'El concepto debe ser texto' };
    }
    if (body.concepto && body.concepto.trim().length > 200) {
      return { error: 'El concepto no puede superar 200 caracteres' };
    }
    datos.concepto = body.concepto;
  }

  return { datos };
};

const idDeUrl = (valor) => {
  const id = entero(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// ---------- Helpers internos: listar y registrar para cualquier "padre" ----------
const listarDe = async (res, padre) => {
  try {
    res.json(await service.listarDePadre(padre));
  } catch (err) {
    responderError(res, err, 'Error al listar los recibos', NO_ENCONTRADO);
  }
};

const registrarEn = async (req, res, padre) => {
  try {
    const { error, datos } = leerCampos(req.body);
    if (error) return res.status(400).json({ error });
    res.status(201).json(await service.registrarCobro(padre, datos, req.usuario.id));
  } catch (err) {
    responderError(res, err, 'Error al registrar el cobro', NO_ENCONTRADO);
  }
};

// ---------- De un EXPEDIENTE ----------
const listarDeExpediente = (req, res) => {
  const expedienteId = idDeUrl(req.params.expedienteId);
  if (!expedienteId) return res.status(400).json({ error: 'ID de expediente inválido' });
  return listarDe(res, { expedienteId });
};
const registrarEnExpediente = (req, res) => {
  const expedienteId = idDeUrl(req.params.expedienteId);
  if (!expedienteId) return res.status(400).json({ error: 'ID de expediente inválido' });
  return registrarEn(req, res, { expedienteId });
};

// ---------- De un TRÁMITE ----------
const listarDeTramite = (req, res) => {
  const tramiteId = idDeUrl(req.params.tramiteId);
  if (!tramiteId) return res.status(400).json({ error: 'ID de trámite inválido' });
  return listarDe(res, { tramiteId });
};
const registrarEnTramite = (req, res) => {
  const tramiteId = idDeUrl(req.params.tramiteId);
  if (!tramiteId) return res.status(400).json({ error: 'ID de trámite inválido' });
  return registrarEn(req, res, { tramiteId });
};

// ---------- Globales y por id ----------
// GET /api/cobros?estado=&clienteId=&expedienteId=&tramiteId=&tipo=&desde=&hasta=&pagina=&limite=
const listar = async (req, res) => {
  try {
    const q = req.query;
    const filtros = {};

    if (q.estado) {
      if (!['EMITIDO', 'ANULADO'].includes(q.estado)) {
        return res.status(400).json({ error: 'Estado inválido. Valores válidos: EMITIDO, ANULADO' });
      }
      filtros.estado = q.estado;
    }
    if (q.tipo) {
      if (!TIPOS_LINEA.includes(q.tipo)) {
        return res.status(400).json({ error: `Tipo inválido. Valores válidos: ${TIPOS_LINEA.join(', ')}` });
      }
      filtros.tipo = q.tipo;
    }
    for (const campo of ['clienteId', 'expedienteId', 'tramiteId']) {
      if (q[campo]) {
        const id = idDeUrl(q[campo]);
        if (!id) return res.status(400).json({ error: `${campo} inválido` });
        filtros[campo] = id;
      }
    }
    for (const campo of ['desde', 'hasta']) {
      if (q[campo]) {
        const fecha = parsearFecha(q[campo]);
        if (!fecha) return res.status(400).json({ error: `${campo} debe tener formato AAAA-MM-DD` });
        filtros[campo] = fecha;
      }
    }
    if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
      return res.status(400).json({ error: '"desde" no puede ser posterior a "hasta"' });
    }

    // Paginación: página >= 1, límite entre 1 y LIMITE_MAXIMO
    const pagina = entero(q.pagina);
    const limite = entero(q.limite);
    filtros.pagina = Number.isInteger(pagina) && pagina >= 1 ? pagina : 1;
    filtros.limite = Number.isInteger(limite) && limite >= 1 ? Math.min(limite, LIMITE_MAXIMO) : 20;

    res.json(await service.listarCobros(filtros));
  } catch (err) {
    responderError(res, err, 'Error al listar los recibos', NO_ENCONTRADO);
  }
};

// GET /api/cobros/:id
const obtener = async (req, res) => {
  try {
    const id = idDeUrl(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });
    res.json(await service.obtenerCobro(id));
  } catch (err) {
    responderError(res, err, 'Error al obtener el recibo', NO_ENCONTRADO);
  }
};

// POST /api/cobros/:id/anular  { motivo }  (no borra: pasa a ANULADO)
const anular = async (req, res) => {
  try {
    const id = idDeUrl(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });
    res.json(await service.anularCobro(id, req.body?.motivo, req.usuario.id));
  } catch (err) {
    responderError(res, err, 'Error al anular el recibo', NO_ENCONTRADO);
  }
};

module.exports = {
  listarDeExpediente,
  registrarEnExpediente,
  listarDeTramite,
  registrarEnTramite,
  listar,
  obtener,
  anular,
};