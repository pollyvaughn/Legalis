// ============================================================
// AUDITORIA SERVICE
// Consulta de solo lectura sobre la tabla Auditoria.
// No hay create/update/delete: los registros los escriben los
// demás services (ver utils/auditoria.js), nunca el usuario.
// ============================================================
const prisma = require('../../config/database');

// ------------------------------------------------------------
// LISTAR (con filtros y paginación)
// Filtros opcionales: entidad, accion, usuarioId, desde, hasta
// (desde/hasta son fechas, filtran por el campo "fecha")
// ------------------------------------------------------------
const listarAuditoria = async ({
  entidad,
  accion,
  usuarioId,
  desde,
  hasta,
  pagina = 1,
  limite = 20,
} = {}) => {
  const where = {};

  if (entidad) where.entidad = entidad;
  if (accion) where.accion = accion;
  if (usuarioId) where.usuarioId = Number(usuarioId);

  // Rango de fechas: al menos uno de los dos puede venir solo
  if (desde || hasta) {
    where.fecha = {};
    if (desde) where.fecha.gte = new Date(desde);
    if (hasta) {
      // Incluye todo el día "hasta": le suma 23:59:59
      const fin = new Date(hasta);
      fin.setUTCHours(23, 59, 59, 999);
      where.fecha.lte = fin;
    }
  }

  const paginaNum = Math.max(1, Number(pagina) || 1);
  const limiteNum = Math.min(100, Math.max(1, Number(limite) || 20));

  const [datos, total] = await prisma.$transaction([
    prisma.auditoria.findMany({
      where,
      include: {
        usuario: { select: { id: true, nombre: true } }, // para mostrar el nombre, no solo el id
      },
      orderBy: { fecha: 'desc' }, // más reciente primero
      skip: (paginaNum - 1) * limiteNum,
      take: limiteNum,
    }),
    prisma.auditoria.count({ where }),
  ]);

  return {
    datos,
    total,
    pagina: paginaNum,
    limite: limiteNum,
    totalPaginas: Math.ceil(total / limiteNum),
  };
};

// ------------------------------------------------------------
// LISTAR ENTIDADES DISTINTAS (para el filtro tipo <select>)
// Evita hardcodear la lista en el frontend: si mañana agregás
// una entidad nueva, aparece sola.
// ------------------------------------------------------------
const listarEntidades = async () => {
  const filas = await prisma.auditoria.findMany({
    distinct: ['entidad'],
    select: { entidad: true },
    orderBy: { entidad: 'asc' },
  });
  return filas.map((f) => f.entidad);
};

module.exports = { listarAuditoria, listarEntidades };