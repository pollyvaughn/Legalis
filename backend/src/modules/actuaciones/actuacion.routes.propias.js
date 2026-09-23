// ============================================================
// ACTUACIONES ROUTES (propias) — Módulo 2
// Base montada en app.js como: /api/actuaciones
// Para operaciones que solo necesitan el id de la actuación,
// sin depender de conocer el expedienteId (mismo patrón que
// partes.routes.propias.js).
//
// PERMISOS: GET para ABOGADO y ASISTENTE; editar/eliminar solo
// ABOGADO (RN-39).
// ============================================================
const express = require('express');
const router = express.Router();
const controller = require('./actuacion.controller');
const { requiereRol } = require('../../middlewares/auth.middleware');

const soloAbogado = requiereRol('ABOGADO');

router.get('/:id', controller.obtener);                  // GET    /api/actuaciones/12
router.put('/:id', soloAbogado, controller.actualizar);  // PUT    /api/actuaciones/12
router.delete('/:id', soloAbogado, controller.eliminar); // DELETE /api/actuaciones/12

module.exports = router;