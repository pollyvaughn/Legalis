// ============================================================
// AUDITORIA CONTROLLER
// Solo lectura. No hay crear/editar/eliminar (ver el service).
// ============================================================
const service = require('./auditoria.service');

// GET /api/auditoria?entidad=&accion=&usuarioId=&desde=&hasta=&pagina=&limite=
const listar = async (req, res) => {
  try {
    const resultado = await service.listarAuditoria({
      entidad: req.query.entidad,
      accion: req.query.accion,
      usuarioId: req.query.usuarioId,
      desde: req.query.desde,
      hasta: req.query.hasta,
      pagina: req.query.pagina,
      limite: req.query.limite,
    });
    res.json(resultado);
  } catch (error) {
    console.error('Error al listar auditoría:', error);
    res.status(500).json({ error: 'Error al listar la auditoría' });
  }
};

// GET /api/auditoria/entidades  (para llenar el <select> de filtro)
const entidades = async (req, res) => {
  try {
    res.json(await service.listarEntidades());
  } catch (error) {
    console.error('Error al listar entidades de auditoría:', error);
    res.status(500).json({ error: 'Error al listar las entidades' });
  }
};

module.exports = { listar, entidades };