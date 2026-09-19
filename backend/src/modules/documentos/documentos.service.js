// ============================================================
// DOCUMENTOS SERVICE — Módulo 1.3
// Registro de recepción de documentos (NO guarda archivos).
// Cuelga de un trámite (contables) o de un expediente (juicios).
// "padre" es { tramiteId } o { expedienteId }: siempre uno solo,
// porque lo decide la URL, no el body.
// ============================================================
const prisma = require('../../config/database');
const { ErrorNegocio } = require('../../utils/errores');
const { siVino, limpiarTexto } = require('../../utils/entrada');

// ------------------------------------------------------------
// HELPER: verificarPadre
// Confirma que el trámite o expediente exista; si no, 404.
// ------------------------------------------------------------
const verificarPadre = async ({ tramiteId, expedienteId }) => {
  if (tramiteId) {
    const tramite = await prisma.tramite.findUnique({ where: { id: tramiteId }, select: { id: true } });
    if (!tramite) throw new ErrorNegocio('Trámite no encontrado', 404);
  } else {
    const expediente = await prisma.expediente.findUnique({ where: { id: expedienteId }, select: { id: true } });
    if (!expediente) throw new ErrorNegocio('Expediente no encontrado', 404);
  }
};

// ------------------------------------------------------------
// LISTAR los documentos de un trámite o de un expediente
// Más recientes primero (por fecha de recepción; id desempata).
// ------------------------------------------------------------
const listarDocumentos = async (padre) => {
  await verificarPadre(padre);
  return prisma.documentoRecibido.findMany({
    where: padre, // { tramiteId } o { expedienteId }
    orderBy: [{ fechaRecepcion: 'desc' }, { id: 'desc' }],
  });
};

// ------------------------------------------------------------
// CREAR un registro de recepción
// Al hacer ...padre solo se completa UNA de las dos claves foráneas;
// la otra queda en null.
// ------------------------------------------------------------
const crearDocumento = async (padre, { tipoDocumento, fechaRecepcion, observaciones }) => {
  await verificarPadre(padre);
  return prisma.documentoRecibido.create({
    data: {
      ...padre,
      tipoDocumento: tipoDocumento.trim(),
      fechaRecepcion,
      observaciones: limpiarTexto(observaciones),
    },
  });
};

// ------------------------------------------------------------
// ACTUALIZAR (PUT parcial: tipoDocumento, fechaRecepcion, observaciones)
// Un documento no cambia de trámite/expediente: si se cargó en el
// lugar equivocado, se elimina y se registra de nuevo.
// Si el id no existe, Prisma lanza P2025 y el controller responde 404.
// ------------------------------------------------------------
const actualizarDocumento = async (id, datos) => {
  const data = {};
  if (siVino(datos, 'tipoDocumento')) data.tipoDocumento = datos.tipoDocumento.trim();
  if (siVino(datos, 'fechaRecepcion')) data.fechaRecepcion = datos.fechaRecepcion;
  if (siVino(datos, 'observaciones')) data.observaciones = limpiarTexto(datos.observaciones);

  return prisma.documentoRecibido.update({ where: { id }, data });
};

// ------------------------------------------------------------
// ELIMINAR (definitivo: es una línea de un registro, nada depende de ella)
// ------------------------------------------------------------
const eliminarDocumento = async (id) => {
  return prisma.documentoRecibido.delete({ where: { id } });
};

module.exports = { listarDocumentos, crearDocumento, actualizarDocumento, eliminarDocumento };