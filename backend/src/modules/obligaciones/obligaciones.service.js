// ============================================================
// OBLIGACIONES SERVICE — Módulo 1.3
// Obligaciones periódicas (ej: "IVA general mensual" de un cliente)
// y generación de sus vencimientos (filas de la tabla Tramite).
// ============================================================
const prisma = require('../../config/database');
const { ErrorNegocio } = require('../../utils/errores');
const { terminacionRuc, calcularVencimientosDelAnio, fechaDeHoy } = require('../../utils/calendarioRuc');

// Datos del cliente y del trámite que se muestran junto a cada obligación
const INCLUIR_RELACIONES = {
  cliente: { select: { id: true, nombreRazonSocial: true, ruc: true } },
  tipoTramite: { select: { id: true, nombre: true } },
};

// ------------------------------------------------------------
// HELPER: generarVencimientos
// Calcula los vencimientos de los años indicados y los inserta como
// Tramite. Devuelve cuántos se crearon.
//  - "db" es prisma o una transacción (tx): así sirve para ambos casos.
//  - skipDuplicates: si un período ya existe (unique obligacionId +
//    periodo) se salta en silencio. Por eso se puede ejecutar varias
//    veces sin duplicar nada (es idempotente).
//  - "hoy" hace que solo se creen vencimientos de hoy en adelante.
// ------------------------------------------------------------
const generarVencimientos = async (db, obligacion, ruc, anios, hoy) => {
  const filas = anios.flatMap((anio) =>
    calcularVencimientosDelAnio({
      ruc,
      periodicidad: obligacion.periodicidad,
      mesAnual: obligacion.mesAnual,
      anio,
      desde: hoy,
    }).map((v) => ({
      clienteId: obligacion.clienteId,
      tipoTramiteId: obligacion.tipoTramiteId,
      obligacionId: obligacion.id,
      periodo: v.periodo,
      fechaVencimiento: v.fechaVencimiento,
    }))
  );

  if (filas.length === 0) return 0;
  const { count } = await db.tramite.createMany({ data: filas, skipDuplicates: true });
  return count;
};

// ------------------------------------------------------------
// CREAR obligación + generar los vencimientos del año en curso
// Todo en UNA transacción: si algo falla, no queda nada a medias.
// ------------------------------------------------------------
const crearObligacion = async ({ clienteId, tipoTramiteId, periodicidad, mesAnual, observaciones }) => {
  // --- Cliente: debe existir, estar activo y tener un RUC válido ---
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { id: true, ruc: true, activo: true },
  });
  if (!cliente) throw new ErrorNegocio('Cliente no encontrado', 404);
  if (!cliente.activo) throw new ErrorNegocio('El cliente está inactivo', 409);
  terminacionRuc(cliente.ruc); // lanza error claro si falta el RUC o tiene formato inválido

  // --- Trámite del catálogo: debe existir y estar activo ---
  const tipo = await prisma.tipoTramite.findUnique({ where: { id: tipoTramiteId } });
  if (!tipo) throw new ErrorNegocio('Trámite no encontrado en el catálogo', 404);
  if (!tipo.activo) throw new ErrorNegocio('El trámite del catálogo está inactivo', 409);

  // --- No puede haber dos obligaciones ACTIVAS del mismo trámite para el mismo cliente ---
  const repetida = await prisma.obligacionPeriodica.findFirst({
    where: { clienteId, tipoTramiteId, activa: true },
  });
  if (repetida) {
    throw new ErrorNegocio('Este cliente ya tiene una obligación periódica activa de este trámite', 409);
  }

  const hoy = fechaDeHoy();
  const anioActual = hoy.getUTCFullYear();

  return prisma.$transaction(async (tx) => {
    const obligacion = await tx.obligacionPeriodica.create({
      data: { clienteId, tipoTramiteId, periodicidad, mesAnual, observaciones },
      include: INCLUIR_RELACIONES,
    });
    const generados = await generarVencimientos(tx, obligacion, cliente.ruc, [anioActual], hoy);
    return { obligacion, generados };
  });
};

