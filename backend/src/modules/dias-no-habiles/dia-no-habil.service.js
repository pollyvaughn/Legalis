// ============================================================
// SERVICE: DiaNoHabil
// Feriados nacionales, asuetos locales y feria judicial — una
// sola tabla (ver nota en el schema). Sin campo 'activo': si se
// cargó mal, se corrige o se elimina directamente (no hay plazos
// ya calculados que dependan de una fila puntual de esta tabla,
// así que no hace falta conservar historial de bajas acá).
// ============================================================

const prisma = require('../../config/database');

// ------------------------------------------------------------
// Crear día no hábil (o rango)
// fechaHasta es opcional: si no viene, es un solo día.
// ------------------------------------------------------------
async function crear(datos) {
  const { fechaDesde, fechaHasta, descripcion } = datos;

  const desde = new Date(fechaDesde);
  const hasta = fechaHasta ? new Date(fechaHasta) : null;

  if (hasta && hasta < desde) {
    const error = new Error('fechaHasta no puede ser anterior a fechaDesde.');
    error.status = 400;
    throw error;
  }

  return prisma.diaNoHabil.create({
    data: { fechaDesde: desde, fechaHasta: hasta, descripcion },
  });
}

// ------------------------------------------------------------
// Listar días no hábiles
// Ordenado por fecha: es lo más útil para revisar el catálogo
// año a año en la pantalla de administración.
// ------------------------------------------------------------
async function listar() {
  return prisma.diaNoHabil.findMany({
    orderBy: { fechaDesde: 'asc' },
  });
}

// ------------------------------------------------------------
// Obtener uno puntual
// ------------------------------------------------------------
async function obtenerPorId(id) {
  const diaNoHabil = await prisma.diaNoHabil.findUnique({ where: { id } });
  if (!diaNoHabil) {
    const error = new Error('Día no hábil no encontrado.');
    error.status = 404;
    throw error;
  }
  return diaNoHabil;
}

// ------------------------------------------------------------
// Editar
// ------------------------------------------------------------
async function actualizar(id, datos) {
  await obtenerPorId(id); // valida existencia (404 si no está)

  const { fechaDesde, fechaHasta, descripcion } = datos;

  const desde = fechaDesde ? new Date(fechaDesde) : undefined;
  const hasta = fechaHasta ? new Date(fechaHasta) : undefined;

  if (desde && hasta && hasta < desde) {
    const error = new Error('fechaHasta no puede ser anterior a fechaDesde.');
    error.status = 400;
    throw error;
  }

  return prisma.diaNoHabil.update({
    where: { id },
    data: { fechaDesde: desde, fechaHasta: hasta, descripcion },
  });
}

// ------------------------------------------------------------
// Eliminar
// Sin restricciones: no hay ninguna FK que apunte a DiaNoHabil
// (los cálculos ya hechos guardaron su resultado en
// PlazoJudicial.fechaVencimiento, no una referencia viva a esta
// tabla), así que borrar una fila acá nunca rompe nada existente.
// ------------------------------------------------------------
async function eliminar(id) {
  await obtenerPorId(id); // valida existencia (404 si no está)
  await prisma.diaNoHabil.delete({ where: { id } });
}

module.exports = {
  crear,
  listar,
  obtenerPorId,
  actualizar,
  eliminar,
};