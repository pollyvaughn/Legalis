// ============================================================
// USUARIOS CONTROLLER — Gestión de cuentas (solo ABOGADO)
// Recibe la request HTTP, valida lo básico, delega al service
// y devuelve la respuesta con el código HTTP correcto.
// ============================================================

const usuariosService = require('./usuarios.service');

// ------------------------------------------
// Validación de formato de email (simple, suficiente para este caso)
// ------------------------------------------
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ------------------------------------------
// leerIdDeRuta
// Convierte el :id de la URL (siempre llega como string) a número.
// Devuelve null si no es un entero válido.
// ------------------------------------------
function leerIdDeRuta(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// ------------------------------------------
// responderError
// Mapea el mensaje del service a un código HTTP razonable:
// "no encontrado" → 404, cualquier otra regla de negocio → 400.
// ------------------------------------------
function responderError(res, error) {
  const status = error.message === 'Usuario no encontrado' ? 404 : 400;
  return res.status(status).json({ error: error.message });
}

// GET /api/usuarios
async function listar(req, res) {
  try {
    const usuarios = await usuariosService.listar();
    return res.status(200).json(usuarios);
  } catch (error) {
    return res.status(500).json({ error: 'Error al listar usuarios' });
  }
}

// POST /api/usuarios
// Body: { nombre, email }  (el rol se ignora a propósito: siempre ASISTENTE)
async function crear(req, res) {
  const { nombre, email } = req.body;

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }
  if (!email || !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({ error: 'Ingresá un email válido' });
  }

  try {
    const resultado = await usuariosService.crear({ nombre, email });
    // 201 = "creado". Incluye passwordTemporal: el frontend debe
    // mostrarla ahora, porque no se puede volver a consultar.
    return res.status(201).json(resultado);
  } catch (error) {
    return responderError(res, error);
  }
}

// PUT /api/usuarios/:id
// Body: { nombre?, email? }
async function actualizar(req, res) {
  const id = leerIdDeRuta(req);
  if (!id) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  const { nombre, email } = req.body;

  if (nombre !== undefined && !nombre.trim()) {
    return res.status(400).json({ error: 'El nombre no puede estar vacío' });
  }
  if (email !== undefined && !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({ error: 'Ingresá un email válido' });
  }

  try {
    const usuario = await usuariosService.actualizar(id, { nombre, email });
    return res.status(200).json(usuario);
  } catch (error) {
    return responderError(res, error);
  }
}

// PATCH /api/usuarios/:id/estado
// Body: { activo: true | false }
async function cambiarEstado(req, res) {
  const id = leerIdDeRuta(req);
  if (!id) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  const { activo } = req.body;
  // typeof estricto: evita que "false" (string) o 0 pasen por booleano
  if (typeof activo !== 'boolean') {
    return res.status(400).json({ error: 'El campo "activo" debe ser true o false' });
  }

  try {
    // req.usuario.id = quien hace la acción (lo dejó verificarToken)
    const usuario = await usuariosService.cambiarEstado(id, activo, req.usuario.id);
    return res.status(200).json(usuario);
  } catch (error) {
    return responderError(res, error);
  }
}

// POST /api/usuarios/:id/resetear-password
async function resetearPassword(req, res) {
  const id = leerIdDeRuta(req);
  if (!id) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    const resultado = await usuariosService.resetearPassword(id);
    return res.status(200).json(resultado); // { passwordTemporal }
  } catch (error) {
    return responderError(res, error);
  }
}

module.exports = { listar, crear, actualizar, cambiarEstado, resetearPassword };