// ============================================================
// TRAMITES SERVICE — Módulo 1.3
// Un Tramite = un vencimiento concreto con su estado.
//  - Único: se crea a mano (obligacionId = null).
//  - Periódico: lo genera el service de obligaciones.
// ============================================================
const prisma = require('../../config/database');
const { ErrorNegocio } = require('../../utils/errores');
const { siVino, limpiarTexto } = require('../../utils/entrada');
// Agregar arriba, junto a los otros requires:
const { registrarAuditoria } = require('../../utils/auditoria');
// Semáforo por días: el MISMO que usan los plazos judiciales (RN-24)
const { calcularSemaforo } = require('../../utils/calendarioPlazos');

// "Abiertos" = los que todavía requieren acción
const ESTADOS_ABIERTOS = ['PENDIENTE', 'EN_PROCESO'];

// Datos que se muestran en la lista (cliente, trámite y cantidad de documentos)
const INCLUIR_LISTA = {
  cliente: { select: { id: true, nombreRazonSocial: true, ruc: true } },
  tipoTramite: { select: { id: true, nombre: true } },
  _count: { select: { documentos: true } },
};

// ------------------------------------------------------------
// LISTAR (filtros + búsqueda + paginación en servidor)
//  estado: 'abiertos' (por defecto) | 'todos' | un estado puntual
//  desde / hasta: rango de fechaVencimiento (Date UTC)
//  busqueda: cliente (nombre o RUC), trámite o descripción
// Orden: vencimiento más próximo primero (los vencidos quedan arriba).
// ------------------------------------------------------------
const listarTramites = async ({
  clienteId,
  tipoTramiteId,
  estado = 'abiertos',
  desde,
  hasta,
  busqueda,
  pagina = 1,
  limite = 10,
} = {}) => {
  const where = {};
  if (clienteId) where.clienteId = clienteId;
  if (tipoTramiteId) where.tipoTramiteId = tipoTramiteId;

  if (estado === 'abiertos') where.estado = { in: ESTADOS_ABIERTOS };
  else if (estado !== 'todos') where.estado = estado; // un estado puntual

  // Rango de fechas: gte = mayor o igual, lte = menor o igual
  if (desde || hasta) {
    where.fechaVencimiento = { ...(desde && { gte: desde }), ...(hasta && { lte: hasta }) };
  }

  if (busqueda && busqueda.trim() !== '') {
    const texto = busqueda.trim();
    where.OR = [
      { cliente: { nombreRazonSocial: { contains: texto, mode: 'insensitive' } } },
      { cliente: { ruc: { contains: texto, mode: 'insensitive' } } },
      { tipoTramite: { nombre: { contains: texto, mode: 'insensitive' } } },
      { descripcion: { contains: texto, mode: 'insensitive' } },
    ];
  }

  const skip = (pagina - 1) * limite;

  const [datos, total] = await prisma.$transaction([
    prisma.tramite.findMany({
      where,
      skip,
      take: limite,
      orderBy: [{ fechaVencimiento: 'asc' }, { id: 'asc' }], // id desempata fechas iguales
      include: INCLUIR_LISTA,
    }),
    prisma.tramite.count({ where }),
  ]);

  return { datos, total, pagina, limite, totalPaginas: Math.ceil(total / limite) };
};

// ------------------------------------------------------------
// LISTAR PARA EL CALENDARIO (RF6 / RN-24)
// Trae TODOS los trámites abiertos (pendientes o en proceso), sin
// paginar: el calendario necesita verlos todos juntos, igual que
// con los plazos judiciales. Cada uno sale con su semáforo, calculado
// al vuelo (nunca se guarda) con los mismos cortes que los plazos:
//   VENCIDO (ya pasó) · ROJO (hoy o mañana) · AMARILLO (2 a 5 días) · VERDE
// Son los vencimientos de RUC: los generados por una obligación
// periódica y los únicos cargados a mano.
// ------------------------------------------------------------
const listarParaCalendario = async () => {
  const tramites = await prisma.tramite.findMany({
    where: { estado: { in: ESTADOS_ABIERTOS } },
    orderBy: [{ fechaVencimiento: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      fechaVencimiento: true,
      estado: true,
      descripcion: true,
      cliente: { select: { id: true, nombreRazonSocial: true, ruc: true } },
      tipoTramite: { select: { id: true, nombre: true } },
    },
  });

  return tramites.map((tramite) => ({
    ...tramite,
    semaforo: calcularSemaforo({ fechaVencimiento: tramite.fechaVencimiento }),
  }));
};

// ------------------------------------------------------------
// OBTENER POR ID (detalle completo)
// Devuelve null si no existe (el controller responde 404).
// ------------------------------------------------------------
const obtenerTramite = async (id) => {
  return prisma.tramite.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, nombreRazonSocial: true, ruc: true } },
      tipoTramite: { select: { id: true, nombre: true } },
      obligacion: { select: { id: true, periodicidad: true, mesAnual: true, activa: true } },
      documentos: { orderBy: { fechaRecepcion: 'desc' } },
    },
  });
};

