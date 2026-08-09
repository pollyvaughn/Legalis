// ============================================
// APP.JS
// Define la aplicación Express: middlewares y rutas.
// No levanta el servidor (eso lo hace server.js).
// ============================================

const express = require('express');
const cors = require('cors');

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
// Sirve para confirmar rápido que el server responde,
// sin depender de la base de datos.
// ------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mensaje: 'PROYECTO 26 backend funcionando' });
});

// ------------------------------------------
// RUTAS DE LA APLICACIÓN
// ------------------------------------------
app.use('/api/clientes', require('./routes/clientes.routes'));

module.exports = app;