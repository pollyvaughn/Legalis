// ============================================================
// DOCUMENTOS ROUTES — Módulo 1.3
// Exporta tres routers, cada uno se monta en su propia URL (app.js):
//  - porTramite:     /api/tramites/:tramiteId/documentos
//  - porExpediente:  /api/expedientes/:expedienteId/documentos
//  - propias:        /api/documentos  (operaciones por id de documento)
// mergeParams permite leer :tramiteId / :expedienteId, que están
// declarados en el app.use y no en este archivo (igual que partes).
// ============================================================
const express = require('express');
const controller = require('./documentos.controller');

// --- Documentos de un TRÁMITE ---
const porTramite = express.Router({ mergeParams: true });
porTramite.get('/', controller.listarDeTramite);    // GET  /api/tramites/5/documentos
porTramite.post('/', controller.crearEnTramite);    // POST /api/tramites/5/documentos

// --- Documentos de un EXPEDIENTE ---
const porExpediente = express.Router({ mergeParams: true });
porExpediente.get('/', controller.listarDeExpediente);  // GET  /api/expedientes/5/documentos
porExpediente.post('/', controller.crearEnExpediente);  // POST /api/expedientes/5/documentos

// --- Operaciones por id de documento ---
const propias = express.Router();
propias.put('/:id', controller.actualizar);     // PUT    /api/documentos/5
propias.delete('/:id', controller.eliminar);    // DELETE /api/documentos/5

module.exports = { porTramite, porExpediente, propias };