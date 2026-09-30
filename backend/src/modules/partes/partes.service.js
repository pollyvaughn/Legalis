// ============================================
// PARTES.SERVICE.JS
// Lógica de acceso a datos para ParteProcesal, usando Prisma.
// Una ParteProcesal siempre pertenece a un Expediente (expedienteId
// obligatorio) y opcionalmente puede vincularse a un Cliente del
// estudio (clienteId opcional), por si esa parte también es cliente.
// ============================================

const prisma = require('../../config/database');
const { registrarAuditoria } = require('../../utils/auditoria');

// ------------------------------------------
// HELPER: siVino
// Devuelve el valor solo si fue enviado (no undefined).
// ------------------------------------------
function siVino(valor) {
  return valor !== undefined ? valor : undefined;
}

// ------------------------------------------
// CREAR PARTE PROCESAL
// expedienteId viene de la URL, no del body.
// Ahora recibe usuarioId para la auditoría.
// ------------------------------------------
async function crearParte(expedienteId, datos, usuarioId) {
  const { clienteId, nombre, documento, rol, rolEspecifico } = datos;

  return prisma.$transaction(async (tx) => {
    const parte = await tx.parteProcesal.create({
      data: {
        expedienteId: Number(expedienteId),
        clienteId: clienteId !== undefined && clienteId !== null ? Number(clienteId) : null,
        nombre,
        documento,
        rol,
        rolEspecifico,
      },
      include: {
        cliente: true,
      },
    });

    // entidadId apunta a la parte, pero el detalle menciona el
    // expediente: así el historial es legible sin tener que cruzar tablas.
    await registrarAuditoria(tx, {
      usuarioId,
      accion: 'CREAR',
      entidad: 'ParteProcesal',
      entidadId: parte.id,
      detalle: `${parte.nombre} (${parte.rol}) en expediente #${expedienteId}`,
    });

    return parte;
  });
}

// ------------------------------------------
// LISTAR PARTES DE UN EXPEDIENTE (sin cambios — solo lectura)
// ------------------------------------------
async function listarPartesPorExpediente(expedienteId) {
  return prisma.parteProcesal.findMany({
    where: { expedienteId: Number(expedienteId) },
    include: {
      cliente: true,
    },
    orderBy: { createdAt: 'asc' },
  });
}

// ------------------------------------------
// ACTUALIZAR PARTE PROCESAL
// Ahora recibe usuarioId para la auditoría.
// ------------------------------------------
async function actualizarParte(id, datos, usuarioId) {
  const { clienteId, nombre, documento, rol, rolEspecifico } = datos;
  const parteId = Number(id);

  return prisma.$transaction(async (tx) => {
    const parteActualizada = await tx.parteProcesal.update({
      where: { id: parteId },
      data: {
        clienteId: clienteId !== undefined
          ? (clienteId !== null ? Number(clienteId) : null)
          : undefined,
        nombre: siVino(nombre),
        documento: siVino(documento),
        rol: siVino(rol),
        rolEspecifico: siVino(rolEspecifico),
      },
      include: {
        cliente: true,
      },
    });

    await registrarAuditoria(tx, {
      usuarioId,
      accion: 'EDITAR',
      entidad: 'ParteProcesal',
      entidadId: parteId,
      detalle: `${parteActualizada.nombre} (${parteActualizada.rol}) en expediente #${parteActualizada.expedienteId}`,
    });

    return parteActualizada;
  });
}

// ------------------------------------------
// ELIMINAR PARTE PROCESAL (borrado real / hard-delete)
// RN-06: las partes cargadas por error se eliminan, no se inactivan.
// Se guarda el nombre y el expediente ANTES de borrar, porque
// después de eliminarla ya no se puede leer de la base.
// Ahora recibe usuarioId para la auditoría.
// ------------------------------------------
async function eliminarParte(id, usuarioId) {
  const parteId = Number(id);

  return prisma.$transaction(async (tx) => {
    // Se busca antes de borrar: findUniqueOrThrow lanza P2025 si no
    // existe, igual que hacía el delete directo — mismo comportamiento
    // de error que ya manejaba el controller.
    const parte = await tx.parteProcesal.findUniqueOrThrow({
      where: { id: parteId },
    });

    await tx.parteProcesal.delete({
      where: { id: parteId },
    });

    await registrarAuditoria(tx, {
      usuarioId,
      accion: 'ELIMINAR',
      entidad: 'ParteProcesal',
      entidadId: parteId,
      detalle: `${parte.nombre} (${parte.rol}) en expediente #${parte.expedienteId}`,
    });
  });
}

module.exports = {
  crearParte,
  listarPartesPorExpediente,
  actualizarParte,
  eliminarParte,
};