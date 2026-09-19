// ============================================================
// TRAMITES CONTROLLER — Módulo 1.3
// Recibe req/res, valida la entrada y delega en el service.
// ============================================================
const service = require('./tramites.service');
const { responderError } = require('../../utils/errores');
const { siVino, entero, parsearFecha } = require('../../utils/entrada');

// Valores permitidos (espejo de EstadoTramite en schema.prisma)
const ESTADOS = ['PENDIENTE', 'EN_PROCESO', 'PRESENTADO', 'FINALIZADO'];
const NO_ENCONTRADO = 'Trámite no encontrado';

// GET /api/tramites?clienteId=&tipoTramiteId=&estado=&desde=&hasta=&busqueda=&pagina=&limite=
const listar = async (req, res) => {
  try {
    const { estado = 'abiertos', busqueda } = req.query;
    if (!['abiertos', 'todos', ...ESTADOS].includes(estado)) {
      return res.status(400).json({ error: 'estado inválido' });
    }

    // Fechas opcionales en formato AAAA-MM-DD
    let desde;
    let hasta;
    if (req.query.desde) {
      desde = parsearFecha(req.query.desde);
      if (!desde) return res.status(400).json({ error: 'La fecha "desde" es inválida (formato AAAA-MM-DD)' });
    }
    if (req.query.hasta) {
      hasta = parsearFecha(req.query.hasta);
      if (!hasta) return res.status(400).json({ error: 'La fecha "hasta" es inválida (formato AAAA-MM-DD)' });
    }
    if (desde && hasta && desde > hasta) {
      return res.status(400).json({ error: 'La fecha "desde" no puede ser posterior a "hasta"' });
    }

    const clienteId = entero(req.query.clienteId);
    const tipoTramiteId = entero(req.query.tipoTramiteId);
    // Paginación: mínimo 1 página, entre 1 y 100 registros por página
    const pagina = Math.max(parseInt(req.query.pagina) || 1, 1);
    const limite = Math.min(Math.max(parseInt(req.query.limite) || 10, 1), 100);

    const resultado = await service.listarTramites({
      clienteId: Number.isInteger(clienteId) ? clienteId : undefined,
      tipoTramiteId: Number.isInteger(tipoTramiteId) ? tipoTramiteId : undefined,
      estado,
      desde,
      hasta,
      busqueda,
      pagina,
      limite,
    });
    res.json(resultado);
  } catch (error) {
    responderError(res, error, 'Error al listar los trámites', NO_ENCONTRADO);
  }
};

// GET /api/tramites/:id
const obtener = async (req, res) => {
  try {
    const id = entero(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido' });

    const tramite = await service.obtenerTramite(id);
    if (!tramite) return res.status(404).json({ error: NO_ENCONTRADO });
    res.json(tramite);
  } catch (error) {
    responderError(res, error, 'Error al obtener el trámite', NO_ENCONTRADO);
  }
};

// POST /api/tramites   body: { clienteId, tipoTramiteId, fechaVencimiento, descripcion? }
const crear = async (req, res) => {
  try {
    const clienteId = entero(req.body.clienteId);
    const tipoTramiteId = entero(req.body.tipoTramiteId);
    const fechaVencimiento = parsearFecha(req.body.fechaVencimiento);
    const { descripcion } = req.body;

    if (!Number.isInteger(clienteId)) return res.status(400).json({ error: 'El cliente es obligatorio' });
    if (!Number.isInteger(tipoTramiteId)) return res.status(400).json({ error: 'El trámite del catálogo es obligatorio' });
    if (!fechaVencimiento) return res.status(400).json({ error: 'La fecha de vencimiento es obligatoria (formato AAAA-MM-DD)' });
    if (descripcion && descripcion.length > 300) return res.status(400).json({ error: 'La descripción no puede superar 300 caracteres' });

    res.status(201).json(await service.crearTramite({ clienteId, tipoTramiteId, fechaVencimiento, descripcion }));
  } catch (error) {
    responderError(res, error, 'Error al crear el trámite', NO_ENCONTRADO);
  }
};

// PUT /api/tramites/:id   body (parcial): { fechaVencimiento?, estado?, descripcion? }
const actualizar = async (req, res) => {
  try {
    const id = entero(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido' });

    // Se arma un objeto solo con los campos permitidos que llegaron
    const datos = {};
    if (siVino(req.body, 'fechaVencimiento')) {
      const fecha = parsearFecha(req.body.fechaVencimiento);
      if (!fecha) return res.status(400).json({ error: 'La fecha de vencimiento es inválida (formato AAAA-MM-DD)' });
      datos.fechaVencimiento = fecha;
    }
    if (siVino(req.body, 'estado')) {
      if (!ESTADOS.includes(req.body.estado)) return res.status(400).json({ error: 'Estado inválido' });
      datos.estado = req.body.estado;
    }
    if (siVino(req.body, 'descripcion')) {
      if (req.body.descripcion && req.body.descripcion.length > 300) {
        return res.status(400).json({ error: 'La descripción no puede superar 300 caracteres' });
      }
      datos.descripcion = req.body.descripcion;
    }
    if (Object.keys(datos).length === 0) {
      return res.status(400).json({ error: 'No hay nada para actualizar (fechaVencimiento, estado o descripcion)' });
    }

    res.json(await service.actualizarTramite(id, datos));
  } catch (error) {
    responderError(res, error, 'Error al actualizar el trámite', NO_ENCONTRADO);
  }
};

// DELETE /api/tramites/:id  (solo únicos sin documentos)
const eliminar = async (req, res) => {
  try {
    const id = entero(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido' });

    await service.eliminarTramite(id);
    res.json({ mensaje: 'Trámite eliminado' });
  } catch (error) {
    responderError(res, error, 'Error al eliminar el trámite', NO_ENCONTRADO);
  }
};

module.exports = { listar, obtener, crear, actualizar, eliminar };