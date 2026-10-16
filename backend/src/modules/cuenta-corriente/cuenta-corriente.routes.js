// ============================================================
// CUENTA CORRIENTE ROUTES — Módulo 3 (RF8)
// Exporta cuatro routers, cada uno se monta en su URL (app.js):
//  - panel:         /api/cuenta-corriente (resumen global, 3.4b)
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
porExpediente.get('/exportar', soloAbogado, controller.exportarDeExpediente); // PDF del estado de cuenta

const porTramite = express.Router({ mergeParams: true });
porTramite.get('/', soloAbogado, controller.deTramite); // GET /api/tramites/5/cuenta-corriente
porTramite.get('/exportar', soloAbogado, controller.exportarDeTramite); // PDF del estado de cuenta

const porCliente = express.Router({ mergeParams: true });
porCliente.get('/', soloAbogado, controller.deCliente); // GET /api/clientes/5/cuenta-corriente
porCliente.get('/exportar', soloAbogado, controller.exportarDeCliente); // PDF del estado de cuenta

// Panel global: totales del estudio + una fila por cliente (3.4b)
const panel = express.Router();
panel.get('/', soloAbogado, controller.panel); // GET /api/cuenta-corriente
panel.get('/exportar', soloAbogado, controller.exportarPanel); // PDF del panel

module.exports = { porExpediente, porTramite, porCliente, panel };