// ------------------------------------------------------------
// CREAR trámite ÚNICO (puntual, con fecha límite cargada a mano)
// Se permite una fecha pasada: sirve para cargar algo ya vencido
// que sigue pendiente.
// ------------------------------------------------------------
const crearTramite = async ({ clienteId, tipoTramiteId, fechaVencimiento, descripcion }, usuarioId) => {
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { id: true, activo: true },
  });
  if (!cliente) throw new ErrorNegocio('Cliente no encontrado', 404);
  if (!cliente.activo) throw new ErrorNegocio('El cliente está inactivo', 409);

  const tipo = await prisma.tipoTramite.findUnique({ where: { id: tipoTramiteId } });
  if (!tipo) throw new ErrorNegocio('Trámite no encontrado en el catálogo', 404);
  if (!tipo.activo) throw new ErrorNegocio('El trámite del catálogo está inactivo', 409);

  return prisma.$transaction(async (tx) => {
    const tramite = await tx.tramite.create({
      data: { clienteId, tipoTramiteId, fechaVencimiento, descripcion: limpiarTexto(descripcion) },
      include: INCLUIR_LISTA,
    });

    await registrarAuditoria(tx, {
      usuarioId,
      accion: 'CREAR',
      entidad: 'Tramite',
      entidadId: tramite.id,
      detalle: descripcionTramite(tramite),
    });

    return tramite;
  });
};

// ------------------------------------------------------------
// ACTUALIZAR (PUT parcial: fechaVencimiento, descripcion y/o estado)
//  - Cliente y tipo de trámite no se cambian (son la identidad del trámite).
//  - En los generados por una obligación, cambiar la fecha sirve para
//    ajustar feriados; "periodo" no cambia (sigue siendo su etiqueta).
//  - El estado puede pasar de cualquiera a cualquiera (por si hubo un error).
// ------------------------------------------------------------
const actualizarTramite = async (id, datos, usuarioId) => {
  const data = {};
  if (siVino(datos, 'fechaVencimiento')) data.fechaVencimiento = datos.fechaVencimiento;
  if (siVino(datos, 'descripcion')) data.descripcion = limpiarTexto(datos.descripcion);
  if (siVino(datos, 'estado')) data.estado = datos.estado;

  return prisma.$transaction(async (tx) => {
    const tramite = await tx.tramite.update({ where: { id }, data, include: INCLUIR_LISTA });

    await registrarAuditoria(tx, {
      usuarioId,
      accion: 'EDITAR',
      entidad: 'Tramite',
      entidadId: id,
      detalle: descripcionTramite(tramite),
    });

    return tramite;
  });
};

// ------------------------------------------------------------
// ELIMINAR (solo trámites únicos y sin documentos registrados)
// Los generados por una obligación no se borran uno por uno: si ya
// no aplican, se inactiva la obligación (o se marcan como finalizados).
// Ahora recibe usuarioId para la auditoría. El tramite ya se busca
// antes de borrar (para las validaciones), así que se reutiliza
// para el detalle en vez de otra consulta.
// ------------------------------------------------------------
const eliminarTramite = async (id, usuarioId) => {
  const tramite = await prisma.tramite.findUnique({
    where: { id },
    include: { ...INCLUIR_LISTA, _count: { select: { documentos: true } } },
  });
  if (!tramite) throw new ErrorNegocio('Trámite no encontrado', 404);

  if (tramite.obligacionId !== null) {
    throw new ErrorNegocio(
      'Este vencimiento lo generó una obligación periódica y no se elimina por separado. Si ya no aplica, inactivá la obligación o marcalo como finalizado.',
      409
    );
  }
  if (tramite._count.documentos > 0) {
    throw new ErrorNegocio('El trámite tiene documentos registrados; no se puede eliminar.', 409);
  }

  return prisma.$transaction(async (tx) => {
    await tx.tramite.delete({ where: { id } });

    await registrarAuditoria(tx, {
      usuarioId,
      accion: 'ELIMINAR',
      entidad: 'Tramite',
      entidadId: id,
      detalle: descripcionTramite(tramite),
    });
  });
};

// ------------------------------------------------------------
// HELPER: descripción corta para auditoría
// ------------------------------------------------------------
const descripcionTramite = (tramite) =>
  `${tramite.tipoTramite?.nombre ?? 'Trámite'} de ${tramite.cliente?.nombreRazonSocial ?? '—'} (vto. ${new Date(tramite.fechaVencimiento).toLocaleDateString('es-PY')})`;

module.exports = {
  listarTramites,
  listarParaCalendario,
  obtenerTramite,
  crearTramite,
  actualizarTramite,
  eliminarTramite,
};