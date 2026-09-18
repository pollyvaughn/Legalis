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
// HELPER: limpiarTexto
// Quita espacios sobrantes al inicio y al final ("Juzgado 3 " -> "Juzgado 3").
// Se aplica a los campos que forman la unicidad del expediente
// (numero, juzgado, carátula) para que un espacio de más no
// permita registrar un duplicado real.
// Si el valor no vino (undefined) o es null, lo devuelve tal cual
// para respetar el comportamiento de siVino en los PUT parciales.
// ------------------------------------------
function limpiarTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : valor;
}

// ------------------------------------------
// CREAR EXPEDIENTE
// Requiere un clienteId válido (FK obligatoria).
// anio y juzgado son obligatorios (parte de la identificación única).
// estadoProcesal es opcional: si no viene, Prisma usa el default (EN_TRAMITE).
// ------------------------------------------
async function crearExpediente(datos) {
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

  return prisma.expediente.create({
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
      // montoJuicio es opcional; si viene, lo convertimos a número
      montoJuicio: montoJuicio !== undefined && montoJuicio !== null ? Number(montoJuicio) : null,
      unidadFiscal,
      estadoProcesal: siVino(estadoProcesal), // undefined = usa el default del schema
    },
    // Incluye los datos del cliente en la respuesta, útil para el frontend
    include: {
      cliente: true,
    },
  });
}

// ------------------------------------------
// LISTAR EXPEDIENTES (con filtros y paginación)
// Recibe un objeto de opciones para no depender del orden de
// parámetros posicionales (ya son demasiados):
//   clienteId        -> vista focal por cliente
//   incluirInactivos -> false por defecto: solo activos
//   fuero            -> enum Fuero (match exacto)
//   estadoProcesal   -> enum EstadoProcesal (match exacto)
//   anio             -> año del expediente (match exacto)
//   juzgado          -> búsqueda parcial, sin distinguir mayúsculas
//   busqueda         -> texto libre: busca en número, carátula y
//                       nombre/razón social del cliente
//   pagina / limite  -> paginación (página 1 por defecto, 10 por página)
//
// Devuelve { datos, total, pagina, limite, totalPaginas } para que
// el frontend pueda dibujar los controles de paginación.
// ------------------------------------------
async function listarExpedientes(opciones = {}) {
  const {
    clienteId,
    incluirInactivos = false,
    fuero,
    estadoProcesal,
    anio,
    juzgado,
    busqueda,
    pagina = 1,
    limite = 10,
  } = opciones;

  // Arma el filtro dinámicamente: solo agrega lo que vino
  const where = {};

  if (!incluirInactivos) {
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
    // contains + insensitive = "LIKE %texto%" sin importar mayúsculas
    where.juzgado = { contains: juzgado, mode: 'insensitive' };
  }
  if (busqueda) {
    // OR: alcanza con que coincida en uno de los tres campos
    where.OR = [
      { numeroExpediente: { contains: busqueda, mode: 'insensitive' } },
      { caratula: { contains: busqueda, mode: 'insensitive' } },
      { cliente: { nombreRazonSocial: { contains: busqueda, mode: 'insensitive' } } },
    ];
  }

  // Normaliza paginación: números enteros positivos, máximo 100 por página
  const paginaNum = Math.max(1, Number(pagina) || 1);
  const limiteNum = Math.min(100, Math.max(1, Number(limite) || 10));

  // $transaction con dos consultas: la página de datos y el total
  // (el total ignora skip/take pero respeta los filtros)
  const [datos, total] = await prisma.$transaction([
    prisma.expediente.findMany({
      where,
      include: { cliente: true },
      orderBy: { createdAt: 'desc' },
      skip: (paginaNum - 1) * limiteNum, // cuántos saltear
      take: limiteNum,                   // cuántos traer
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
// numeroExpediente, anio, juzgado y caratula sí se pueden editar
// (permite corregir un typo o registrar un traslado de juzgado);
// si el resultado choca con otro expediente, Prisma lanza P2002
// y el controller lo traduce a un 409.
// ------------------------------------------
async function actualizarExpediente(id, datos) {
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

  return prisma.expediente.update({
    where: { id: Number(id) },
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
}

module.exports = {
  crearExpediente,
  listarExpedientes,
  obtenerExpedientePorId,
  actualizarExpediente,
};