// ============================================================
// OBLIGACIONES CONTROLLER — Módulo 1.3
// Recibe req/res, valida la entrada y delega en el service.
// ============================================================
const service = require('./obligaciones.service');
const { responderError } = require('../../utils/errores');

const PERIODICIDADES = ['MENSUAL', 'ANUAL'];
const ESTADOS_LISTA = ['activas', 'inactivas', 'todas'];

// Convierte a número; si viene vacío o no es número devuelve NaN
// (los ids llegan como texto cuando salen de un <select>)
const entero = (valor) => (valor === '' || valor === null || valor === undefined ? NaN : Number(valor));

// Mensaje para los 404 de este módulo
const NO_ENCONTRADA = 'Obligación no encontrada';

// GET /api/obligaciones?clienteId=&tipoTramiteId=&estado=activas|inactivas|todas
const listar = async (req, res) => {
  try {
    const estado = req.query.estado;
    if (estado && !ESTADOS_LISTA.includes(estado)) {
      return res.status(400).json({ error: 'estado debe ser activas, inactivas o todas' });
    }
    const clienteId = entero(req.query.clienteId);
    const tipoTramiteId = entero(req.query.tipoTramiteId);

    const datos = await service.listarObligaciones({
      clienteId: Number.isInteger(clienteId) ? clienteId : undefined,
      tipoTramiteId: Number.isInteger(tipoTramiteId) ? tipoTramiteId : undefined,
      estado,
    });
    res.json(datos);
  } catch (error) {
    responderError(res, error, 'Error al listar las obligaciones', NO_ENCONTRADA);
  }
};

// GET /api/obligaciones/:id
const obtener = async (req, res) => {
  try {
    const id = entero(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido' });

    const obligacion = await service.obtenerObligacion(id);
    if (!obligacion) return res.status(404).json({ error: NO_ENCONTRADA });
    res.json(obligacion);
  } catch (error) {
    responderError(res, error, 'Error al obtener la obligación', NO_ENCONTRADA);
  }
};

// POST /api/obligaciones
// body: { clienteId, tipoTramiteId, periodicidad, mesAnual?, observaciones? }
const crear = async (req, res) => {
  try {
    const { periodicidad, observaciones } = req.body;
    const clienteId = entero(req.body.clienteId);
    const tipoTramiteId = entero(req.body.tipoTramiteId);
    const mesAnual = entero(req.body.mesAnual);

    if (!Number.isInteger(clienteId)) return res.status(400).json({ error: 'El cliente es obligatorio' });
    if (!Number.isInteger(tipoTramiteId)) return res.status(400).json({ error: 'El trámite del catálogo es obligatorio' });
    if (!PERIODICIDADES.includes(periodicidad)) return res.status(400).json({ error: 'La periodicidad debe ser MENSUAL o ANUAL' });
    if (periodicidad === 'ANUAL' && (!Number.isInteger(mesAnual) || mesAnual < 1 || mesAnual > 12)) {
      return res.status(400).json({ error: 'Para una obligación anual hay que indicar el mes (1 a 12)' });
    }
    if (observaciones && observaciones.length > 300) {
      return res.status(400).json({ error: 'Las observaciones no pueden superar 300 caracteres' });
    }

    const resultado = await service.crearObligacion({
      clienteId,
      tipoTramiteId,
      periodicidad,
      mesAnual: periodicidad === 'ANUAL' ? mesAnual : null, // en las mensuales no se usa
      observaciones: observaciones?.trim() || null,
    });
    res.status(201).json(resultado); // { obligacion, generados }
  } catch (error) {
    responderError(res, error, 'Error al crear la obligación', NO_ENCONTRADA);
  }
};

// PATCH /api/obligaciones/:id/inactivar
const inactivar = async (req, res) => {
  try {
    const id = entero(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido' });

    res.json(await service.inactivarObligacion(id)); // { obligacion, eliminados }
  } catch (error) {
    responderError(res, error, 'Error al inactivar la obligación', NO_ENCONTRADA);
  }
};

// POST /api/obligaciones/:id/generar-siguiente-anio
const generarSiguienteAnio = async (req, res) => {
  try {
    const id = entero(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido' });

    res.json(await service.generarSiguienteAnio(id)); // { generados }
  } catch (error) {
    responderError(res, error, 'Error al generar los vencimientos', NO_ENCONTRADA);
  }
};

module.exports = { listar, obtener, crear, inactivar, generarSiguienteAnio };