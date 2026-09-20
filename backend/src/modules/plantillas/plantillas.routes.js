// ============================================================
// PLANTILLAS ROUTES — Módulo 1.4
// Define las URLs del módulo y qué función del controller
// se ejecuta para cada una. Base: /api/plantillas
//
// PERMISOS: consultar y descargar (GET) para ABOGADO y ASISTENTE;
// crear, editar y eliminar solo ABOGADO.
// ============================================================
const express = require('express');
const router = express.Router();
const plantillasController = require('./plantillas.controller');
const { requiereRol } = require('../../middlewares/auth.middleware');

// Atajo: middleware que deja pasar únicamente al rol ABOGADO
const soloAbogado = requiereRol('ABOGADO');

router.get('/', plantillasController.listar);                   // GET    /api/plantillas (filtros + búsqueda + paginación)
router.get('/:id', plantillasController.obtener);               // GET    /api/plantillas/5 (detalle con contenido)
router.get('/:id/descargar', plantillasController.descargar);   // GET    /api/plantillas/5/descargar?formato=docx|pdf
router.post('/', soloAbogado, plantillasController.crear);          // POST   /api/plantillas
router.put('/:id', soloAbogado, plantillasController.actualizar);   // PUT    /api/plantillas/5
router.delete('/:id', soloAbogado, plantillasController.eliminar);  // DELETE /api/plantillas/5

module.exports = router;