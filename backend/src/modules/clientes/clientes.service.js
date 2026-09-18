// ============================================
// CLIENTES.SERVICE.JS
// Lógica de acceso a datos para Cliente, usando Prisma.
// No conoce req/res de Express — solo recibe y devuelve datos.
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
    representanteLegal, // NUEVO: quien representa a la empresa (texto libre, opcional)
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
        // digitoVerificador es Int en el schema; si viene de un
        // input HTML llega como string, así que lo convertimos.
        digitoVerificador: digitoVerificador !== undefined && digitoVerificador !== null
          ? Number(digitoVerificador)
          : undefined,
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
      },
    };
  } else if (tipo === 'JURIDICA') {
    dataCliente.personaJuridica = {
      create: {
        tipoSocietario,
        fechaConstitucion: fechaConstitucion ? new Date(fechaConstitucion) : null,
        representanteLegal, // NUEVO
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
// Por defecto solo trae clientes activos. Pasando
// incluirInactivos = true se traen todos (mismo patrón que
// obtenerClientePorId, para que el frontend pueda ofrecer un
// filtro Activos/Inactivos/Todos).
// ------------------------------------------
async function listarClientes(incluirInactivos = false) {
  const where = {};

  if (!incluirInactivos) {
    where.activo = true;
  }

  return prisma.cliente.findMany({
    where,
    include: {
      personaFisica: true,
      personaJuridica: true,
    },
    orderBy: { nombreRazonSocial: 'asc' },
  });
}

// ------------------------------------------
// OBTENER UN CLIENTE POR ID
// Por defecto solo trae clientes activos (protege contra
// recuperar soft-deleted por id directo). Pasando
// incluirInactivos = true se puede traer aunque esté inactivo
// (mismo patrón usado en expedientes.service.js).
// Incluye también sus expedientes, útil para la vista de detalle.
// ------------------------------------------
async function obtenerClientePorId(id, incluirInactivos = false) {
  const where = { id: Number(id) };

  if (!incluirInactivos) {
    where.activo = true;
  }

  return prisma.cliente.findUnique({
    where,
    include: {
      personaFisica: true,
      personaJuridica: true,
      expedientes: true,
    },
  });
}

// ------------------------------------------
// ACTUALIZAR CLIENTE
// No permite editar "tipo": cambiar de FISICA a JURIDICA (o
// viceversa) implicaría destruir una extensión y crear otra,
// una operación estructural rara en la práctica (ver decisión
// de diseño documentada). Si se cargó mal, se soft-deletea este
// cliente y se crea uno nuevo con el tipo correcto.
//
// SÍ permite editar "ruc" y los campos de la extensión
// (cedula/digitoVerificador/fechaNacimiento si es FISICA,
// tipoSocietario/fechaConstitucion si es JURIDICA): son datos
// propios de esa entidad, un typo no debe obligar a recrear
// el cliente entero.
//
// Usa $transaction porque son dos updates relacionados (Cliente
// + su extensión): si uno fallara, no queremos que el otro quede
// aplicado a medias.
// ------------------------------------------
async function actualizarCliente(id, datos) {
  const {
    ruc,
    nombreRazonSocial,
    tipoAtencion,
    email,
    telefono,
    direccion,
    activo,
    // Extensión física
    cedula,
    digitoVerificador,
    fechaNacimiento,
    // Extensión jurídica
    tipoSocietario,
    fechaConstitucion,
    representanteLegal, // NUEVO (en el destructuring)
  } = datos;

  const clienteId = Number(id);

  return prisma.$transaction(async (tx) => {
    // Primero actualiza los datos base del Cliente
    const clienteActualizado = await tx.cliente.update({
      where: { id: clienteId },
      data: {
        ruc: siVino(ruc),
        nombreRazonSocial: siVino(nombreRazonSocial),
        tipoAtencion: siVino(tipoAtencion),
        email: siVino(email),
        telefono: siVino(telefono),
        direccion: siVino(direccion),
        activo: siVino(activo),
      },
    });

    // Según el tipo YA GUARDADO en la base (no editable), actualiza
    // la extensión correspondiente, solo si vino algún dato para ella.
    const hayDatosFisica = cedula !== undefined || digitoVerificador !== undefined || fechaNacimiento !== undefined;
    const hayDatosJuridica = tipoSocietario !== undefined || fechaConstitucion !== undefined || representanteLegal !== undefined;

    if (clienteActualizado.tipo === 'FISICA' && hayDatosFisica) {
      await tx.clientePersonaFisica.update({
        where: { clienteId },
        data: {
          cedula: siVino(cedula),
          digitoVerificador: digitoVerificador !== undefined
            ? (digitoVerificador !== null ? Number(digitoVerificador) : null)
            : undefined,
          fechaNacimiento: fechaNacimiento !== undefined
            ? (fechaNacimiento ? new Date(fechaNacimiento) : null)
            : undefined,
        },
      });
    }

    if (clienteActualizado.tipo === 'JURIDICA' && hayDatosJuridica) {
      await tx.clientePersonaJuridica.update({
        where: { clienteId },
        data: {
          tipoSocietario: siVino(tipoSocietario),
          fechaConstitucion: fechaConstitucion !== undefined
            ? (fechaConstitucion ? new Date(fechaConstitucion) : null)
            : undefined,
          representanteLegal: siVino(representanteLegal), // NUEVO
        },
      });
    }

    // Devuelve el cliente completo y actualizado, con su extensión
    return tx.cliente.findUnique({
      where: { id: clienteId },
      include: {
        personaFisica: true,
        personaJuridica: true,
      },
    });
  });
}

module.exports = {
  crearCliente,
  listarClientes,
  obtenerClientePorId,
  actualizarCliente,
};