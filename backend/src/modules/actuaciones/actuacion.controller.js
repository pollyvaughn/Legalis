// ============================================================
// CONTROLLER: Actuacion
// Traduce req/res de Express hacia/desde el service. No contiene
// lógica de negocio — solo parseo de params/body y manejo de errores.
//
// req.usuario.id viene del middleware verificarToken (ver
// auth.middleware.js) y se pasa a cada función del service que
// escribe datos, para que quede registrado en la auditoría quién
// hizo cada acción.
// ============================================================

const actuacionService = require('./actuacion.service');

// POST /api/expedientes/:expedienteId/actuaciones
// (ruta anidada — expedienteId viaja en la URL, no en el body)
async function crear(req, res, next) {
  try {
    const expedienteId = Number(req.params.expedienteId);
    const { parteProcesalId, tipo, fecha, descripcion, fechaNotificacion } = req.body;

    // Validación mínima de presencia (tipo obligatorio, confirmado con Yael)
    if (!tipo || !fecha || !descripcion) {
      return res.status(400).json({ error: 'tipo, fecha y descripcion son obligatorios.' });
    }

    const actuacion = await actuacionService.crearActuacion(
      {
        expedienteId,
        parteProcesalId: parteProcesalId ? Number(parteProcesalId) : null,
        tipo,
        fecha,
        descripcion,
        fechaNotificacion,
      },
      req.usuario.id
    );

    return res.status(201).json(actuacion);
  } catch (error) {
    return next(error); // delega al middleware global de manejo de errores
  }
}

// GET /api/expedientes/:expedienteId/actuaciones
// (ruta anidada — lista solo las actuaciones de ese expediente)
async function listar(req, res, next) {
  try {
    const expedienteId = Number(req.params.expedienteId);
    const actuaciones = await actuacionService.listarPorExpediente(expedienteId);
    return res.json(actuaciones);
  } catch (error) {
    return next(error);
  }
}

// GET /api/actuaciones/:id
// (ruta propia — no depende de conocer el expedienteId)
async function obtener(req, res, next) {
  try {
    const id = Number(req.params.id);
    const actuacion = await actuacionService.obtenerPorId(id);
    return res.json(actuacion);
  } catch (error) {
    return next(error);
  }
}

// GET /api/actuaciones/:id/impacto-eliminacion
// Consulta previa al DELETE: dice si se puede eliminar y, si sí,
// qué plazos se van a borrar en cascada — para que el frontend
// arme el mensaje de confirmación antes de ejecutar nada.
async function impactoEliminacion(req, res, next) {
  try {
    const id = Number(req.params.id);
    const impacto = await actuacionService.obtenerImpactoEliminacion(id);
    return res.json(impacto);
  } catch (error) {
    return next(error);
  }
}

// PUT /api/actuaciones/:id
async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { parteProcesalId, tipo, fecha, descripcion, fechaNotificacion } = req.body;

    const actuacion = await actuacionService.actualizarActuacion(
      id,
      {
        parteProcesalId: parteProcesalId ? Number(parteProcesalId) : null,
        tipo,
        fecha,
        descripcion,
        fechaNotificacion,
      },
      req.usuario.id
    );

    return res.json(actuacion);
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/actuaciones/:id
// Ejecuta directo (el frontend ya mostró el impacto antes, vía
// GET .../impacto-eliminacion) — bloquea con 400 si en el ínterin
// apareció algún plazo cumplido.
async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    await actuacionService.eliminarActuacion(id, req.usuario.id);
    return res.status(204).send(); // sin contenido: borrado exitoso
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  crear,
  listar,
  obtener,
  impactoEliminacion,
  actualizar,
  eliminar,
};