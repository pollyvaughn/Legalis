// ============================================================
// SERVICE: TipoPlazo
// Catálogo de plazos habituales (ej. "Contestación civil", 18
// días hábiles). Mismo patrón que TipoTramite (Módulo 1.3):
// si tiene PlazoJudicial asociados, no se elimina (se inactiva);
// si nunca se usó, se puede eliminar libremente.
// ============================================================

const prisma = require('../../config/database');

// ------------------------------------------------------------
// Crear tipo de plazo
// ------------------------------------------------------------
async function crear(datos) {
  const { nombre, fuero, diasDefault, modalidadDefault } = datos;

  // @@unique([nombre, fuero]) en el schema ya lo protege a nivel
  // de base, pero validamos antes para devolver un mensaje claro
  // en vez de que Prisma tire un error crudo de constraint.
  const existente = await prisma.tipoPlazo.findFirst({
    where: { nombre, fuero: fuero ?? 'TODOS' },
  });
  if (existente) {
    const error = new Error('Ya existe un tipo de plazo con ese nombre para ese fuero.');
    error.status = 400;
    throw error;
  }

  return prisma.tipoPlazo.create({
    data: {
      nombre,
      fuero: fuero ?? 'TODOS',
      diasDefault,
      modalidadDefault: modalidadDefault ?? 'HABILES',
    },
  });
}

// ------------------------------------------------------------
// Listar tipos de plazo
// estado: 'activos' (default) | 'inactivos' | 'todos' — mismo
// patrón que tipos-tramite. busqueda filtra por nombre (contains,
// insensitive). Incluye _count.plazos: la pantalla de catálogo lo
// usa para decidir si el tipo se puede eliminar (solo si nunca se
// usó, ver eliminar() más abajo).
// ------------------------------------------------------------
async function listar({ estado = 'activos', busqueda } = {}) {
  const filtroActivo =
    estado === 'activos' ? { activo: true } : estado === 'inactivos' ? { activo: false } : {};

  return prisma.tipoPlazo.findMany({
    where: {
      ...filtroActivo,
      ...(busqueda ? { nombre: { contains: busqueda, mode: 'insensitive' } } : {}),
    },
    orderBy: [{ fuero: 'asc' }, { nombre: 'asc' }],
    include: {
      _count: { select: { plazos: true } },
    },
  });
}

// ------------------------------------------------------------
// Obtener un tipo de plazo puntual
// ------------------------------------------------------------
async function obtenerPorId(id) {
  const tipoPlazo = await prisma.tipoPlazo.findUnique({ where: { id } });
  if (!tipoPlazo) {
    const error = new Error('Tipo de plazo no encontrado.');
    error.status = 404;
    throw error;
  }
  return tipoPlazo;
}

// ------------------------------------------------------------
// Editar tipo de plazo
// Editar diasDefault/modalidadDefault NO afecta a los plazos ya
// creados con ese tipo (esos valores se copiaron al crear el
// PlazoJudicial — ver comentario en el schema). Solo cambia la
// sugerencia para plazos futuros.
// ------------------------------------------------------------
async function actualizar(id, datos) {
  await obtenerPorId(id); // valida existencia (404 si no está)

  const { nombre, fuero, diasDefault, modalidadDefault } = datos;

  return prisma.tipoPlazo.update({
    where: { id },
    data: { nombre, fuero, diasDefault, modalidadDefault },
  });
}

// ------------------------------------------------------------
// Inactivar / reactivar
// ------------------------------------------------------------
async function cambiarActivo(id, activo) {
  await obtenerPorId(id); // valida existencia (404 si no está)
  return prisma.tipoPlazo.update({ where: { id }, data: { activo } });
}

// ------------------------------------------------------------
// Eliminar tipo de plazo
// Solo si nunca se usó (sin PlazoJudicial asociados). Si tiene
// uso, se debe inactivar en vez de eliminar.
// ------------------------------------------------------------
async function eliminar(id) {
  await obtenerPorId(id); // valida existencia (404 si no está)

  const cantidadPlazos = await prisma.plazoJudicial.count({
    where: { tipoPlazoId: id },
  });
  if (cantidadPlazos > 0) {
    const error = new Error(
      'No se puede eliminar: este tipo de plazo ya tiene plazos judiciales asociados. Inactívelo en su lugar.'
    );
    error.status = 400;
    throw error;
  }

  await prisma.tipoPlazo.delete({ where: { id } });
}

module.exports = {
  crear,
  listar,
  obtenerPorId,
  actualizar,
  cambiarActivo,
  eliminar,
};