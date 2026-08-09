// ============================================
// CLIENTES.ROUTES.JS
// Define las URLs del módulo Cliente y qué función
// del controller se ejecuta para cada una.
// ============================================

const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientes.controller');

router.post('/', clientesController.crear);          // POST   /api/clientes
router.get('/', clientesController.listar);           // GET    /api/clientes
router.get('/:id', clientesController.obtenerPorId);   // GET    /api/clientes/5
router.put('/:id', clientesController.actualizar);     // PUT    /api/clientes/5

module.exports = router;