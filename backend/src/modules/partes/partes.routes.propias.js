// ============================================
// PARTES.ROUTES.PROPIAS.JS
// Estas rutas cuelgan directamente de /api/partes/:id
// (no dependen de conocer el expedienteId para editar o eliminar).
//
// PERMISOS: ambas operaciones modifican datos → solo ABOGADO.
// ============================================

const express = require('express');
const router = express.Router();
const partesController = require('./partes.controller');
const { requiereRol } = require('../../middlewares/auth.middleware');

// Atajo: middleware que deja pasar únicamente al rol ABOGADO
const soloAbogado = requiereRol('ABOGADO');

router.put('/:id', soloAbogado, partesController.actualizar);     // PUT    /api/partes/5
router.delete('/:id', soloAbogado, partesController.eliminar);    // DELETE /api/partes/5

module.exports = router;