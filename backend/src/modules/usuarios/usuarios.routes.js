// ============================================================
// USUARIOS ROUTES — Gestión de cuentas. Base: /api/usuarios
//
// PERMISOS: TODO el módulo es solo ABOGADO. Se aplica una sola
// vez con router.use(): cualquier ruta declarada abajo hereda
// la restricción, así no se puede olvidar en una ruta nueva.
// ============================================================

const express = require('express');
const router = express.Router();
const controller = require('./usuarios.controller');
const { requiereRol } = require('../../middlewares/auth.middleware');

// router.use aplica el middleware a TODAS las rutas de este archivo
router.use(requiereRol('ABOGADO'));

router.get('/', controller.listar);                                   // GET   /api/usuarios
router.post('/', controller.crear);                                   // POST  /api/usuarios
router.put('/:id', controller.actualizar);                            // PUT   /api/usuarios/5
router.patch('/:id/estado', controller.cambiarEstado);                // PATCH /api/usuarios/5/estado
router.post('/:id/resetear-password', controller.resetearPassword);   // POST  /api/usuarios/5/resetear-password

module.exports = router;