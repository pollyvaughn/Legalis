// ==========================================
// AUTH CONTROLLER
// Recibe la request HTTP, delega al service, devuelve la respuesta.
// ==========================================

const authService = require('./auth.service');

async function login(req, res) {
  const { email, password } = req.body;

  // Validación básica de presencia (la validación de formato de email
  // se puede agregar después con Zod si querés ser más estricta)
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }

  try {
    const resultado = await authService.login(email, password);
    return res.status(200).json(resultado);
  } catch (error) {
    // 401 = "no autorizado", el código HTTP correcto para credenciales inválidas
    return res.status(401).json({ error: error.message });
  }
}

module.exports = { login };