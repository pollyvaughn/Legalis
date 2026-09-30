// ============================================
// EXPEDIENTES.SERVICE.JS
// Lógica de acceso a datos para Expediente, usando Prisma.
// No conoce req/res de Express — solo recibe y devuelve datos.
// ============================================

const prisma = require('../../config/database');
const { ErrorNegocio } = require('../../utils/errores');
const { registrarAuditoria } = require('../../utils/auditoria');

// ------------------------------------------
// HELPER: siVino
// Devuelve el valor solo si fue enviado (no undefined).
// Sirve para que un PUT parcial (ej: solo { activo: false })
// no pise campos que no vinieron en el body con "undefined".
// ------------------------------------------
function siVino(valor) {
  return valor !== undefined ? valor : undefined;
}

// ------------------------------------------
// HELPER: limpiarTexto
// Quita espacios sobrantes al inicio y al final ("Juzgado 3 " -> "Juzgado 3").
// ------------------------------------------
function limpiarTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : valor;
}

// ------------------------------------------
// HELPER: descripción corta para auditoría
// Arma un texto legible tipo "Exp. 123/2026 - García c/ López"
// a partir de un expediente. Evita repetir el armado en cada función.
// ------------------------------------------
function descripcionExpediente(expediente) {
  return `Exp. ${expediente.numeroExpediente}/${expediente.anio} - ${expediente.caratula}`;
}

// ------------------------------------------
// CREAR EXPEDIENTE
// Requiere un clienteId válido (FK obligatoria) y ACTIVO.
// Ahora recibe usuarioId (2do parámetro) para la auditoría.
// ------------------------------------------
async function crearExpediente(datos, usuarioId) {
  const {
    clienteId,
    numeroExpediente,
    anio,
    caratula,
    fuero,
    jurisdiccion,
    juzgado,
    secretaria,
    objetoJuicio,
    montoJuicio,
    unidadFiscal,
    estadoProcesal,
  } = datos;

  // Regla del checklist 1.1: un cliente inactivo no puede recibir expedientes nuevos.
  // Se valida FUERA de la transacción: es una lectura previa, no una escritura,
  // así que no hace falta que forme parte de la atomicidad de abajo.
  const cliente = await prisma.cliente.findUnique({
    where: { id: Number(clienteId) },
    select: { activo: true },
  });
  if (!cliente) {
    throw new ErrorNegocio('El cliente indicado no existe', 400);
  }
  if (!cliente.activo) {
    throw new ErrorNegocio('El cliente está inactivo: no se le pueden crear expedientes nuevos', 409);
  }

  // Transacción: crear expediente + registrar auditoría, todo o nada
  return prisma.$transaction(async (tx) => {
    const expediente = await tx.expediente.create({
      data: {
        clienteId: Number(clienteId),
        numeroExpediente: limpiarTexto(numeroExpediente),
        anio: Number(anio), // llega como string desde un input HTML
        caratula: limpiarTexto(caratula),
        fuero,
        jurisdiccion,
        juzgado: limpiarTexto(juzgado),
        secretaria,
        objetoJuicio,
        montoJuicio: montoJuicio !== undefined && montoJuicio !== null ? Number(montoJuicio) : null,
        unidadFiscal,
        estadoProcesal: siVino(estadoProcesal),
      },
      include: {
        cliente: true,
      },
    });

    await registrarAuditoria(tx, {
      usuarioId,
      accion: 'CREAR',
      entidad: 'Expediente',
      entidadId: expediente.id,
      detalle: descripcionExpediente(expediente),
    });

    return expediente;
  });
}

