// ==========================================
// AUTH ROUTES
// /login          → pública (no requiere estar logueado)
// /cambiar-password → protegida (cualquier usuario logueado,
//                     ABOGADO o ASISTENTE, cambia SU clave)
// ==========================================

const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { verificarToken } = require('../../middlewares/auth.middleware');

router.post('/login', authController.login);
router.put('/cambiar-password', verificarToken, authController.cambiarPassword);

module.exports = router;