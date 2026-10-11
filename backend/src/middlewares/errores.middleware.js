// ============================================================
// ERRORES.MIDDLEWARE.JS
// Manejo GLOBAL de errores de Express. Se monta al FINAL de app.js,
// después de todas las rutas.
//
// Para qué: varios controllers (actuaciones, plazos, tipos de plazo,
// días no hábiles) hacen `catch (error) { next(error) }`. Sin este
// middleware, Express respondía con una página HTML y el frontend
// (que lee `err.response.data.error`) no podía mostrar el mensaje.
// Ahora TODO error sale como JSON { error: "mensaje" }.
//
// Orden de decisión:
//   1. Errores con .status 4xx (ErrorNegocio, o `new Error()` con
//      .status puesto en un service) -> ese código + su mensaje
//   2. JSON mal formado en el body              -> 400
//   3. Errores conocidos de Prisma              -> 404 / 409 / 400
//   4. Cualquier otro                           -> 500 genérico
//      (el detalle real solo se escribe en la consola del servidor)
// ============================================================

// ------------------------------------------------------------
// Rutas /api que no existen -> 404 en JSON (en vez de HTML)
// ------------------------------------------------------------
function rutaNoEncontrada(req, res) {
    res.status(404).json({ error: 'Ruta no encontrada' });
  }
  
  // ------------------------------------------------------------
  // Manejador de errores. Express lo reconoce por tener 4 parámetros
  // (err, req, res, next): aunque `next` no se use, tiene que estar.
  // ------------------------------------------------------------
  // eslint-disable-next-line no-unused-vars
  function manejarErrores(err, req, res, next) {
    // Si la respuesta ya empezó a enviarse, no se puede cambiar: se delega
    if (res.headersSent) return next(err);
  
    // 1. Errores de regla de negocio con código HTTP 4xx
    const status = err.status || err.statusCode;
    if (status >= 400 && status < 500 && err.type !== 'entity.parse.failed') {
      return res.status(status).json({ error: err.message });
    }
  
    // 2. JSON mal formado en el body de la petición
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
    }
  
    // 3. Errores conocidos de Prisma
    //    P2025 = registro no encontrado | P2002 = dato duplicado (único)
    //    P2003 = clave foránea inválida o registro en uso
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe un registro con esos datos' });
    }
    if (err.code === 'P2003') {
      return res
        .status(409)
        .json({ error: 'La operación referencia un registro que no existe o que está en uso' });
    }
    if (err.name === 'PrismaClientValidationError') {
      console.error('Error de validación de Prisma:', err.message);
      return res.status(400).json({ error: 'Algún valor enviado no es válido' });
    }
  
    // 4. Error inesperado: se registra completo y se responde algo genérico
    console.error('Error no controlado:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
  
  module.exports = { rutaNoEncontrada, manejarErrores };