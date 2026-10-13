// ============================================================
// VENCIMIENTOS.CONTROLLER.JS
// req/res del reporte de vencimientos pendientes. Los errores van
// por next(error): el middleware global los responde en JSON.
// ============================================================

const vencimientosService = require('./vencimientos.service');
const { generarListadoPdf } = require('../../utils/exportarListadoPdf');

// GET /api/vencimientos/exportar?tipo=todos|plazos|ruc&desde=&hasta=
// Genera el PDF del listado de vencimientos pendientes (RF6).
async function exportar(req, res, next) {
  try {
    const { tipo, desde, hasta } = req.query;
    const { nombreArchivo, ...datosPdf } = await vencimientosService.armarReporte({
      tipo,
      desde,
      hasta,
    });

    const buffer = await generarListadoPdf(datosPdf);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    return res.send(buffer);
  } catch (error) {
    return next(error);
  }
}

module.exports = { exportar };