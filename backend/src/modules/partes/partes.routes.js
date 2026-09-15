// ============================================
// PARTES.ROUTES.JS (anidadas bajo expediente)
// Estas rutas cuelgan de /api/expedientes/:expedienteId/partes
// Se montan en app.js con { mergeParams: true } para poder leer
// :expedienteId desde el router padre.
// ============================================

const express = require('express');
const router = express.Router({ mergeParams: true });
const partesController = require('./partes.controller');

router.post('/', partesController.crear);   // POST /api/expedientes/:expedienteId/partes
router.get('/', partesController.listar);    // GET  /api/expedientes/:expedienteId/partes

module.exports = router;