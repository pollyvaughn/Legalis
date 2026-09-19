// ============================================
// PARTES.CONTROLLER.JS
// Maneja req/res de Express para ParteProcesal.
// ============================================

const partesService = require('./partes.service');

// ------------------------------------------
// POST /api/expedientes/:expedienteId/partes
// Crea una parte procesal dentro de un expediente.
// ------------------------------------------
async function crear(req, res) {
  try {
    const { expedienteId } = req.params;
    const { nombre, rol } = req.body;

    // Validación mínima de campos obligatorios
    if (!nombre || !rol) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios: nombre, rol',
      });
    }

    const parte = await partesService.crearParte(expedienteId, req.body);
    res.status(201).json(parte);
  } catch (error) {
    // P2003 = foreign key inválida (expedienteId o clienteId no existen)
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'El expediente o el cliente indicado no existe' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al crear la parte procesal' });
  }
}

// ------------------------------------------
// GET /api/expedientes/:expedienteId/partes
// Lista las partes procesales de un expediente puntual.
// (El GET de expediente ya las incluye por defecto; esta ruta
// sirve para pedirlas solas, sin traer todo el expediente).
// ------------------------------------------
async function listar(req, res) {
  try {
    const { expedienteId } = req.params;
    const partes = await partesService.listarPartesPorExpediente(expedienteId);
    res.json(partes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar las partes procesales' });
  }
}

// ------------------------------------------
// PUT /api/partes/:id
// Actualiza una parte procesal existente.
// ------------------------------------------
async function actualizar(req, res) {
  try {
    const parte = await partesService.actualizarParte(req.params.id, req.body);
    res.json(parte);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Parte procesal no encontrada' });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'El cliente indicado no existe' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar la parte procesal' });
  }
}

// ------------------------------------------
// DELETE /api/partes/:id
// Elimina una parte procesal (borrado real, ver nota en el service).
// ------------------------------------------
async function eliminar(req, res) {
  try {
    await partesService.eliminarParte(req.params.id);
    // 204 = No Content: se borró y no hay nada que devolver
    res.status(204).send();
  } catch (error) {
    // P2025 = el registro no existe (ya fue eliminado o el id es inválido)
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Parte procesal no encontrada' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar la parte procesal' });
  }
}

module.exports = {
  crear,
  listar,
  actualizar,
  eliminar,
};