// ------------------------------------------
// LISTAR EXPEDIENTES (sin cambios — es solo lectura, no se audita)
// ------------------------------------------
async function listarExpedientes(opciones = {}) {
  const {
    clienteId,
    estado = 'activos',
    fuero,
    estadoProcesal,
    anio,
    juzgado,
    busqueda,
    pagina = 1,
    limite = 10,
  } = opciones;

  const where = {};

  if (estado === 'inactivos') {
    where.activo = false;
  } else if (estado !== 'todos') {
    where.activo = true;
  }
  if (clienteId) {
    where.clienteId = Number(clienteId);
  }
  if (fuero) {
    where.fuero = fuero;
  }
  if (estadoProcesal) {
    where.estadoProcesal = estadoProcesal;
  }
  if (anio) {
    where.anio = Number(anio);
  }
  if (juzgado) {
    where.juzgado = { contains: juzgado, mode: 'insensitive' };
  }
  if (busqueda) {
    where.OR = [
      { numeroExpediente: { contains: busqueda, mode: 'insensitive' } },
      { caratula: { contains: busqueda, mode: 'insensitive' } },
      { cliente: { nombreRazonSocial: { contains: busqueda, mode: 'insensitive' } } },
    ];
  }

  const paginaNum = Math.max(1, Number(pagina) || 1);
  const limiteNum = Math.min(100, Math.max(1, Number(limite) || 10));

  const [datos, total] = await prisma.$transaction([
    prisma.expediente.findMany({
      where,
      include: { cliente: true },
      orderBy: { createdAt: 'desc' },
      skip: (paginaNum - 1) * limiteNum,
      take: limiteNum,
    }),
    prisma.expediente.count({ where }),
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
// OBTENER UN EXPEDIENTE POR ID (sin cambios — solo lectura)
// ------------------------------------------
async function obtenerExpedientePorId(id, incluirInactivos = false) {
  const where = { id: Number(id) };

  if (!incluirInactivos) {
    where.activo = true;
  }

  return prisma.expediente.findUnique({
    where,
    include: {
      cliente: true,
      partes: {
        include: {
          cliente: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      documentosRecibidos: {
        orderBy: [{ fechaRecepcion: 'desc' }, { id: 'desc' }],
      },
    },
  });
}

// ------------------------------------------
// ACTUALIZAR EXPEDIENTE
// Ahora recibe usuarioId (3er parámetro) para la auditoría.
// Igual que en clientes: si vino "activo" en el body, distingue
// INACTIVAR/REACTIVAR de una EDITAR común.
// ------------------------------------------
async function actualizarExpediente(id, datos, usuarioId) {
  console.log('DEBUG actualizarExpediente ->', { id, usuarioId }); // TEMPORAL, borrar después
  const {
    numeroExpediente,
    anio,
    caratula,
    fuero,
    jurisdiccion,
    juzgado,
    secretaria,
    objetoJuicio,
    montoJuicio,
    unidadFiscal,
    estadoProcesal,
    activo,
  } = datos;

  const expedienteId = Number(id);

  return prisma.$transaction(async (tx) => {
    const expedienteActualizado = await tx.expediente.update({
      where: { id: expedienteId },
      data: {
        numeroExpediente: siVino(limpiarTexto(numeroExpediente)),
        anio: anio !== undefined ? Number(anio) : undefined,
        caratula: siVino(limpiarTexto(caratula)),
        fuero: siVino(fuero),
        jurisdiccion: siVino(jurisdiccion),
        juzgado: siVino(limpiarTexto(juzgado)),
        secretaria: siVino(secretaria),
        objetoJuicio: siVino(objetoJuicio),
        montoJuicio: montoJuicio !== undefined && montoJuicio !== null ? Number(montoJuicio) : undefined,
        unidadFiscal: siVino(unidadFiscal),
        estadoProcesal: siVino(estadoProcesal),
        activo: siVino(activo),
      },
      include: {
        cliente: true,
      },
    });

    // Distingue edición común de inactivar/reactivar (mismo criterio que clientes)
    let accion = 'EDITAR';
    if (activo === false) accion = 'INACTIVAR';
    if (activo === true) accion = 'REACTIVAR';

    await registrarAuditoria(tx, {
      usuarioId,
      accion,
      entidad: 'Expediente',
      entidadId: expedienteId,
      detalle: descripcionExpediente(expedienteActualizado),
    });

    return expedienteActualizado;
  });
}

module.exports = {
  crearExpediente,
  listarExpedientes,
  obtenerExpedientePorId,
  actualizarExpediente,
};