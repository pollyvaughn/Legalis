// ============================================================
// OBLIGACIONES SERVICE — Módulo 1.3
// Obligaciones periódicas (ej: "IVA general mensual" de un cliente)
// y generación de sus vencimientos (filas de la tabla Tramite).
// ============================================================
const prisma = require('../../config/database');
const { ErrorNegocio } = require('../../utils/errores');
const { registrarAuditoria } = require('../../utils/auditoria');
const { terminacionRuc, calcularVencimientosDelAnio, fechaDeHoy } = require('../../utils/calendarioRuc');
const { siVino, limpiarTexto } = require('../../utils/entrada');

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
// Ahora recibe usuarioId para la auditoría.
// ------------------------------------------------------------
const crearObligacion = async ({ clienteId, tipoTramiteId, periodicidad, mesAnual, observaciones }, usuarioId) => {
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { id: true, ruc: true, activo: true },
  });
  if (!cliente) throw new ErrorNegocio('Cliente no encontrado', 404);
  if (!cliente.activo) throw new ErrorNegocio('El cliente está inactivo', 409);
  terminacionRuc(cliente.ruc);

  const tipo = await prisma.tipoTramite.findUnique({ where: { id: tipoTramiteId } });
  if (!tipo) throw new ErrorNegocio('Trámite no encontrado en el catálogo', 404);
  if (!tipo.activo) throw new ErrorNegocio('El trámite del catálogo está inactivo', 409);

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

    await registrarAuditoria(tx, {
      usuarioId,
      accion: 'CREAR',
      entidad: 'ObligacionPeriodica',
      entidadId: obligacion.id,
      detalle: `${obligacion.tipoTramite.nombre} para ${obligacion.cliente.nombreRazonSocial} (${generados} vencimiento(s) generado(s))`,
    });

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
// Ahora recibe usuarioId para la auditoría. Acción BAJA (no
// INACTIVAR): RN-17 la trata como definitiva, distinta de
// inactivar/reactivar un cliente o expediente que sí se puede revertir.
// ------------------------------------------------------------
const inactivarObligacion = async (id, usuarioId) => {
  const obligacion = await prisma.obligacionPeriodica.findUnique({
    where: { id },
    include: INCLUIR_RELACIONES,
  });
  if (!obligacion) throw new ErrorNegocio('Obligación no encontrada', 404);
  if (!obligacion.activa) throw new ErrorNegocio('La obligación ya está inactiva', 409);

  const hoy = fechaDeHoy();

  return prisma.$transaction(async (tx) => {
    const { count } = await tx.tramite.deleteMany({
      where: {
        obligacionId: id,
        estado: 'PENDIENTE',
        fechaVencimiento: { gt: hoy },
        documentos: { none: {} },
      },
    });
    const actualizada = await tx.obligacionPeriodica.update({
      where: { id },
      data: { activa: false },
    });

    await registrarAuditoria(tx, {
      usuarioId,
      accion: 'BAJA',
      entidad: 'ObligacionPeriodica',
      entidadId: id,
      detalle: `${obligacion.tipoTramite.nombre} de ${obligacion.cliente.nombreRazonSocial} (${count} vencimiento(s) futuro(s) descartado(s))`,
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
// Ahora recibe usuarioId para la auditoría. Se envuelve en
// $transaction (antes usaba "prisma" directo) para que la
// generación y el registro de auditoría sean atómicos.
// ------------------------------------------------------------
const generarSiguienteAnio = async (id, usuarioId) => {
  const obligacion = await prisma.obligacionPeriodica.findUnique({
    where: { id },
    include: { cliente: { select: { ruc: true, nombreRazonSocial: true } }, tipoTramite: { select: { nombre: true } } },
  });
  if (!obligacion) throw new ErrorNegocio('Obligación no encontrada', 404);
  if (!obligacion.activa) throw new ErrorNegocio('La obligación está inactiva: no se generan más vencimientos', 409);

  const hoy = fechaDeHoy();
  const anioActual = hoy.getUTCFullYear();

  return prisma.$transaction(async (tx) => {
    const generados = await generarVencimientos(tx, obligacion, obligacion.cliente.ruc, [anioActual, anioActual + 1], hoy);

    await registrarAuditoria(tx, {
      usuarioId,
      accion: 'EDITAR', // no hay una acción propia de "generar"; se documenta en el detalle
      entidad: 'ObligacionPeriodica',
      entidadId: id,
      detalle: `Generación año siguiente: ${obligacion.tipoTramite.nombre} de ${obligacion.cliente.nombreRazonSocial} (${generados} nuevo(s))`,
    });

    return { generados };
  });
};

// ------------------------------------------------------------
// HELPER: criterioFuturosSeguros
// Vencimientos de una obligación que se pueden borrar sin perder
// historial: futuros (después de hoy), todavía PENDIENTES y sin
// documentos, SIN honorarios y SIN gastos (Módulo 3: si la abogada ya
// cargó el honorario mensual en ese trámite, no se descarta; además
// la FK es Restrict y un deleteMany fallaba con un 500).
// Si se pasa "anio", solo los de ese año (por el "periodo").
// Lo usan la edición de la obligación y "quitar futuros".
// ------------------------------------------------------------
const criterioFuturosSeguros = (obligacionId, hoy, anio) => ({
  obligacionId,
  estado: 'PENDIENTE',
  fechaVencimiento: { gt: hoy },
  documentos: { none: {} },
  liquidaciones: { none: {} },
  gastos: { none: {} },
  ...(anio && { periodo: { startsWith: `${anio}-` } }),
});

// ------------------------------------------------------------
// ACTUALIZAR obligación (periodicidad, mesAnual y/o observaciones)
// Cliente y trámite NO se cambian (son la identidad de la obligación).
// Si cambia la periodicidad o el mes:
//   1. se borran los vencimientos futuros pendientes sin documentos
//   2. se regeneran con la nueva configuración, para el año en curso y
//      para los años siguientes que ya tenían vencimientos
// Lo pasado y lo que ya tuvo movimiento queda como historial.
// Todo en una transacción. Devuelve { obligacion, eliminados, generados }.
// ------------------------------------------------------------
const actualizarObligacion = async (id, datos, usuarioId) => {
  const actual = await prisma.obligacionPeriodica.findUnique({
    where: { id },
    include: { cliente: { select: { ruc: true, nombreRazonSocial: true } }, tipoTramite: { select: { nombre: true } } },
  });
  if (!actual) throw new ErrorNegocio('Obligación no encontrada', 404);
  if (!actual.activa) throw new ErrorNegocio('La obligación está inactiva y no se puede editar', 409);

  const periodicidad = datos.periodicidad ?? actual.periodicidad;
  const mesAnual = periodicidad === 'ANUAL' ? (datos.mesAnual ?? actual.mesAnual) : null;
  if (periodicidad === 'ANUAL' && !mesAnual) {
    throw new ErrorNegocio('Para una obligación anual hay que indicar el mes (1 a 12)', 400);
  }

  const cambioConfig = periodicidad !== actual.periodicidad || mesAnual !== actual.mesAnual;

  const data = { periodicidad, mesAnual };
  if (siVino(datos, 'observaciones')) data.observaciones = limpiarTexto(datos.observaciones);

  const hoy = fechaDeHoy();
  const anioActual = hoy.getUTCFullYear();
  const descripcion = `${actual.tipoTramite.nombre} de ${actual.cliente.nombreRazonSocial}`;

  return prisma.$transaction(async (tx) => {
    if (!cambioConfig) {
      const obligacion = await tx.obligacionPeriodica.update({ where: { id }, data, include: INCLUIR_RELACIONES });

      await registrarAuditoria(tx, {
        usuarioId,
        accion: 'EDITAR',
        entidad: 'ObligacionPeriodica',
        entidadId: id,
        detalle: descripcion,
      });

      return { obligacion, eliminados: 0, generados: 0 };
    }

    const existentes = await tx.tramite.findMany({ where: { obligacionId: id }, select: { periodo: true } });
    const anios = new Set([anioActual]);
    existentes.forEach(({ periodo }) => {
      const anio = Number(periodo?.slice(0, 4));
      if (anio >= anioActual) anios.add(anio);
    });

    const { count: eliminados } = await tx.tramite.deleteMany({ where: criterioFuturosSeguros(id, hoy) });

    const obligacion = await tx.obligacionPeriodica.update({ where: { id }, data, include: INCLUIR_RELACIONES });
    const generados = await generarVencimientos(
      tx,
      obligacion,
      actual.cliente.ruc,
      [...anios].sort((a, b) => a - b),
      hoy
    );

    await registrarAuditoria(tx, {
      usuarioId,
      accion: 'EDITAR',
      entidad: 'ObligacionPeriodica',
      entidadId: id,
      detalle: `${descripcion} (config. cambiada: ${eliminados} descartado(s), ${generados} regenerado(s))`,
    });

    return { obligacion, eliminados, generados };
  });
};

// ------------------------------------------------------------
// QUITAR VENCIMIENTOS FUTUROS (sirve para deshacer una generación por error)
// Borra los futuros pendientes sin documentos, de todos los años o de
// uno solo (anio). La obligación sigue activa; se pueden volver a
// generar con "Generar siguiente año".
// Ahora recibe usuarioId para la auditoría. Envuelto en
// $transaction para que el borrado y el registro sean atómicos.
// ------------------------------------------------------------
const quitarVencimientosFuturos = async (id, anio, usuarioId) => {
  const obligacion = await prisma.obligacionPeriodica.findUnique({
    where: { id },
    include: INCLUIR_RELACIONES,
  });
  if (!obligacion) throw new ErrorNegocio('Obligación no encontrada', 404);

  return prisma.$transaction(async (tx) => {
    const { count } = await tx.tramite.deleteMany({
      where: criterioFuturosSeguros(id, fechaDeHoy(), anio),
    });

    await registrarAuditoria(tx, {
      usuarioId,
      accion: 'EDITAR',
      entidad: 'ObligacionPeriodica',
      entidadId: id,
      detalle: `Quitar futuros: ${obligacion.tipoTramite.nombre} de ${obligacion.cliente.nombreRazonSocial}${anio ? ` (año ${anio})` : ''} — ${count} eliminado(s)`,
    });

    return { eliminados: count };
  });
};

module.exports = {
  crearObligacion,
  listarObligaciones,
  obtenerObligacion,
  actualizarObligacion,
  inactivarObligacion,
  quitarVencimientosFuturos,
  generarSiguienteAnio,
};