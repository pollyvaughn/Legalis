// ============================================================
// TIPOS-TRAMITE ROUTES — Módulo 1.3
// Define las URLs del módulo y qué función del controller se
// ejecuta para cada una. Base: /api/tipos-tramite
//
// PERMISOS: GET para ABOGADO y ASISTENTE; crear/editar/eliminar solo ABOGADO.
// ============================================================
const express = require('express');
const router = express.Router();
const controller = require('./tipos-tramite.controller');
const { requiereRol } = require('../../middlewares/auth.middleware');

// Atajo: middleware que deja pasar únicamente al rol ABOGADO
const soloAbogado = requiereRol('ABOGADO');

router.get('/', controller.listar);                       // GET    /api/tipos-tramite (?estado=&busqueda=)
router.get('/opciones', controller.opciones);             // GET    /api/tipos-tramite/opciones  (ANTES de '/:id')
router.get('/:id', controller.obtener);                   // GET    /api/tipos-tramite/5
router.post('/', soloAbogado, controller.crear);          // POST   /api/tipos-tramite
router.put('/:id', soloAbogado, controller.actualizar);   // PUT    /api/tipos-tramite/5
router.delete('/:id', soloAbogado, controller.eliminar);  // DELETE /api/tipos-tramite/5

module.exports = router;