// ==========================================
// AUTH CONTROLLER
// Recibe la request HTTP, delega al service, devuelve la respuesta.
// ==========================================

const authService = require('./auth.service');

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }

  try {
    const resultado = await authService.login(email, password);
    return res.status(200).json(resultado);
  } catch (error) {
    // 401 = credenciales inválidas
    return res.status(401).json({ error: error.message });
  }
}

// ------------------------------------------
// cambiarPassword
// Ruta protegida: req.usuario lo dejó verificarToken.
// El id sale del TOKEN, nunca del body: así nadie puede cambiar
// la clave de otro usuario mandando un id ajeno.
// ------------------------------------------
async function cambiarPassword(req, res) {
  const { passwordActual, passwordNueva } = req.body;

  if (!passwordActual || !passwordNueva) {
    return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
  }

  try {
    await authService.cambiarPassword(req.usuario.id, passwordActual, passwordNueva);
    return res.status(200).json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (error) {
    // 400: el usuario mandó algo inválido (clave actual mal, nueva muy corta, etc.)
    return res.status(400).json({ error: error.message });
  }
}

module.exports = { login, cambiarPassword };