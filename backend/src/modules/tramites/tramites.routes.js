// ============================================================
// TRAMITES ROUTES — Módulo 1.3
// Define las URLs del módulo. Base: /api/tramites
//
// PERMISOS: GET para ABOGADO y ASISTENTE; crear/editar/eliminar solo ABOGADO.
// ============================================================
const express = require('express');
const router = express.Router();
const controller = require('./tramites.controller');
const { requiereRol } = require('../../middlewares/auth.middleware');

// Atajo: middleware que deja pasar únicamente al rol ABOGADO
const soloAbogado = requiereRol('ABOGADO');

router.get('/', controller.listar);   
router.get('/exportar', controller.exportar);                    // GET    /api/tramites (filtros, ver controller)
router.get('/:id', controller.obtener);                   // GET    /api/tramites/5
router.post('/', soloAbogado, controller.crear);          // POST   /api/tramites (trámite único)
router.put('/:id', soloAbogado, controller.actualizar);   // PUT    /api/tramites/5 (fecha, estado, descripción)
router.delete('/:id', soloAbogado, controller.eliminar);  // DELETE /api/tramites/5 (solo únicos sin documentos)

module.exports = router;