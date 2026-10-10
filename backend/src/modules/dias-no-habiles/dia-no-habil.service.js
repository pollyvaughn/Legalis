// ============================================================
// SERVICE: DiaNoHabil
// Feriados nacionales, asuetos locales y feria judicial — una
// sola tabla (ver nota en el schema). Sin campo 'activo': si se
// cargó mal, se corrige o se elimina directamente (no hay plazos
// ya calculados que dependan de una fila puntual de esta tabla,
// así que no hace falta conservar historial de bajas acá).
//
// AUDITORÍA (RN-41): crear, editar y eliminar quedan registrados
// dentro de la misma transacción que el cambio. Importa porque
// borrar o cambiar un feriado altera los cálculos futuros de plazos.
// ============================================================

const prisma = require('../../config/database');
const { registrarAuditoria } = require('../../utils/auditoria');

// ------------------------------------------------------------
// Helper interno: Date (UTC, de una columna @db.Date) -> "DD/MM/AAAA"
// ------------------------------------------------------------
function formatearFechaUtc(fecha) {
  const [anio, mes, dia] = new Date(fecha).toISOString().slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
}

// ------------------------------------------------------------
// Helper interno: descripción corta para la auditoría.
// Un día: "Navidad (25/12/2026)". Rango: "Feria judicial (01/01/2027 al 31/01/2027)"
// ------------------------------------------------------------
function descripcionDiaNoHabil(dia) {
  const desde = formatearFechaUtc(dia.fechaDesde);
  const fechas = dia.fechaHasta ? `${desde} al ${formatearFechaUtc(dia.fechaHasta)}` : desde;
  return `${dia.descripcion} (${fechas})`;
}

// ------------------------------------------------------------
// Crear día no hábil (o rango) (+ auditoría CREAR)
// fechaHasta es opcional: si no viene, es un solo día.
// Ahora recibe usuarioId (2do parámetro) para la auditoría.
// ------------------------------------------------------------
async function crear(datos, usuarioId) {
  const { fechaDesde, fechaHasta, descripcion } = datos;

  const desde = new Date(fechaDesde);
  const hasta = fechaHasta ? new Date(fechaHasta) : null;

  if (hasta && hasta < desde) {
    const error = new Error('fechaHasta no puede ser anterior a fechaDesde.');
    error.status = 400;
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    const dia = await tx.diaNoHabil.create({
      data: { fechaDesde: desde, fechaHasta: hasta, descripcion },
    });

    await registrarAuditoria(tx, {
      usuarioId,
      accion: 'CREAR',
      entidad: 'DiaNoHabil',
      entidadId: dia.id,
      detalle: descripcionDiaNoHabil(dia),
    });

    return dia;
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
// Editar (+ auditoría EDITAR)
// Ahora recibe usuarioId (3er parámetro) para la auditoría.
// ------------------------------------------------------------
async function actualizar(id, datos, usuarioId) {
  await obtenerPorId(id); // valida existencia (404 si no está)

  const { fechaDesde, fechaHasta, descripcion } = datos;

  const desde = fechaDesde ? new Date(fechaDesde) : undefined;
  const hasta = fechaHasta ? new Date(fechaHasta) : undefined;

  if (desde && hasta && hasta < desde) {
    const error = new Error('fechaHasta no puede ser anterior a fechaDesde.');
    error.status = 400;
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    const dia = await tx.diaNoHabil.update({
      where: { id },
      data: { fechaDesde: desde, fechaHasta: hasta, descripcion },
    });

    await registrarAuditoria(tx, {
      usuarioId,
      accion: 'EDITAR',
      entidad: 'DiaNoHabil',
      entidadId: id,
      detalle: descripcionDiaNoHabil(dia),
    });

    return dia;
  });
}

// ------------------------------------------------------------
// Eliminar (+ auditoría ELIMINAR)
// Sin restricciones: no hay ninguna FK que apunte a DiaNoHabil
// (los cálculos ya hechos guardaron su resultado en
// PlazoJudicial.fechaVencimiento, no una referencia viva a esta
// tabla), así que borrar una fila acá nunca rompe nada existente.
// La descripción se arma ANTES de borrar (después ya no se puede
// leer de la base).
// Ahora recibe usuarioId (2do parámetro) para la auditoría.
// ------------------------------------------------------------
async function eliminar(id, usuarioId) {
  const dia = await obtenerPorId(id); // valida existencia (404 si no está)

  await prisma.$transaction(async (tx) => {
    await tx.diaNoHabil.delete({ where: { id } });

    await registrarAuditoria(tx, {
      usuarioId,
      accion: 'ELIMINAR',
      entidad: 'DiaNoHabil',
      entidadId: id,
      detalle: descripcionDiaNoHabil(dia),
    });
  });
}

module.exports = {
  crear,
  listar,
  obtenerPorId,
  actualizar,
  eliminar,
};