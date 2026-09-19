// ============================================================
// PLANTILLAS ROUTES — Módulo 1.4
// Define las URLs del módulo y qué función del controller
// se ejecuta para cada una. Base: /api/plantillas
// ============================================================
const express = require('express');
const router = express.Router();
const plantillasController = require('./plantillas.controller');

router.get('/', plantillasController.listar);          // GET    /api/plantillas (filtros + búsqueda + paginación)
router.get('/:id', plantillasController.obtener);      // GET    /api/plantillas/5 (detalle con contenido)
router.get('/:id/descargar', plantillasController.descargar); // GET /api/plantillas/5/descargar?formato=docx|pdf
router.post('/', plantillasController.crear);          // POST   /api/plantillas
router.put('/:id', plantillasController.actualizar);   // PUT    /api/plantillas/5
router.delete('/:id', plantillasController.eliminar);  // DELETE /api/plantillas/5

module.exports = router;