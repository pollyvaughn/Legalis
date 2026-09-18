// ============================================
// EXPEDIENTES.SERVICE.JS
// Lógica de acceso a datos para Expediente, usando Prisma.
// No conoce req/res de Express — solo recibe y devuelve datos.
// ============================================

const prisma = require('../../config/database');

// ------------------------------------------
// HELPER: siVino
// Devuelve el valor solo si fue enviado (no undefined).
// Sirve para que un PUT parcial (ej: solo { activo: false })
// no pise campos que no vinieron en el body con "undefined".
// Prisma ignora las keys en undefined, pero lo hacemos explícito
// para que el comportamiento sea claro leyendo el código,
// no algo que "funciona de casualidad".
// ------------------------------------------
function siVino(valor) {
  return valor !== undefined ? valor : undefined;
}

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
    secretaria,
    objetoJuicio,
    montoJuicio,
    unidadFiscal,
  } = datos;

  return prisma.expediente.create({
    data: {
      clienteId: Number(clienteId),
      numeroExpediente,
      caratula,
      fuero,
      jurisdiccion,
      juzgado,
      secretaria,
      objetoJuicio,
      // montoJuicio es opcional; si viene, lo convertimos a número
      montoJuicio: montoJuicio !== undefined && montoJuicio !== null ? Number(montoJuicio) : null,
      unidadFiscal,
    },
    // Incluye los datos del cliente en la respuesta, útil para el frontend
    include: {
      cliente: true,
    },
  });
}

// ------------------------------------------
// LISTAR EXPEDIENTES
// Por defecto solo trae expedientes activos. Pasando
// incluirInactivos = true se traen todos (mismo patrón que
// obtenerExpedientePorId y clientes.service.js, para que el
// frontend pueda ofrecer un filtro Activos/Inactivos/Todos).
// Sigue permitiendo filtrar opcionalmente por clienteId (para
// la "vista focal" del Módulo 1) — ambos filtros son compatibles
// entre sí (ej: "todos los expedientes, activos o no, del cliente X").
// ------------------------------------------
async function listarExpedientes(clienteId, incluirInactivos = false) {
  const where = {};

  if (!incluirInactivos) {
    where.activo = true;
  }

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
// Por defecto solo trae expedientes activos (protege contra
// recuperar soft-deleted por id directo).
// Pasando incluirInactivos = true se puede traer aunque esté
// inactivo — útil, por ejemplo, para una futura pantalla de
// reactivación de expedientes dados de baja.
// Incluye "partes" (ParteProcesal) solo acá, en el detalle:
// es la vista de "expandir expediente" donde tiene sentido ver
// actor/demandado/etc.; el listado general no las necesita.
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
          cliente: true, // por si esa parte también es cliente del estudio
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

// ------------------------------------------
// ACTUALIZAR EXPEDIENTE
// No permite editar clienteId: cambiar el "dueño" de un expediente
// que ya puede tener partes procesales, gastos u honorarios
// asociados es una operación delicada que merece su propio flujo
// explícito más adelante, no un campo más del form de edición.
// numeroExpediente sí se puede editar (permite corregir un typo).
// ------------------------------------------
async function actualizarExpediente(id, datos) {
  const {
    numeroExpediente,
    caratula,
    fuero,
    jurisdiccion,
    juzgado,
    secretaria,
    objetoJuicio,
    montoJuicio,
    unidadFiscal,
    activo,
  } = datos;

  return prisma.expediente.update({
    where: { id: Number(id) },
    data: {
      numeroExpediente: siVino(numeroExpediente),
      caratula: siVino(caratula),
      fuero: siVino(fuero),
      jurisdiccion: siVino(jurisdiccion),
      juzgado: siVino(juzgado),
      secretaria: siVino(secretaria),
      objetoJuicio: siVino(objetoJuicio),
      montoJuicio: montoJuicio !== undefined && montoJuicio !== null ? Number(montoJuicio) : undefined,
      unidadFiscal: siVino(unidadFiscal),
      activo: siVino(activo),
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