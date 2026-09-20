// ==========================================
// AUTH MIDDLEWARE
// Contiene los tres "filtros" que se aplican a las rutas privadas:
//   1. verificarToken          → ¿hay un JWT válido?
//   2. exigirPasswordCambiada  → ¿ya cambió su contraseña temporal?
//   3. requiereRol             → ¿su rol tiene permiso para esta acción?
// ==========================================

const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

// ==========================================
// MIDDLEWARE DE AUTENTICACIÓN
// Verifica que la request traiga un JWT válido en el header
// Authorization. Si es válido, cuelga los datos del usuario
// en req.usuario para que el resto del pipeline (controllers)
// sepa quién está haciendo la petición.
// ==========================================
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
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Datos del usuario disponibles para los siguientes middlewares/controllers
    req.usuario = payload; // { id, email, rol }

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// ==========================================
// MIDDLEWARE: EXIGIR CONTRASEÑA YA CAMBIADA
// Bloquea el acceso a la API si el usuario todavía tiene una
// contraseña temporal (debeCambiarPassword = true).
// Se usa DESPUÉS de verificarToken.
// NO se aplica a /api/auth/cambiar-password (es justo la ruta
// que necesita para salir de ese estado).
// Consulta la DB en cada request a propósito: si la abogada
// resetea una clave o desactiva a alguien, el efecto es inmediato
// aunque el token de esa persona todavía no haya vencido.
// ==========================================
async function exigirPasswordCambiada(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.usuario.id },
      select: { activo: true, debeCambiarPassword: true },
    });

    // Usuario desactivado o borrado mientras tenía sesión abierta
    if (!user || !user.activo) {
      return res.status(401).json({ error: 'Usuario inactivo o inexistente' });
    }

    if (user.debeCambiarPassword) {
      // "codigo" propio para que el frontend distinga este 403
      // de un 403 por falta de permisos de rol.
      return res.status(403).json({
        error: 'Debés cambiar tu contraseña antes de continuar',
        codigo: 'DEBE_CAMBIAR_PASSWORD',
      });
    }

    next();
  } catch (error) {
    // Log del error real en la terminal del backend (para depurar).
    // Al cliente solo le devolvemos un mensaje genérico.
    console.error('Error en exigirPasswordCambiada:', error);
    return res.status(500).json({ error: 'Error verificando el usuario' });
  }
}

// ==========================================
// MIDDLEWARE DE AUTORIZACIÓN POR ROL
// Se usa DESPUÉS de verificarToken (necesita req.usuario cargado).
// Recibe la lista de roles permitidos y bloquea si el rol del
// usuario logueado no está en esa lista.
// Ejemplo: requiereRol('ABOGADO') en rutas de escritura.
// ==========================================
function requiereRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tenés permiso para realizar esta acción' });
    }

    next();
  };
}

module.exports = { verificarToken, exigirPasswordCambiada, requiereRol };