// ------------------------------------------------------------
// LISTAR (filtros: clienteId, tipoTramiteId, estado)
// estado: 'activas' (por defecto) | 'inactivas' | 'todas'
// Sin paginación: son pocas decenas por estudio.
// ------------------------------------------------------------
const listarObligaciones = async ({ clienteId, tipoTramiteId, estado = 'activas' } = {}) => {
  const where = {};
  if (clienteId) where.clienteId = clienteId;
  if (tipoTramiteId) where.tipoTramiteId = tipoTramiteId;
  if (estado === 'activas') where.activa = true;
  else if (estado === 'inactivas') where.activa = false;

  return prisma.obligacionPeriodica.findMany({
    where,
    orderBy: [{ cliente: { nombreRazonSocial: 'asc' } }, { tipoTramite: { nombre: 'asc' } }],
    include: { ...INCLUIR_RELACIONES, _count: { select: { tramites: true } } },
  });
};

// ------------------------------------------------------------
// OBTENER POR ID (con todos sus vencimientos, del más próximo al más lejano)
// Devuelve null si no existe (el controller responde 404).
// ------------------------------------------------------------
const obtenerObligacion = async (id) => {
  return prisma.obligacionPeriodica.findUnique({
    where: { id },
    include: {
      ...INCLUIR_RELACIONES,
      tramites: {
        orderBy: { fechaVencimiento: 'asc' },
        select: { id: true, periodo: true, fechaVencimiento: true, estado: true },
      },
    },
  });
};

// ------------------------------------------------------------
// INACTIVAR (baja de la obligación)
//  - Se BORRAN los vencimientos futuros que sigan PENDIENTES y no
//    tengan documentos: son fechas que nunca ocurrieron.
//  - Se CONSERVAN los pasados y cualquiera con actividad (otro
//    estado, o documentos registrados): es el historial.
//  - "Futuro" = estrictamente después de hoy.
// La baja es definitiva: si el cliente retoma el servicio, se crea
// una obligación nueva (el historial viejo queda separado).
// ------------------------------------------------------------
const inactivarObligacion = async (id) => {
  const obligacion = await prisma.obligacionPeriodica.findUnique({ where: { id } });
  if (!obligacion) throw new ErrorNegocio('Obligación no encontrada', 404);
  if (!obligacion.activa) throw new ErrorNegocio('La obligación ya está inactiva', 409);

  const hoy = fechaDeHoy();

  return prisma.$transaction(async (tx) => {
    const { count } = await tx.tramite.deleteMany({
      where: {
        obligacionId: id,
        estado: 'PENDIENTE',
        fechaVencimiento: { gt: hoy },
        documentos: { none: {} }, // sin ningún documento registrado
      },
    });
    const actualizada = await tx.obligacionPeriodica.update({
      where: { id },
      data: { activa: false },
    });
    return { obligacion: actualizada, eliminados: count };
  });
};

// ------------------------------------------------------------
// GENERAR SIGUIENTE AÑO (botón "Generar vencimientos del siguiente año")
// Completa el año en curso y el siguiente. Como salta los períodos que
// ya existen, se puede apretar las veces que sea sin duplicar, y si se
// olvidó un año, el botón lo cubre igual.
// Devuelve cuántos vencimientos NUEVOS se crearon.
// ------------------------------------------------------------
const generarSiguienteAnio = async (id) => {
  const obligacion = await prisma.obligacionPeriodica.findUnique({
    where: { id },
    include: { cliente: { select: { ruc: true } } },
  });
  if (!obligacion) throw new ErrorNegocio('Obligación no encontrada', 404);
  if (!obligacion.activa) throw new ErrorNegocio('La obligación está inactiva: no se generan más vencimientos', 409);

  const hoy = fechaDeHoy();
  const anioActual = hoy.getUTCFullYear();
  const generados = await generarVencimientos(prisma, obligacion, obligacion.cliente.ruc, [anioActual, anioActual + 1], hoy);
  return { generados };
};

module.exports = {
  crearObligacion,
  listarObligaciones,
  obtenerObligacion,
  inactivarObligacion,
  generarSiguienteAnio,
};