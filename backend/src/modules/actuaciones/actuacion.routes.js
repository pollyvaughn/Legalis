// ============================================================
// ACTUACIONES ROUTES — Módulo 2 (anidadas bajo expediente)
// Base montada en app.js como:
//   /api/expedientes/:expedienteId/actuaciones
//
// mergeParams: true es OBLIGATORIO — sin esto, este router no
// puede leer :expedienteId porque ese param lo declaró app.js
// en el app.use(), no este archivo (mismo patrón que partes.routes.js).
//
// PERMISOS: GET para ABOGADO y ASISTENTE (no es información
// financiera); crear solo ABOGADO (RN-39).
// verificarToken y exigirPasswordCambiada ya se aplicaron en
// app.js dentro del array 'protegido' — acá NO se repiten.
// ============================================================
const express = require('express');
const router = express.Router({ mergeParams: true });
const controller = require('./actuacion.controller');
const { requiereRol } = require('../../middlewares/auth.middleware');

const soloAbogado = requiereRol('ABOGADO');

router.post('/', soloAbogado, controller.crear);   // POST /api/expedientes/5/actuaciones
router.get('/', controller.listar);                // GET  /api/expedientes/5/actuaciones

module.exports = router;