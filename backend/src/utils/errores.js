// ============================================================
// ERRORES.JS — Errores de regla de negocio
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
  
  module.exports = { ErrorNegocio };