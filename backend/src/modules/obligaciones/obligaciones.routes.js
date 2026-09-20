// ============================================================
// OBLIGACIONES ROUTES — Módulo 1.3
// Define las URLs del módulo. Base: /api/obligaciones
// ============================================================
const express = require('express');
const router = express.Router();
const controller = require('./obligaciones.controller');

router.get('/', controller.listar);                                      // GET   /api/obligaciones (?clienteId=&tipoTramiteId=&estado=)
router.get('/:id', controller.obtener);                                  // GET   /api/obligaciones/5
router.post('/', controller.crear);                                      // POST  /api/obligaciones
router.patch('/:id/inactivar', controller.inactivar);                    // PATCH /api/obligaciones/5/inactivar
router.post('/:id/generar-siguiente-anio', controller.generarSiguienteAnio); // POST  /api/obligaciones/5/generar-siguiente-anio
router.put('/:id', controller.actualizar);                            // PUT  /api/obligaciones/5
router.post('/:id/quitar-futuros', controller.quitarFuturos);         // POST /api/obligaciones/5/quitar-futuros

module.exports = router;