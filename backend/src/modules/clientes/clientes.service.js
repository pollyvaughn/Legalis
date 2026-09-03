// ============================================
// CLIENTES.SERVICE.JS
// Lógica de acceso a datos para Cliente, usando Prisma.
// No conoce req/res de Express — solo recibe y devuelve datos.
// ============================================

const prisma = require('../../config/database');

// ------------------------------------------
// CREAR CLIENTE
// Crea el Cliente base y, según el tipo, su extensión
// (PersonaFisica o PersonaJuridica) en una sola transacción.
// Usamos "create" anidado de Prisma: crea el Cliente y su
// extensión relacionada en una sola operación atómica
// (si algo falla, no queda un Cliente "huérfano" sin extensión).
// ------------------------------------------
async function crearCliente(datos) {
  const {
    ruc,
    tipo, // "FISICA" | "JURIDICA"
    nombreRazonSocial,
    tipoAtencion,
    email,
    telefono,
    direccion,
    // Campos específicos de persona física
    cedula,
    digitoVerificador,
    fechaNacimiento,
    // Campos específicos de persona jurídica
    tipoSocietario,
    fechaConstitucion,
  } = datos;

  // Arma el objeto base común a ambos tipos
  const dataCliente = {
    ruc,
    tipo,
    nombreRazonSocial,
    tipoAtencion,
    email,
    telefono,
    direccion,
  };

  // Agrega la extensión correspondiente según el tipo de cliente
  if (tipo === 'FISICA') {
    dataCliente.personaFisica = {
      create: {
        cedula,
        digitoVerificador,
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
      },
    };
  } else if (tipo === 'JURIDICA') {
    dataCliente.personaJuridica = {
      create: {
        tipoSocietario,
        fechaConstitucion: fechaConstitucion ? new Date(fechaConstitucion) : null,
      },
    };
  }

  return prisma.cliente.create({
    data: dataCliente,
    // "include" trae también los datos de la extensión en la respuesta
    include: {
      personaFisica: true,
      personaJuridica: true,
    },
  });
}

// ------------------------------------------
// LISTAR CLIENTES
// Devuelve todos los clientes activos, con su extensión incluida.
// ------------------------------------------
async function listarClientes() {
  return prisma.cliente.findMany({
    where: { activo: true },
    include: {
      personaFisica: true,
      personaJuridica: true,
    },
    orderBy: { nombreRazonSocial: 'asc' },
  });
}

// ------------------------------------------
// OBTENER UN CLIENTE POR ID
// Incluye también sus expedientes, útil para la vista de detalle.
// ------------------------------------------
async function obtenerClientePorId(id) {
  return prisma.cliente.findUnique({
    where: { id: Number(id) },
    include: {
      personaFisica: true,
      personaJuridica: true,
      expedientes: true,
    },
  });
}

// ------------------------------------------
// ACTUALIZAR CLIENTE
// Actualiza solo los campos base por ahora.
// ------------------------------------------
async function actualizarCliente(id, datos) {
  const { nombreRazonSocial, tipoAtencion, email, telefono, direccion, activo } = datos;

  return prisma.cliente.update({
    where: { id: Number(id) },
    data: { nombreRazonSocial, tipoAtencion, email, telefono, direccion, activo },
    include: {
      personaFisica: true,
      personaJuridica: true,
    },
  });
}

module.exports = {
  crearCliente,
  listarClientes,
  obtenerClientePorId,
  actualizarCliente,
};