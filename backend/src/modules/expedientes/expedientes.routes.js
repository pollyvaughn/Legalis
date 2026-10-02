// ============================================
// EXPEDIENTES.ROUTES.JS
// Define las URLs del módulo Expediente y qué función
// del controller se ejecuta para cada una.
//
// PERMISOS: GET para ABOGADO y ASISTENTE; crear/editar solo ABOGADO.
// ============================================

const express = require('express');
const router = express.Router();
const expedientesController = require('./expedientes.controller');
const { requiereRol } = require('../../middlewares/auth.middleware');

// Atajo: middleware que deja pasar únicamente al rol ABOGADO
const soloAbogado = requiereRol('ABOGADO');

router.post('/', soloAbogado, expedientesController.crear);         // POST   /api/expedientes
router.get('/', expedientesController.listar);  
router.get('/exportar', expedientesController.exportar); // GET /api/expedientes/exportar                    // GET    /api/expedientes (?clienteId=X opcional)
router.get('/:id', expedientesController.obtenerPorId);              // GET    /api/expedientes/5
router.put('/:id', soloAbogado, expedientesController.actualizar);   // PUT    /api/expedientes/5

module.exports = router;