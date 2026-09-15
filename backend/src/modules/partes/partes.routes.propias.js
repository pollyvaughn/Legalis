// ============================================
// PARTES.ROUTES.PLANAS.JS
// Esta ruta cuelga directamente de /api/partes/:id
// (no depende de conocer el expedienteId para editar).
// ============================================

const express = require('express');
const router = express.Router();
const partesController = require('./partes.controller');

router.put('/:id', partesController.actualizar); // PUT /api/partes/5

module.exports = router;