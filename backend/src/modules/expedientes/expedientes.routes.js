// ============================================
// EXPEDIENTES.ROUTES.JS
// Define las URLs del módulo Expediente y qué función
// del controller se ejecuta para cada una.
// ============================================

const express = require('express');
const router = express.Router();
const expedientesController = require('./expedientes.controller');

router.post('/', expedientesController.crear);          // POST   /api/expedientes
router.get('/', expedientesController.listar);            // GET    /api/expedientes (?clienteId=X opcional)
router.get('/:id', expedientesController.obtenerPorId);    // GET    /api/expedientes/5
router.put('/:id', expedientesController.actualizar);      // PUT    /api/expedientes/5

module.exports = router;