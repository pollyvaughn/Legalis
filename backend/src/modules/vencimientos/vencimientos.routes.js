// ============================================================
// VENCIMIENTOS ROUTES — Módulo 2 (RF6)
// Base montada en app.js como: /api/vencimientos
//
// PERMISOS: es solo lectura (un reporte), así que lo pueden pedir
// ABOGADO y ASISTENTE (RN-39: el Asistente genera reportes operativos).
// verificarToken y exigirPasswordCambiada ya se aplicaron en app.js.
// ============================================================
const express = require('express');
const router = express.Router();
const controller = require('./vencimientos.controller');

router.get('/exportar', controller.exportar); // GET /api/vencimientos/exportar?tipo=&desde=&hasta=

module.exports = router;