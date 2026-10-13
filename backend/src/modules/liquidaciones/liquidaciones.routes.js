// ============================================================
// LIQUIDACIONES ROUTES — Módulo 3 (RF7)
// Exporta tres routers, cada uno se monta en su URL (app.js):
//  - porExpediente: /api/expedientes/:expedienteId/liquidaciones
//  - porTramite:    /api/tramites/:tramiteId/liquidaciones
//  - propias:       /api/liquidaciones  (cálculo previo + operaciones por id)
// mergeParams permite leer :expedienteId / :tramiteId declarados en app.use.
//
// PERMISOS: honorarios es información económica -> TODO es solo ABOGADO.
// (Si la abogada quiere que la asistente pueda consultar, basta con
// sacar soloAbogado de los GET.)
// ============================================================
const express = require('express');
const controller = require('./liquidaciones.controller');
const { requiereRol } = require('../../middlewares/auth.middleware');

const soloAbogado = requiereRol('ABOGADO');

// --- De un EXPEDIENTE ---
const porExpediente = express.Router({ mergeParams: true });
porExpediente.get('/', soloAbogado, controller.listarDeExpediente);    // GET  /api/expedientes/5/liquidaciones
porExpediente.post('/', soloAbogado, controller.crearEnExpediente);    // POST /api/expedientes/5/liquidaciones

// --- De un TRÁMITE ---
const porTramite = express.Router({ mergeParams: true });
porTramite.get('/', soloAbogado, controller.listarDeTramite);          // GET  /api/tramites/5/liquidaciones
porTramite.post('/', soloAbogado, controller.crearEnTramite);          // POST /api/tramites/5/liquidaciones

// --- Propias (por id) ---
// /calcular va ANTES de /:id, o "calcular" se tomaría como un id.
const propias = express.Router();
propias.get('/calcular', soloAbogado, controller.calcular);   // GET    /api/liquidaciones/calcular?...
propias.get('/:id', soloAbogado, controller.obtener);         // GET    /api/liquidaciones/5
propias.put('/:id', soloAbogado, controller.actualizar);      // PUT    /api/liquidaciones/5
propias.delete('/:id', soloAbogado, controller.eliminar);     // DELETE /api/liquidaciones/5

module.exports = { porExpediente, porTramite, propias };