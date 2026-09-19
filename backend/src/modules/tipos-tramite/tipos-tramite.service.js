// ============================================================
// TIPOS-TRAMITE SERVICE — Módulo 1.3 (catálogo de trámites)
// Lógica de negocio y acceso a la BD (Prisma).
// ============================================================
const prisma = require('../../config/database');
const { ErrorNegocio } = require('../../utils/errores');

// HELPER: true si el campo llegó en el body (aunque sea null).
// Sirve para que un PUT parcial no pise campos que no se enviaron.
const siVino = (obj, campo) => Object.prototype.hasOwnProperty.call(obj, campo);

// HELPER: trim() a strings; texto vacío ("") pasa a null.
const limpiarTexto = (valor) => {
  if (typeof valor !== 'string') return valor;
  const limpio = valor.trim();
  return limpio === '' ? null : limpio;
};

// Cuántas veces se usó un tipo (para mostrarlo en la lista y decidir borrar vs inactivar)
const CONTEO_USO = { _count: { select: { obligaciones: true, tramites: true } } };

// ------------------------------------------------------------
// HELPER: existeNombre
// Compara sin distinguir mayúsculas ("iva general" == "IVA General").
// excluirId sirve al editar, para que no choque consigo mismo.
// ------------------------------------------------------------
const existeNombre = async (nombre, excluirId) => {
  const existente = await prisma.tipoTramite.findFirst({
    where: {
      nombre: { equals: nombre, mode: 'insensitive' },
      ...(excluirId && { id: { not: excluirId } }),
    },
  });
  return existente !== null;
};

// ------------------------------------------------------------
// LISTAR (pantalla de gestión del catálogo)
// Filtros: estado ('activos' por defecto | 'inactivos' | 'todos') y búsqueda.
// ------------------------------------------------------------
const listarTipos = async ({ estado = 'activos', busqueda } = {}) => {
  const where = {};
  if (estado === 'activos') where.activo = true;
  else if (estado === 'inactivos') where.activo = false;
  // 'todos' = sin filtro de estado

  if (busqueda && busqueda.trim() !== '') {
    const texto = busqueda.trim();
    where.OR = [
      { nombre: { contains: texto, mode: 'insensitive' } },
      { descripcion: { contains: texto, mode: 'insensitive' } },
    ];
  }

  return prisma.tipoTramite.findMany({
    where,
    orderBy: { nombre: 'asc' },
    include: CONTEO_USO,
  });
};

// ------------------------------------------------------------
// OPCIONES (para los <select> de otros formularios)
// Solo activos y solo id + nombre: es una lista liviana.
// ------------------------------------------------------------
const listarOpciones = async () => {
  return prisma.tipoTramite.findMany({
    where: { activo: true },
    select: { id: true, nombre: true },
    orderBy: { nombre: 'asc' },
  });
};

// ------------------------------------------------------------
// OBTENER POR ID (devuelve null si no existe; el controller responde 404)
// ------------------------------------------------------------
const obtenerTipoPorId = async (id) => {
  return prisma.tipoTramite.findUnique({ where: { id }, include: CONTEO_USO });
};

// ------------------------------------------------------------
// CREAR ("catastrar" un trámite en el catálogo)
// ------------------------------------------------------------
const crearTipo = async (datos) => {
  const nombre = datos.nombre.trim();
  if (await existeNombre(nombre)) {
    throw new ErrorNegocio('Ya existe un trámite con ese nombre en el catálogo', 409);
  }
  return prisma.tipoTramite.create({
    data: { nombre, descripcion: limpiarTexto(datos.descripcion) },
  });
};

// ------------------------------------------------------------
// ACTUALIZAR (PUT parcial: nombre, descripcion y/o activo)
// ------------------------------------------------------------
const actualizarTipo = async (id, datos) => {
  const data = {};

  if (siVino(datos, 'nombre')) {
    const nombre = datos.nombre.trim();
    if (await existeNombre(nombre, id)) {
      throw new ErrorNegocio('Ya existe un trámite con ese nombre en el catálogo', 409);
    }
    data.nombre = nombre;
  }

  if (siVino(datos, 'descripcion')) data.descripcion = limpiarTexto(datos.descripcion);

  if (siVino(datos, 'activo')) {
    // No se puede inactivar un tipo mientras haya obligaciones periódicas activas con él
    if (datos.activo === false) {
      const activas = await prisma.obligacionPeriodica.count({
        where: { tipoTramiteId: id, activa: true },
      });
      if (activas > 0) {
        throw new ErrorNegocio(
          `No se puede inactivar: hay ${activas} obligación(es) periódica(s) activa(s) con este trámite. Inactivalas primero.`,
          409
        );
      }
    }
    data.activo = datos.activo;
  }

  return prisma.tipoTramite.update({ where: { id }, data });
};

// ------------------------------------------------------------
// ELIMINAR (solo si nunca se usó; si no, hay que inactivarlo)
// ------------------------------------------------------------
const eliminarTipo = async (id) => {
  const [tramites, obligaciones] = await Promise.all([
    prisma.tramite.count({ where: { tipoTramiteId: id } }),
    prisma.obligacionPeriodica.count({ where: { tipoTramiteId: id } }),
  ]);
  if (tramites + obligaciones > 0) {
    throw new ErrorNegocio(
      'Este trámite ya se usó (tiene trámites u obligaciones asociados). Inactivalo en lugar de eliminarlo.',
      409
    );
  }
  return prisma.tipoTramite.delete({ where: { id } });
};

module.exports = {
  listarTipos,
  listarOpciones,
  obtenerTipoPorId,
  crearTipo,
  actualizarTipo,
  eliminarTipo,
};