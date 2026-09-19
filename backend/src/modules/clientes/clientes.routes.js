// ============================================
// CLIENTES.ROUTES.JS
// Define las URLs del módulo Cliente y qué función
// del controller se ejecuta para cada una.
//
// ORDEN IMPORTANTE: las rutas fijas (como /opciones) deben
// declararse ANTES de /:id. Si no, Express interpreta la palabra
// "opciones" como un id y la ruta nunca se ejecuta.
// ============================================

const express = require('express');
const router = express.Router();
const clientesController = require('./clientes.controller');

router.post('/', clientesController.crear);                  // POST   /api/clientes
router.get('/', clientesController.listar);                   // GET    /api/clientes
router.get('/opciones', clientesController.listarOpciones);   // GET    /api/clientes/opciones  (antes de /:id)
router.get('/:id', clientesController.obtenerPorId);           // GET    /api/clientes/5
router.put('/:id', clientesController.actualizar);             // PUT    /api/clientes/5

module.exports = router;