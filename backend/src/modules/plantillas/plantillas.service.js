// ============================================================
// PLANTILLAS SERVICE — Módulo 1.4 (Biblioteca de escritos)
// Toda la lógica de negocio y acceso a la BD (Prisma).
// El controller solo recibe/devuelve HTTP; acá se decide qué hacer.
// ============================================================
const prisma = require('../../config/database');

// ------------------------------------------------------------
// HELPER: siVino
// Devuelve true si el campo llegó en el body (aunque sea null).
// Sirve para que un PUT parcial no pise campos que no se enviaron.
// ------------------------------------------------------------
const siVino = (obj, campo) => Object.prototype.hasOwnProperty.call(obj, campo);

// ------------------------------------------------------------
// HELPER: limpiarTexto
// Aplica trim() a strings; texto vacío ("") se convierte en null.
// ------------------------------------------------------------
const limpiarTexto = (valor) => {
  if (typeof valor !== 'string') return valor;
  const limpio = valor.trim();
  return limpio === '' ? null : limpio;
};

// ------------------------------------------------------------
// LISTAR (con filtros, búsqueda y paginación en servidor)
// Filtros opcionales: fuero, clase, categoria, origen, busqueda
// Devuelve { datos, total, pagina, limite, totalPaginas }
// ------------------------------------------------------------
const listarPlantillas = async ({
  fuero,
  clase,
  categoria,
  origen,
  busqueda,
  pagina = 1,
  limite = 10,
} = {}) => {
  // Armamos el "where" solo con los filtros que llegaron
  const where = {};
  if (fuero) where.fuero = fuero;
  if (clase) where.clase = clase;
  if (categoria) where.categoria = categoria;
  if (origen) where.origen = origen;

  // Búsqueda libre: título, descripción y también dentro del contenido
  // mode: 'insensitive' = ignora mayúsculas/minúsculas
  if (busqueda && busqueda.trim() !== '') {
    const texto = busqueda.trim();
    where.OR = [
      { titulo: { contains: texto, mode: 'insensitive' } },
      { descripcion: { contains: texto, mode: 'insensitive' } },
      { contenido: { contains: texto, mode: 'insensitive' } },
    ];
  }

  // Paginación: skip = cuántos registros saltear, take = cuántos traer
  const skip = (pagina - 1) * limite;

  // $transaction ejecuta las dos consultas juntas (datos + conteo total)
  const [datos, total] = await prisma.$transaction([
    prisma.plantillaEscrito.findMany({
      where,
      skip,
      take: limite,
      orderBy: { actualizadoEn: 'desc' }, // las editadas más recientemente primero
      // En la LISTA no traemos "contenido" (puede ser largo y no se muestra ahí).
      // Se pide completo solo al abrir el detalle.
      select: {
        id: true,
        titulo: true,
        descripcion: true,
        fuero: true,
        clase: true,
        categoria: true,
        origen: true,
        creadoEn: true,
        actualizadoEn: true,
      },
    }),
    prisma.plantillaEscrito.count({ where }),
  ]);

  return {
    datos,
    total,
    pagina,
    limite,
    totalPaginas: Math.ceil(total / limite),
  };
};

// ------------------------------------------------------------
// OBTENER POR ID (detalle completo, incluye "contenido")
// Devuelve null si no existe (el controller responde 404)
// ------------------------------------------------------------
const obtenerPlantillaPorId = async (id) => {
  return prisma.plantillaEscrito.findUnique({ where: { id } });
};

// ------------------------------------------------------------
// CREAR
// Campos obligatorios: titulo, contenido, clase, categoria
// ------------------------------------------------------------
const crearPlantilla = async (datos) => {
  return prisma.plantillaEscrito.create({
    data: {
      titulo: limpiarTexto(datos.titulo),
      descripcion: limpiarTexto(datos.descripcion),
      contenido: datos.contenido.trim(),
      fuero: datos.fuero || null, // "" -> null (fuero es opcional)
      clase: datos.clase,
      categoria: datos.categoria,
      origen: datos.origen || 'PROPIA',
    },
  });
};

// ------------------------------------------------------------
// ACTUALIZAR (PUT parcial: solo cambia lo que llegó en el body)
// ------------------------------------------------------------
const actualizarPlantilla = async (id, datos) => {
  const data = {};

  if (siVino(datos, 'titulo')) data.titulo = limpiarTexto(datos.titulo);
  if (siVino(datos, 'descripcion')) data.descripcion = limpiarTexto(datos.descripcion);
  if (siVino(datos, 'contenido')) data.contenido = datos.contenido.trim();
  if (siVino(datos, 'fuero')) data.fuero = datos.fuero || null;
  if (siVino(datos, 'clase')) data.clase = datos.clase;
  if (siVino(datos, 'categoria')) data.categoria = datos.categoria;
  if (siVino(datos, 'origen')) data.origen = datos.origen;

  return prisma.plantillaEscrito.update({ where: { id }, data });
};

// ------------------------------------------------------------
// ELIMINAR (HARD-DELETE, decisión 19/09/2026)
// Una plantilla no es un hecho procesal y nada depende de ella.
// ------------------------------------------------------------
const eliminarPlantilla = async (id) => {
  return prisma.plantillaEscrito.delete({ where: { id } });
};

module.exports = {
  listarPlantillas,
  obtenerPlantillaPorId,
  crearPlantilla,
  actualizarPlantilla,
  eliminarPlantilla,
};