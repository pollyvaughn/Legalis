// ============================================
// APP.JS
// Define la aplicación Express: middlewares y rutas.
// No levanta el servidor (eso lo hace server.js).
// ============================================

const express = require('express');
const cors = require('cors');
const { verificarToken } = require('./middlewares/auth.middleware');

const app = express();

// ------------------------------------------
// MIDDLEWARES GLOBALES
// ------------------------------------------

// Permite peticiones desde el frontend (React en otro puerto/origen)
app.use(cors());

// Parsea automáticamente el body de las peticiones como JSON
// Sin esto, req.body llegaría undefined en POST/PUT
app.use(express.json());

// ------------------------------------------
// RUTA DE PRUEBA (health check)
// Pública a propósito: sirve para confirmar que el server responde
// sin depender de login ni de la base de datos.
// ------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mensaje: 'PROYECTO 26 backend funcionando' });
});

// ------------------------------------------
// RUTAS PÚBLICAS (no requieren estar logueado)
// ------------------------------------------
app.use('/api/auth', require('./modules/auth/auth.routes'));

// ------------------------------------------
// RUTAS PROTEGIDAS
// verificarToken se aplica ANTES del router de cada módulo:
// si el token falta o es inválido, la request nunca llega
// a clientes.routes.js / expedientes.routes.js.
// ------------------------------------------
app.use('/api/clientes', verificarToken, require('./modules/clientes/clientes.routes'));
app.use('/api/expedientes', verificarToken, require('./modules/expedientes/expedientes.routes'));

// Partes procesales ANIDADAS bajo expediente:
// POST /api/expedientes/:expedienteId/partes  → crear una parte
// GET  /api/expedientes/:expedienteId/partes  → listar partes de ese expediente
// mergeParams (definido en partes.routes.js) permite que ese router
// lea :expedienteId aunque lo haya declarado este app.use, no él mismo.
app.use(
  '/api/expedientes/:expedienteId/partes',
  verificarToken,
  require('./modules/partes/partes.routes')
);

// Partes procesales PROPIAS, para operaciones que no dependen
// de conocer el expedienteId (por ahora, solo editar por id):
// PUT /api/partes/:id
app.use('/api/partes', verificarToken, require('./modules/partes/partes.routes.propias'));

module.exports = app;