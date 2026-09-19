// ============================================================
// ERRORES.JS — Errores de regla de negocio + respuesta HTTP
// Un service lanza ErrorNegocio cuando se rompe una regla
// (duplicado, no se puede borrar, etc.). Lleva el código HTTP
// que el controller debe responder (400, 404, 409...).
// ============================================================
class ErrorNegocio extends Error {
  constructor(mensaje, status = 400) {
    super(mensaje);
    this.status = status;
  }
}

// ------------------------------------------------------------
// responderError: un solo lugar para traducir errores a HTTP
//  - ErrorNegocio -> su propio código (409, 400, 404...)
//  - P2025 (Prisma: registro no encontrado) -> 404
//  - cualquier otro -> 500 (y se registra en consola)
// ------------------------------------------------------------
const responderError = (res, error, mensajeGenerico, mensajeNoEncontrado = 'Registro no encontrado') => {
  if (error instanceof ErrorNegocio) return res.status(error.status).json({ error: error.message });
  if (error.code === 'P2025') return res.status(404).json({ error: mensajeNoEncontrado });
  console.error(mensajeGenerico, error);
  return res.status(500).json({ error: mensajeGenerico });
};

module.exports = { ErrorNegocio, responderError };