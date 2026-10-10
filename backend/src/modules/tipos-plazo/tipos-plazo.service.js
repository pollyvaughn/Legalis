// ============================================================
// SERVICE: TipoPlazo
// Catálogo de plazos habituales (ej. "Contestación civil", 18
// días hábiles). Mismo patrón que TipoTramite (Módulo 1.3):
// si tiene PlazoJudicial asociados, no se elimina (se inactiva);
// si nunca se usó, se puede eliminar libremente.
//
// AUDITORÍA (RN-41): crear, editar, inactivar/reactivar y
// eliminar quedan registrados, dentro de la misma transacción
// que el cambio (mismo criterio que tipos-tramite.service.js).
// ============================================================

const prisma = require('../../config/database');
const { registrarAuditoria } = require('../../utils/auditoria');

// ------------------------------------------------------------
// Helper interno: descripción corta de un tipo de plazo para la
// auditoría. Ej: "Contestación de demanda civil (CIVIL_COMERCIAL, 18 HABILES)"
// ------------------------------------------------------------
function descripcionTipoPlazo(tipo) {
  return `${tipo.nombre} (${tipo.fuero}, ${tipo.diasDefault} ${tipo.modalidadDefault})`;
}

// ------------------------------------------------------------
// Crear tipo de plazo (+ auditoría CREAR)
// Ahora recibe usuarioId (2do parámetro) para la auditoría.
// ------------------------------------------------------------
async function crear(datos, usuarioId) {
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

  return prisma.$transaction(async (tx) => {
    const tipo = await tx.tipoPlazo.create({
      data: {
        nombre,
        fuero: fuero ?? 'TODOS',
        diasDefault,
        modalidadDefault: modalidadDefault ?? 'HABILES',
      },
    });

    await registrarAuditoria(tx, {
      usuarioId,
      accion: 'CREAR',
      entidad: 'TipoPlazo',
      entidadId: tipo.id,
      detalle: descripcionTipoPlazo(tipo),
    });

    return tipo;
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
// Editar tipo de plazo (+ auditoría EDITAR)
// Editar diasDefault/modalidadDefault NO afecta a los plazos ya
// creados con ese tipo (esos valores se copiaron al crear el
// PlazoJudicial — ver comentario en el schema). Solo cambia la
// sugerencia para plazos futuros.
// Ahora recibe usuarioId (3er parámetro) para la auditoría.
// ------------------------------------------------------------
async function actualizar(id, datos, usuarioId) {
  await obtenerPorId(id); // valida existencia (404 si no está)

  const { nombre, fuero, diasDefault, modalidadDefault } = datos;

  return prisma.$transaction(async (tx) => {
    const tipo = await tx.tipoPlazo.update({
      where: { id },
      data: { nombre, fuero, diasDefault, modalidadDefault },
    });

    await registrarAuditoria(tx, {
      usuarioId,
      accion: 'EDITAR',
      entidad: 'TipoPlazo',
      entidadId: id,
      detalle: descripcionTipoPlazo(tipo),
    });

    return tipo;
  });
}

// ------------------------------------------------------------
// Inactivar / reactivar (+ auditoría INACTIVAR o REACTIVAR)
// Ahora recibe usuarioId (3er parámetro) para la auditoría.
// ------------------------------------------------------------
async function cambiarActivo(id, activo, usuarioId) {
  await obtenerPorId(id); // valida existencia (404 si no está)

  return prisma.$transaction(async (tx) => {
    const tipo = await tx.tipoPlazo.update({ where: { id }, data: { activo } });

    await registrarAuditoria(tx, {
      usuarioId,
      accion: activo ? 'REACTIVAR' : 'INACTIVAR',
      entidad: 'TipoPlazo',
      entidadId: id,
      detalle: descripcionTipoPlazo(tipo),
    });

    return tipo;
  });
}

// ------------------------------------------------------------
// Eliminar tipo de plazo (+ auditoría ELIMINAR)
// Solo si nunca se usó (sin PlazoJudicial asociados). Si tiene
// uso, se debe inactivar en vez de eliminar.
// La descripción se arma ANTES de borrar (después ya no se puede
// leer de la base).
// Ahora recibe usuarioId (2do parámetro) para la auditoría.
// ------------------------------------------------------------
async function eliminar(id, usuarioId) {
  const tipoPlazo = await obtenerPorId(id); // valida existencia (404 si no está)

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

  await prisma.$transaction(async (tx) => {
    await tx.tipoPlazo.delete({ where: { id } });

    await registrarAuditoria(tx, {
      usuarioId,
      accion: 'ELIMINAR',
      entidad: 'TipoPlazo',
      entidadId: id,
      detalle: descripcionTipoPlazo(tipoPlazo),
    });
  });
}

module.exports = {
  crear,
  listar,
  obtenerPorId,
  actualizar,
  cambiarActivo,
  eliminar,
};