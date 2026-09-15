// ============================================
// PARTES.SERVICE.JS
// Lógica de acceso a datos para ParteProcesal, usando Prisma.
// Una ParteProcesal siempre pertenece a un Expediente (expedienteId
// obligatorio) y opcionalmente puede vincularse a un Cliente del
// estudio (clienteId opcional), por si esa parte también es cliente.
// ============================================

const prisma = require('../../config/database');

// ------------------------------------------
// HELPER: siVino
// Devuelve el valor solo si fue enviado (no undefined).
// Mismo patrón usado en expedientes.service.js — evita que
// un PUT parcial pise campos que no vinieron en el body.
// ------------------------------------------
function siVino(valor) {
  return valor !== undefined ? valor : undefined;
}

// ------------------------------------------
// CREAR PARTE PROCESAL
// expedienteId viene de la URL (/api/expedientes/:id/partes),
// no del body — así el frontend no puede "colgar" una parte
// de un expediente distinto al que está viendo.
// ------------------------------------------
async function crearParte(expedienteId, datos) {
  const { clienteId, nombre, documento, rol, rolEspecifico } = datos;

  return prisma.parteProcesal.create({
    data: {
      expedienteId: Number(expedienteId),
      // clienteId es opcional: solo se manda si esta parte también es cliente del estudio
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
}

// ------------------------------------------
// LISTAR PARTES DE UN EXPEDIENTE
// Se usa tanto para una ruta propia GET /api/expedientes/:id/partes
// como internamente si hiciera falta en otro lado.
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
// No permite editar expedienteId: una parte no "cambia" de
// expediente, si se cargó mal se borra y se crea de nuevo
// (ParteProcesal no tiene soft-delete por ahora, ver backlog).
// ------------------------------------------
async function actualizarParte(id, datos) {
  const { clienteId, nombre, documento, rol, rolEspecifico } = datos;

  return prisma.parteProcesal.update({
    where: { id: Number(id) },
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
}

module.exports = {
  crearParte,
  listarPartesPorExpediente,
  actualizarParte,
};