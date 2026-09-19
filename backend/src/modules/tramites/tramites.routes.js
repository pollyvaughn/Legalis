// ============================================================
// TRAMITES ROUTES — Módulo 1.3
// Define las URLs del módulo. Base: /api/tramites
// ============================================================
const express = require('express');
const router = express.Router();
const controller = require('./tramites.controller');

router.get('/', controller.listar);          // GET    /api/tramites (filtros, ver controller)
router.get('/:id', controller.obtener);      // GET    /api/tramites/5
router.post('/', controller.crear);          // POST   /api/tramites (trámite único)
router.put('/:id', controller.actualizar);   // PUT    /api/tramites/5 (fecha, estado, descripción)
router.delete('/:id', controller.eliminar);  // DELETE /api/tramites/5 (solo únicos sin documentos)

module.exports = router;