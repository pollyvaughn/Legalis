// ============================================================
// PLAZOS ROUTES — Módulo 2 (anidadas bajo expediente)
// Base montada en app.js como:
//   /api/expedientes/:expedienteId/plazos
//
// mergeParams: true es OBLIGATORIO — sin esto, este router no
// puede leer :expedienteId porque ese param lo declaró app.js
// en el app.use(), no este archivo (mismo patrón que actuaciones).
//
// PERMISOS: GET para ABOGADO y ASISTENTE (RF6 dice que el
// Asistente puede consultar el calendario); crear solo ABOGADO.
// ============================================================
const express = require('express');
const router = express.Router({ mergeParams: true });
const controller = require('./plazos.controller');
const { requiereRol } = require('../../middlewares/auth.middleware');

const soloAbogado = requiereRol('ABOGADO');

// Importante: la ruta '/calcular' va ANTES de cualquier ':id' que
// pudiera confundirse, aunque acá no hay conflicto porque este
// router no tiene rutas por :id (esas están en plazo.routes.propias.js).
router.get('/calcular', controller.calcular);       // GET  /api/expedientes/5/plazos/calcular
router.post('/', soloAbogado, controller.crear);    // POST /api/expedientes/5/plazos
router.get('/', controller.listarPorExpediente);    // GET  /api/expedientes/5/plazos

module.exports = router;