// ============================================================
// GASTOS ROUTES — Módulo 3 (RF8)
// Exporta tres routers, cada uno se monta en su URL (app.js):
//  - porExpediente: /api/expedientes/:expedienteId/gastos
//  - porTramite:    /api/tramites/:tramiteId/gastos
//  - propias:       /api/gastos  (operaciones por id de gasto)
// mergeParams permite leer :expedienteId / :tramiteId declarados en app.use.
//
// PERMISOS: los gastos son información económica -> TODO es solo ABOGADO
// (el ASISTENTE no ve honorarios, cobros ni saldos).
// No hay DELETE: un gasto se ANULA, no se borra.
// ============================================================
const express = require('express');
const controller = require('./gastos.controller');
const { requiereRol } = require('../../middlewares/auth.middleware');

const soloAbogado = requiereRol('ABOGADO');

// --- De un EXPEDIENTE ---
const porExpediente = express.Router({ mergeParams: true });
porExpediente.get('/', soloAbogado, controller.listarDeExpediente);    // GET  /api/expedientes/5/gastos
porExpediente.post('/', soloAbogado, controller.crearEnExpediente);    // POST /api/expedientes/5/gastos

// --- De un TRÁMITE ---
const porTramite = express.Router({ mergeParams: true });
porTramite.get('/', soloAbogado, controller.listarDeTramite);          // GET  /api/tramites/5/gastos
porTramite.post('/', soloAbogado, controller.crearEnTramite);          // POST /api/tramites/5/gastos

// --- Propias (por id) ---
const propias = express.Router();
propias.get('/:id', soloAbogado, controller.obtener);                  // GET  /api/gastos/5
propias.put('/:id', soloAbogado, controller.actualizar);               // PUT  /api/gastos/5
propias.post('/:id/anular', soloAbogado, controller.anular);           // POST /api/gastos/5/anular

module.exports = { porExpediente, porTramite, propias };