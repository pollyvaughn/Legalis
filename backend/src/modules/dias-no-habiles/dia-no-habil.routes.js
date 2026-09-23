// ============================================================
// DIAS NO HABILES ROUTES — Módulo 2
// Base montada en app.js como: /api/dias-no-habiles
//
// PERMISOS: GET para ABOGADO y ASISTENTE (consulta del
// calendario); crear/editar/eliminar solo ABOGADO.
// ============================================================
const express = require('express');
const router = express.Router();
const controller = require('./dia-no-habil.controller');
const { requiereRol } = require('../../middlewares/auth.middleware');

const soloAbogado = requiereRol('ABOGADO');

router.get('/', controller.listar);                       // GET    /api/dias-no-habiles
router.get('/:id', controller.obtener);                   // GET    /api/dias-no-habiles/3
router.post('/', soloAbogado, controller.crear);          // POST   /api/dias-no-habiles
router.put('/:id', soloAbogado, controller.actualizar);   // PUT    /api/dias-no-habiles/3
router.delete('/:id', soloAbogado, controller.eliminar);  // DELETE /api/dias-no-habiles/3

module.exports = router;