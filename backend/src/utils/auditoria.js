// ============================================
// AUDITORIA.JS (utils)
// Helper único para registrar acciones en la tabla Auditoria.
// Se llama DESDE los services, dentro de la misma transacción
// que hace el cambio real: si el cambio falla, el registro de
// auditoría también se deshace (y al revés). Nunca queda una
// acción sin registro ni un registro de algo que no pasó.
// ============================================

// ------------------------------------------
// REGISTRAR AUDITORÍA
// Parámetros:
//   tx   -> el cliente de transacción de Prisma (el "tx" de
//           prisma.$transaction). NO usar el prisma global acá,
//           porque quedaría fuera de la transacción.
//   datos -> { usuarioId, accion, entidad, entidadId, detalle }
// ------------------------------------------
async function registrarAuditoria(tx, { usuarioId, accion, entidad, entidadId, detalle }) {
    return tx.auditoria.create({
      data: {
        usuarioId,
        accion,      // uno de AccionAuditoria: CREAR, EDITAR, INACTIVAR...
        entidad,     // ej: "Cliente"
        entidadId,
        // Recorta a 300 caracteres para no romper el VarChar(300)
        detalle: detalle ? String(detalle).slice(0, 300) : null,
      },
    });
  }
  
  module.exports = { registrarAuditoria };