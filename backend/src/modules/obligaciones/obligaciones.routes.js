// ============================================================
// OBLIGACIONES ROUTES — Módulo 1.3
// Define las URLs del módulo. Base: /api/obligaciones
//
// PERMISOS: solo consulta (GET) para ABOGADO y ASISTENTE.
// Todo lo que crea, modifica, inactiva o genera datos es solo ABOGADO
// (incluidos los POST "de acción": generar-siguiente-anio y quitar-futuros).
// ============================================================
const express = require('express');
const router = express.Router();
const controller = require('./obligaciones.controller');
const { requiereRol } = require('../../middlewares/auth.middleware');

// Atajo: middleware que deja pasar únicamente al rol ABOGADO
const soloAbogado = requiereRol('ABOGADO');

router.get('/', controller.listar);                                                   // GET   /api/obligaciones (?clienteId=&tipoTramiteId=&estado=)
router.get('/:id', controller.obtener);                                               // GET   /api/obligaciones/5
router.post('/', soloAbogado, controller.crear);                                      // POST  /api/obligaciones
router.patch('/:id/inactivar', soloAbogado, controller.inactivar);                    // PATCH /api/obligaciones/5/inactivar
router.post('/:id/generar-siguiente-anio', soloAbogado, controller.generarSiguienteAnio); // POST  /api/obligaciones/5/generar-siguiente-anio
router.put('/:id', soloAbogado, controller.actualizar);                               // PUT   /api/obligaciones/5
router.post('/:id/quitar-futuros', soloAbogado, controller.quitarFuturos);            // POST  /api/obligaciones/5/quitar-futuros

module.exports = router;