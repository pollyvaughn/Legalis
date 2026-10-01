// ============================================================
// AUDITORIA ROUTES
// Todo el módulo es de consulta exclusiva del ABOGADO (RNF 11.6:
// "es de consulta exclusiva del Administrador").
// ============================================================
const express = require('express');
const router = express.Router();
const controller = require('./auditoria.controller');
const { requiereRol } = require('../../middlewares/auth.middleware');

const soloAbogado = requiereRol('ABOGADO');

router.get('/entidades', soloAbogado, controller.entidades); // antes de "/" no hay conflicto de rutas acá, pero mantenemos el orden por costumbre
router.get('/', soloAbogado, controller.listar);

module.exports = router;