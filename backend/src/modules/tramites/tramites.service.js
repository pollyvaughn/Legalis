// ============================================================
// TRAMITES SERVICE — Módulo 1.3
// Un Tramite = un vencimiento concreto con su estado.
//  - Único: se crea a mano (obligacionId = null).
//  - Periódico: lo genera el service de obligaciones.
// ============================================================
const prisma = require('../../config/database');
const { ErrorNegocio } = require('../../utils/errores');
const { siVino, limpiarTexto } = require('../../utils/entrada');

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
const crearTramite = async ({ clienteId, tipoTramiteId, fechaVencimiento, descripcion }) => {
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { id: true, activo: true },
  });
  if (!cliente) throw new ErrorNegocio('Cliente no encontrado', 404);
  if (!cliente.activo) throw new ErrorNegocio('El cliente está inactivo', 409);

  const tipo = await prisma.tipoTramite.findUnique({ where: { id: tipoTramiteId } });
  if (!tipo) throw new ErrorNegocio('Trámite no encontrado en el catálogo', 404);
  if (!tipo.activo) throw new ErrorNegocio('El trámite del catálogo está inactivo', 409);

  return prisma.tramite.create({
    data: { clienteId, tipoTramiteId, fechaVencimiento, descripcion: limpiarTexto(descripcion) },
    include: INCLUIR_LISTA,
  });
};

// ------------------------------------------------------------
// ACTUALIZAR (PUT parcial: fechaVencimiento, descripcion y/o estado)
//  - Cliente y tipo de trámite no se cambian (son la identidad del trámite).
//  - En los generados por una obligación, cambiar la fecha sirve para
//    ajustar feriados; "periodo" no cambia (sigue siendo su etiqueta).
//  - El estado puede pasar de cualquiera a cualquiera (por si hubo un error).
// ------------------------------------------------------------
const actualizarTramite = async (id, datos) => {
  const data = {};
  if (siVino(datos, 'fechaVencimiento')) data.fechaVencimiento = datos.fechaVencimiento;
  if (siVino(datos, 'descripcion')) data.descripcion = limpiarTexto(datos.descripcion);
  if (siVino(datos, 'estado')) data.estado = datos.estado;

  return prisma.tramite.update({ where: { id }, data, include: INCLUIR_LISTA });
};

// ------------------------------------------------------------
// ELIMINAR (solo trámites únicos y sin documentos registrados)
// Los generados por una obligación no se borran uno por uno: si ya
// no aplican, se inactiva la obligación (o se marcan como finalizados).
// ------------------------------------------------------------
const eliminarTramite = async (id) => {
  const tramite = await prisma.tramite.findUnique({
    where: { id },
    include: { _count: { select: { documentos: true } } },
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

  return prisma.tramite.delete({ where: { id } });
};

module.exports = {
  listarTramites,
  obtenerTramite,
  crearTramite,
  actualizarTramite,
  eliminarTramite,
};