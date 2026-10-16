// ============================================================
// CUENTA CORRIENTE CONTROLLER — Módulo 3 (RF8)
// Recibe req/res, valida el id de la URL y delega en el service.
// Es solo lectura: no hay body ni validaciones de negocio acá.
// Incluye los PDF (estado de cuenta y panel), armados por
// cuenta-corriente.reporte.service.
// ============================================================
const service = require('./cuenta-corriente.service');
const reporteService = require('./cuenta-corriente.reporte.service');
const { generarListadoPdf } = require('../../utils/exportarListadoPdf');
const { responderError } = require('../../utils/errores');
const { entero } = require('../../utils/entrada');

const idDeUrl = (valor) => {
  const id = entero(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// GET /api/expedientes/:expedienteId/cuenta-corriente
const deExpediente = async (req, res) => {
  try {
    const id = idDeUrl(req.params.expedienteId);
    if (!id) return res.status(400).json({ error: 'ID de expediente inválido' });
    res.json(await service.resumenDeExpediente(id));
  } catch (err) {
    responderError(res, err, 'Error al obtener la cuenta corriente del expediente');
  }
};

// GET /api/tramites/:tramiteId/cuenta-corriente
const deTramite = async (req, res) => {
  try {
    const id = idDeUrl(req.params.tramiteId);
    if (!id) return res.status(400).json({ error: 'ID de trámite inválido' });
    res.json(await service.resumenDeTramite(id));
  } catch (err) {
    responderError(res, err, 'Error al obtener la cuenta corriente del trámite');
  }
};

// GET /api/clientes/:clienteId/cuenta-corriente
const deCliente = async (req, res) => {
  try {
    const id = idDeUrl(req.params.clienteId);
    if (!id) return res.status(400).json({ error: 'ID de cliente inválido' });
    res.json(await service.resumenDeCliente(id));
  } catch (err) {
    responderError(res, err, 'Error al obtener la cuenta corriente del cliente');
  }
};

// GET /api/cuenta-corriente  (panel global "Honorarios & Gastos", 3.4b)
const panel = async (req, res) => {
  try {
    res.json(await service.resumenGlobal());
  } catch (err) {
    responderError(res, err, 'Error al obtener el panel de honorarios y gastos');
  }
};

// ------------------------------------------------------------
// HELPER: enviarPdf
// Arma los datos con la función "armar", genera el PDF y lo responde
// como descarga. Los errores salen por responderError (404, 500...).
// ------------------------------------------------------------
const enviarPdf = async (res, armar, mensajeError) => {
  try {
    const { nombreArchivo, ...datosPdf } = await armar();
    const buffer = await generarListadoPdf(datosPdf);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.send(buffer);
  } catch (err) {
    responderError(res, err, mensajeError);
  }
};

// GET /api/expedientes/:expedienteId/cuenta-corriente/exportar
const exportarDeExpediente = (req, res) => {
  const id = idDeUrl(req.params.expedienteId);
  if (!id) return res.status(400).json({ error: 'ID de expediente inválido' });
  return enviarPdf(res, () => reporteService.estadoDeExpediente(id), 'Error al generar el estado de cuenta');
};

// GET /api/tramites/:tramiteId/cuenta-corriente/exportar
const exportarDeTramite = (req, res) => {
  const id = idDeUrl(req.params.tramiteId);
  if (!id) return res.status(400).json({ error: 'ID de trámite inválido' });
  return enviarPdf(res, () => reporteService.estadoDeTramite(id), 'Error al generar el estado de cuenta');
};

// GET /api/clientes/:clienteId/cuenta-corriente/exportar
const exportarDeCliente = (req, res) => {
  const id = idDeUrl(req.params.clienteId);
  if (!id) return res.status(400).json({ error: 'ID de cliente inválido' });
  return enviarPdf(res, () => reporteService.estadoDeCliente(id), 'Error al generar el estado de cuenta');
};

// GET /api/cuenta-corriente/exportar  (panel global)
const exportarPanel = (req, res) =>
  enviarPdf(res, () => reporteService.panelGlobal(), 'Error al generar el reporte de honorarios y gastos');

module.exports = {
  deExpediente,
  deTramite,
  deCliente,
  panel,
  exportarDeExpediente,
  exportarDeTramite,
  exportarDeCliente,
  exportarPanel,
};