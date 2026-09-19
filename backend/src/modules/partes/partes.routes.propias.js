// ============================================
// PARTES.ROUTES.PLANAS.JS
// Estas rutas cuelgan directamente de /api/partes/:id
// (no dependen de conocer el expedienteId para editar o eliminar).
// ============================================

const express = require('express');
const router = express.Router();
const partesController = require('./partes.controller');

router.put('/:id', partesController.actualizar);     // PUT    /api/partes/5
router.delete('/:id', partesController.eliminar);    // DELETE /api/partes/5

module.exports = router;