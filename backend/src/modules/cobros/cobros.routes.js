// ============================================================
// COBROS ROUTES — Módulo 4 (RF10)
// Exporta tres routers, cada uno se monta en su URL (app.js):
//  - porExpediente: /api/expedientes/:expedienteId/cobros
//  - porTramite:    /api/tramites/:tramiteId/cobros
//  - propias:       /api/cobros  (listado general y operaciones por id)
// mergeParams permite leer :expedienteId / :tramiteId declarados en app.use.
//
// PERMISOS: los cobros son información económica -> TODO es solo ABOGADO
// (RN-40: el ASISTENTE no ve honorarios, cobros ni saldos).
// No hay DELETE ni PUT: un recibo no se borra ni se edita, se ANULA (RN-35).
// ============================================================
const express = require('express');
const controller = require('./cobros.controller');
const { requiereRol } = require('../../middlewares/auth.middleware');

const soloAbogado = requiereRol('ABOGADO');

// --- De un EXPEDIENTE ---
const porExpediente = express.Router({ mergeParams: true });
porExpediente.get('/', soloAbogado, controller.listarDeExpediente);       // GET  /api/expedientes/5/cobros
porExpediente.post('/', soloAbogado, controller.registrarEnExpediente);   // POST /api/expedientes/5/cobros

// --- De un TRÁMITE ---
const porTramite = express.Router({ mergeParams: true });
porTramite.get('/', soloAbogado, controller.listarDeTramite);             // GET  /api/tramites/5/cobros
porTramite.post('/', soloAbogado, controller.registrarEnTramite);         // POST /api/tramites/5/cobros

// --- Propias (listado general y por id) ---
const propias = express.Router();
propias.get('/', soloAbogado, controller.listar);                         // GET  /api/cobros
propias.get('/:id', soloAbogado, controller.obtener);                     // GET  /api/cobros/5
propias.post('/:id/anular', soloAbogado, controller.anular);              // POST /api/cobros/5/anular

module.exports = { porExpediente, porTramite, propias };