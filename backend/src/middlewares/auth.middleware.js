// ==========================================
// MIDDLEWARE DE AUTENTICACIÓN
// Verifica que la request traiga un JWT válido en el header
// Authorization. Si es válido, cuelga los datos del usuario
// en req.usuario para que el resto del pipeline (controllers)
// sepa quién está haciendo la petición.
// Se aplica ANTES de cualquier ruta que requiera estar logueado.
// ==========================================

const jwt = require('jsonwebtoken');

function verificarToken(req, res, next) {
  // El header viene con formato: "Authorization: Bearer <token>"
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  // Separa "Bearer" del token real
  const token = authHeader.split(' ')[1];

  try {
    // jwt.verify chequea la firma Y que no haya expirado.
    // Si algo falla, tira una excepción (por eso el try/catch).
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Dejamos los datos del usuario disponibles para los controllers
    // siguientes en la cadena (ej. para saber quién creó un registro)
    req.usuario = payload; // { id, email, rol }

    next(); // deja pasar la request al siguiente middleware/controller
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// ==========================================
// MIDDLEWARE DE AUTORIZACIÓN POR ROL
// Se usa DESPUÉS de verificarToken (necesita req.usuario ya cargado).
// Recibe la lista de roles permitidos y bloquea si el rol del
// usuario logueado no está en esa lista.
//
// Ejemplo de uso: requiereRol('ABOGADO') en rutas de escritura,
// para que ASISTENTE pueda loguearse y leer, pero no modificar.
// ==========================================

function requiereRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      // Esto no debería pasar si el middleware está bien encadenado,
      // pero es una guarda de seguridad extra.
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tenés permiso para realizar esta acción' });
    }

    next();
  };
}

module.exports = { verificarToken, requiereRol };