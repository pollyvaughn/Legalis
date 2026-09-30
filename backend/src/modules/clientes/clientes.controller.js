// ============================================
// CLIENTES.CONTROLLER.JS
// Maneja req/res de Express. Valida datos básicos,
// llama al service, y define códigos de respuesta HTTP.
// ============================================

const clientesService = require('./clientes.service');

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

    const cliente = await clientesService.crearCliente(req.body, req.usuario.id);
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
// Lista clientes con filtros y paginación. Por defecto solo activos.
// Query params (todos opcionales y combinables):
//   estado ('activos' | 'inactivos' | 'todos'), busqueda, pagina, limite
// Responde { datos, total, pagina, limite, totalPaginas }.
// ------------------------------------------
async function listar(req, res) {
  try {
    const resultado = await clientesService.listarClientes({
      estado: req.query.estado,
      busqueda: req.query.busqueda,
      pagina: req.query.pagina,
      limite: req.query.limite,
    });
    res.json(resultado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar los clientes' });
  }
}

// ------------------------------------------
// GET /api/clientes/opciones
// Lista liviana de clientes activos ({ id, nombreRazonSocial }),
// sin paginar, para llenar desplegables (ej: select de cliente
// en el alta de expedientes).
// ------------------------------------------
async function listarOpciones(req, res) {
  try {
    const opciones = await clientesService.listarOpcionesClientes();
    res.json(opciones);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar las opciones de clientes' });
  }
}

// ------------------------------------------
// GET /api/clientes/:id
// Obtiene un cliente puntual por su ID.
// Por defecto solo lo trae si está activo.
// ?incluirInactivos=true permite traerlo aunque esté dado de baja
// (mismo patrón usado en expedientes.controller.js).
// ------------------------------------------
async function obtenerPorId(req, res) {
  try {
    const incluirInactivos = req.query.incluirInactivos === 'true';
    const cliente = await clientesService.obtenerClientePorId(req.params.id, incluirInactivos);

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
// Actualiza los datos base de un cliente y, si corresponde,
// los de su extensión (ver clientes.service.js para el detalle
// de qué campos se pueden editar y por qué).
// ------------------------------------------
async function actualizar(req, res) {
  try {
    const cliente = await clientesService.actualizarCliente(req.params.id, req.body, req.usuario.id);
    res.json(cliente);
  } catch (error) {
    // P2025 es el código de Prisma para "registro no encontrado" al actualizar
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    // P2002 = ruc o cedula duplicados (ambos son unique en el schema)
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe otro cliente con ese RUC o cédula' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el cliente' });
  }
}

module.exports = {
  crear,
  listar,
  listarOpciones,
  obtenerPorId,
  actualizar,
};