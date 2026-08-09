// ============================================
// CLIENTES.CONTROLLER.JS
// Maneja req/res de Express. Valida datos básicos,
// llama al service, y define códigos de respuesta HTTP.
// ============================================

const clientesService = require('../services/clientes.service');

// ------------------------------------------
// POST /api/clientes
// Crea un nuevo cliente
// ------------------------------------------
async function crear(req, res) {
  try {
    const { ruc, tipo, nombreRazonSocial } = req.body;

    // Validación mínima de campos obligatorios
    if (!ruc || !tipo || !nombreRazonSocial) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios: ruc, tipo, nombreRazonSocial',
      });
    }

    const cliente = await clientesService.crearCliente(req.body);
    res.status(201).json(cliente); // 201 = Created
  } catch (error) {
    // P2002 es el código de Prisma para violación de constraint "unique" (ej. ruc duplicado)
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe un cliente con ese RUC/documento' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al crear el cliente' });
  }
}

// ------------------------------------------
// GET /api/clientes
// Lista todos los clientes activos
// ------------------------------------------
async function listar(req, res) {
  try {
    const clientes = await clientesService.listarClientes();
    res.json(clientes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar los clientes' });
  }
}

// ------------------------------------------
// GET /api/clientes/:id
// Obtiene un cliente puntual por su ID
// ------------------------------------------
async function obtenerPorId(req, res) {
  try {
    const cliente = await clientesService.obtenerClientePorId(req.params.id);

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json(cliente);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el cliente' });
  }
}

// ------------------------------------------
// PUT /api/clientes/:id
// Actualiza los datos base de un cliente existente
// ------------------------------------------
async function actualizar(req, res) {
  try {
    const cliente = await clientesService.actualizarCliente(req.params.id, req.body);
    res.json(cliente);
  } catch (error) {
    // P2025 es el código de Prisma para "registro no encontrado" al actualizar
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el cliente' });
  }
}

module.exports = {
  crear,
  listar,
  obtenerPorId,
  actualizar,
};