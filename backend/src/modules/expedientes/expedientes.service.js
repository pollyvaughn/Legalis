// ============================================
// EXPEDIENTES.SERVICE.JS
// Lógica de acceso a datos para Expediente, usando Prisma.
// No conoce req/res de Express — solo recibe y devuelve datos.
// ============================================

const prisma = require('../../config/database');

// ------------------------------------------
// CREAR EXPEDIENTE
// Requiere un clienteId válido (FK obligatoria).
// ------------------------------------------
async function crearExpediente(datos) {
  const {
    clienteId,
    numeroExpediente,
    caratula,
    fuero,
    jurisdiccion,
    juzgado,
    montoJuicio,
  } = datos;

  return prisma.expediente.create({
    data: {
      clienteId: Number(clienteId),
      numeroExpediente,
      caratula,
      fuero,
      jurisdiccion,
      juzgado,
      // montoJuicio es opcional; si viene, lo convertimos a número
      montoJuicio: montoJuicio !== undefined && montoJuicio !== null ? Number(montoJuicio) : null,
    },
    // Incluye los datos del cliente en la respuesta, útil para el frontend
    include: {
      cliente: true,
    },
  });
}

// ------------------------------------------
// LISTAR EXPEDIENTES
// Devuelve todos los expedientes activos.
// Permite filtrar opcionalmente por clienteId (para la "vista focal" del Módulo 1).
// ------------------------------------------
async function listarExpedientes(clienteId) {
  const where = { activo: true };

  // Si se pasa clienteId, filtra solo los expedientes de ese cliente
  if (clienteId) {
    where.clienteId = Number(clienteId);
  }

  return prisma.expediente.findMany({
    where,
    include: {
      cliente: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ------------------------------------------
// OBTENER UN EXPEDIENTE POR ID
// ------------------------------------------
async function obtenerExpedientePorId(id) {
  return prisma.expediente.findUnique({
    where: { id: Number(id) },
    include: {
      cliente: true,
    },
  });
}

// ------------------------------------------
// ACTUALIZAR EXPEDIENTE
// ------------------------------------------
async function actualizarExpediente(id, datos) {
  const { caratula, fuero, jurisdiccion, juzgado, montoJuicio, activo } = datos;

  return prisma.expediente.update({
    where: { id: Number(id) },
    data: {
      caratula,
      fuero,
      jurisdiccion,
      juzgado,
      montoJuicio: montoJuicio !== undefined && montoJuicio !== null ? Number(montoJuicio) : undefined,
      activo,
    },
    include: {
      cliente: true,
    },
  });
}

module.exports = {
  crearExpediente,
  listarExpedientes,
  obtenerExpedientePorId,
  actualizarExpediente,
};