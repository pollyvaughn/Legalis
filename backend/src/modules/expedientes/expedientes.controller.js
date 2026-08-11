// ============================================
// EXPEDIENTES.CONTROLLER.JS
// Maneja req/res de Express. Valida datos básicos,
// llama al service, y define códigos de respuesta HTTP.
// ============================================

const expedientesService = require('./expedientes.service');

// ------------------------------------------
// POST /api/expedientes
// Crea un nuevo expediente
// ------------------------------------------
async function crear(req, res) {
  try {
    const { clienteId, numeroExpediente, caratula } = req.body;

    // Validación mínima de campos obligatorios
    if (!clienteId || !numeroExpediente || !caratula) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios: clienteId, numeroExpediente, caratula',
      });
    }

    const expediente = await expedientesService.crearExpediente(req.body);
    res.status(201).json(expediente);
  } catch (error) {
    // P2002 = número de expediente duplicado (constraint unique)
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe un expediente con ese número' });
    }
    // P2003 = clienteId no existe (violación de foreign key)
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'El cliente indicado no existe' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al crear el expediente' });
  }
}

// ------------------------------------------
// GET /api/expedientes
// Lista expedientes activos. Soporta ?clienteId=X para filtrar
// por cliente (vista focal mencionada en el anteproyecto).
// ------------------------------------------
async function listar(req, res) {
  try {
    const { clienteId } = req.query;
    const expedientes = await expedientesService.listarExpedientes(clienteId);
    res.json(expedientes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar los expedientes' });
  }
}

// ------------------------------------------
// GET /api/expedientes/:id
// ------------------------------------------
async function obtenerPorId(req, res) {
  try {
    const expediente = await expedientesService.obtenerExpedientePorId(req.params.id);

    if (!expediente) {
      return res.status(404).json({ error: 'Expediente no encontrado' });
    }

    res.json(expediente);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el expediente' });
  }
}

// ------------------------------------------
// PUT /api/expedientes/:id
// ------------------------------------------
async function actualizar(req, res) {
  try {
    const expediente = await expedientesService.actualizarExpediente(req.params.id, req.body);
    res.json(expediente);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Expediente no encontrado' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el expediente' });
  }
}

module.exports = {
  crear,
  listar,
  obtenerPorId,
  actualizar,
};