// ============================================
// PARTES.ROUTES.JS (anidadas bajo expediente)
// Estas rutas cuelgan de /api/expedientes/:expedienteId/partes
// Se montan en app.js con { mergeParams: true } para poder leer
// :expedienteId desde el router padre.
//
// PERMISOS: listar para ABOGADO y ASISTENTE; crear solo ABOGADO.
// ============================================

const express = require('express');
const router = express.Router({ mergeParams: true });
const partesController = require('./partes.controller');
const { requiereRol } = require('../../middlewares/auth.middleware');

// Atajo: middleware que deja pasar únicamente al rol ABOGADO
const soloAbogado = requiereRol('ABOGADO');

router.post('/', soloAbogado, partesController.crear);   // POST /api/expedientes/:expedienteId/partes
router.get('/', partesController.listar);                 // GET  /api/expedientes/:expedienteId/partes

module.exports = router;