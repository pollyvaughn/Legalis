// ============================================================
// CUENTA CORRIENTE ROUTES — Módulo 3 (RF8)
// Exporta tres routers, cada uno se monta en su URL (app.js):
//  - porExpediente: /api/expedientes/:expedienteId/cuenta-corriente
//  - porTramite:    /api/tramites/:tramiteId/cuenta-corriente
//  - porCliente:    /api/clientes/:clienteId/cuenta-corriente
// mergeParams permite leer :expedienteId / :tramiteId / :clienteId
// declarados en app.use.
//
// PERMISOS: son saldos y cobros -> TODO es solo ABOGADO.
// ============================================================
const express = require('express');
const controller = require('./cuenta-corriente.controller');
const { requiereRol } = require('../../middlewares/auth.middleware');

const soloAbogado = requiereRol('ABOGADO');

const porExpediente = express.Router({ mergeParams: true });
porExpediente.get('/', soloAbogado, controller.deExpediente); // GET /api/expedientes/5/cuenta-corriente

const porTramite = express.Router({ mergeParams: true });
porTramite.get('/', soloAbogado, controller.deTramite); // GET /api/tramites/5/cuenta-corriente

const porCliente = express.Router({ mergeParams: true });
porCliente.get('/', soloAbogado, controller.deCliente); // GET /api/clientes/5/cuenta-corriente

module.exports = { porExpediente, porTramite, porCliente };