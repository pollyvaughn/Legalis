// ============================================
// APP.JS
// Define la aplicación Express: middlewares y rutas.
// No levanta el servidor (eso lo hace server.js).
// ============================================

const express = require('express');
const cors = require('cors');
const { verificarToken, exigirPasswordCambiada } = require('./middlewares/auth.middleware');

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
// PROTECCIÓN COMÚN DE RUTAS PRIVADAS
// Cadena que se aplica a TODO módulo (excepto /api/auth):
//   1. verificarToken          → ¿hay un JWT válido?
//   2. exigirPasswordCambiada  → ¿ya cambió su clave temporal?
// El control de ROL (ABOGADO vs ASISTENTE) se hace después,
// ruta por ruta, dentro de cada *.routes.js con requiereRol().
// ------------------------------------------
const protegido = [verificarToken, exigirPasswordCambiada];

// Gestión de usuarios (solo ABOGADO; el control de rol está dentro del router)
app.use('/api/usuarios', protegido, require('./modules/usuarios/usuarios.routes'));

// ------------------------------------------
// MÓDULO 1.1 y 1.2 — Clientes y expedientes
// ------------------------------------------
app.use('/api/clientes', protegido, require('./modules/clientes/clientes.routes'));
app.use('/api/expedientes', protegido, require('./modules/expedientes/expedientes.routes'));

// Partes procesales ANIDADAS bajo expediente:
// POST /api/expedientes/:expedienteId/partes  → crear una parte
// GET  /api/expedientes/:expedienteId/partes  → listar partes de ese expediente
// mergeParams (definido en partes.routes.js) permite que ese router
// lea :expedienteId aunque lo haya declarado este app.use, no él mismo.
app.use(
  '/api/expedientes/:expedienteId/partes',
  protegido,
  require('./modules/partes/partes.routes')
);

// Partes procesales PROPIAS, para operaciones que no dependen
// de conocer el expedienteId (por ahora, solo editar por id):
// PUT /api/partes/:id
app.use('/api/partes', protegido, require('./modules/partes/partes.routes.propias'));

// ------------------------------------------
// MÓDULO 1.4 — Biblioteca de escritos
// ------------------------------------------
app.use('/api/plantillas', protegido, require('./modules/plantillas/plantillas.routes'));

// ------------------------------------------
// MÓDULO 1.3 — Asesorías y trámites
// ------------------------------------------
// Catálogo de trámites
app.use('/api/tipos-tramite', protegido, require('./modules/tipos-tramite/tipos-tramite.routes'));
// Obligaciones periódicas
app.use('/api/obligaciones', protegido, require('./modules/obligaciones/obligaciones.routes'));
// Trámites (vencimientos)
app.use('/api/tramites', protegido, require('./modules/tramites/tramites.routes'));
// Documentos recibidos (de trámites y de expedientes)
const documentosRoutes = require('./modules/documentos/documentos.routes');
app.use('/api/tramites/:tramiteId/documentos', protegido, documentosRoutes.porTramite);
app.use('/api/expedientes/:expedienteId/documentos', protegido, documentosRoutes.porExpediente);
app.use('/api/documentos', protegido, documentosRoutes.propias);

module.exports = app;