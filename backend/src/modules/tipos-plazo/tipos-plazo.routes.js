// ============================================================
// TIPOS DE PLAZO ROUTES — Módulo 2
// Base montada en app.js como: /api/tipos-plazo
//
// PERMISOS: GET para ABOGADO y ASISTENTE (necesita verlo para
// elegirlo al cargar un plazo, aunque el Asistente no cree
// plazos); crear/editar/inactivar/eliminar solo ABOGADO.
// ============================================================
const express = require('express');
const router = express.Router();
const controller = require('./tipos-plazo.controller');
const { requiereRol } = require('../../middlewares/auth.middleware');

const soloAbogado = requiereRol('ABOGADO');

router.get('/', controller.listar);                              // GET    /api/tipos-plazo
router.get('/:id', controller.obtener);                          // GET    /api/tipos-plazo/3
router.post('/', soloAbogado, controller.crear);                 // POST   /api/tipos-plazo
router.put('/:id', soloAbogado, controller.actualizar);          // PUT    /api/tipos-plazo/3
router.patch('/:id/activo', soloAbogado, controller.cambiarActivo); // PATCH  /api/tipos-plazo/3/activo
router.delete('/:id', soloAbogado, controller.eliminar);         // DELETE /api/tipos-plazo/3

module.exports = router;