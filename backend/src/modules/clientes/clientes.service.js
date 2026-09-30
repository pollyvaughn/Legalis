// ============================================
// CLIENTES.SERVICE.JS
// Lógica de acceso a datos para Cliente, usando Prisma.
// No conoce req/res de Express — solo recibe y devuelve datos.
// ============================================

const prisma = require('../../config/database');
const { registrarAuditoria } = require('../../utils/auditoria');

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
// (mismo comportamiento de antes) + registra auditoría CREAR.
// Ahora recibe usuarioId como 2do parámetro para saber quién lo hizo.
// ------------------------------------------
async function crearCliente(datos, usuarioId) {
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
    representanteLegal,
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
        representanteLegal,
      },
    };
  }

  // Transacción: crear cliente + registrar auditoría, todo o nada
  return prisma.$transaction(async (tx) => {
    const cliente = await tx.cliente.create({
      data: dataCliente,
      // "include" trae también los datos de la extensión en la respuesta
      include: {
        personaFisica: true,
        personaJuridica: true,
      },
    });

    await registrarAuditoria(tx, {
      usuarioId,
      accion: 'CREAR',
      entidad: 'Cliente',
      entidadId: cliente.id,
      detalle: `${cliente.nombreRazonSocial} (RUC ${cliente.ruc})`,
    });

    return cliente;
  });
}

// ------------------------------------------
// LISTAR CLIENTES (con filtros y paginación)
// Recibe un objeto de opciones (mismo criterio que
// expedientes.service.js):
//   estado   -> 'activos' (default) | 'inactivos' | 'todos'
//   busqueda -> texto libre: busca en nombre/razón social, RUC,
//               email y cédula (esta última vive en la extensión
//               personaFisica, por eso el filtro anidado)
//   pagina / limite -> paginación (página 1 por defecto, 10 por página)
//
// Devuelve { datos, total, pagina, limite, totalPaginas }.
// ------------------------------------------
async function listarClientes(opciones = {}) {
  const { estado = 'activos', busqueda, pagina = 1, limite = 10 } = opciones;

  const where = {};

  // Filtro de estado. Con 'todos' no se agrega condición.
  // Cualquier valor desconocido cae en 'activos' (default seguro).
  if (estado === 'inactivos') {
    where.activo = false;
  } else if (estado !== 'todos') {
    where.activo = true;
  }

  if (busqueda) {
    // OR: alcanza con que coincida en uno de los campos
    where.OR = [
      { nombreRazonSocial: { contains: busqueda, mode: 'insensitive' } },
      { ruc: { contains: busqueda, mode: 'insensitive' } },
      { email: { contains: busqueda, mode: 'insensitive' } },
      // Cédula: campo de la tabla hija (relación 1:1 opcional)
      { personaFisica: { cedula: { contains: busqueda, mode: 'insensitive' } } },
    ];
  }

  // Normaliza paginación: enteros positivos, máximo 100 por página
  const paginaNum = Math.max(1, Number(pagina) || 1);
  const limiteNum = Math.min(100, Math.max(1, Number(limite) || 10));

  // Dos consultas en una transacción: la página y el total (respeta filtros)
  const [datos, total] = await prisma.$transaction([
    prisma.cliente.findMany({
      where,
      include: {
        personaFisica: true,
        personaJuridica: true,
      },
      orderBy: { nombreRazonSocial: 'asc' },
      skip: (paginaNum - 1) * limiteNum, // cuántos saltear
      take: limiteNum,                   // cuántos traer
    }),
    prisma.cliente.count({ where }),
  ]);

  return {
    datos,
    total,
    pagina: paginaNum,
    limite: limiteNum,
    totalPaginas: Math.ceil(total / limiteNum),
  };
}

// ------------------------------------------
// LISTAR OPCIONES DE CLIENTES (para selects/desplegables)
// Devuelve TODOS los clientes ACTIVOS, sin paginar, con solo
// los campos mínimos (id y nombre). Pensado para el select de
// "Cliente" al crear un expediente: ahí hace falta ver a todos
// los clientes posibles, no una página. Solo activos porque un
// cliente inactivo no puede recibir expedientes nuevos.
// ------------------------------------------
async function listarOpcionesClientes() {
  return prisma.cliente.findMany({
    where: { activo: true },
    select: { id: true, nombreRazonSocial: true }, // solo lo necesario, más liviano
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
async function actualizarCliente(id, datos, usuarioId) {
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

    // Registra la auditoría de la edición (dentro de la misma transacción).
    // Si vino "activo" en el body, es una inactivación/reactivación;
    // si no, es una edición común de datos.
    let accion = 'EDITAR';
    if (activo === false) accion = 'INACTIVAR';
    if (activo === true) accion = 'REACTIVAR';

    await registrarAuditoria(tx, {
      usuarioId,
      accion,
      entidad: 'Cliente',
      entidadId: clienteId,
      detalle: `${clienteActualizado.nombreRazonSocial} (RUC ${clienteActualizado.ruc})`,
    });

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
  listarOpcionesClientes,
  obtenerClientePorId,
  actualizarCliente,
};