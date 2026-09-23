// ============================================================
// PLAZOS ROUTES (propias) — Módulo 2
// Base montada en app.js como: /api/plazos
//
// Incluye también el dashboard global de pendientes (GET /),
// que NO depende de un expediente puntual — es el panel de
// alertas de RF6 con todos los vencimientos del estudio.
//
// PERMISOS: GET (incluido el dashboard) para ABOGADO y ASISTENTE;
// editar/marcar cumplido/eliminar solo ABOGADO.
// ============================================================
const express = require('express');
const router = express.Router();
const controller = require('./plazos.controller');
const { requiereRol } = require('../../middlewares/auth.middleware');

const soloAbogado = requiereRol('ABOGADO');

router.get('/', controller.listarPendientesGlobal);              // GET    /api/plazos (dashboard)
router.get('/:id', controller.obtener);                          // GET    /api/plazos/12
router.put('/:id', soloAbogado, controller.actualizar);          // PUT    /api/plazos/12
router.patch('/:id/cumplido', soloAbogado, controller.marcarCumplido); // PATCH  /api/plazos/12/cumplido
router.delete('/:id', soloAbogado, controller.eliminar);         // DELETE /api/plazos/12

module.exports = router;