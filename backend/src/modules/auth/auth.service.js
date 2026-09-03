// ==========================================
// AUTH SERVICE
// Lógica de autenticación: valida credenciales y genera JWT.
// No sabe nada de HTTP (eso lo maneja el controller) — solo
// recibe email/password y devuelve el usuario + token, o un error.
// ==========================================

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/database');

// TIEMPO DE VIDA DEL TOKEN: después de este lapso, el usuario
// tiene que loguearse de nuevo. 8h cubre una jornada laboral.
const JWT_EXPIRES_IN = '8h';

async function login(email, password) {
  // Busca el usuario por email (único en la tabla)
  const user = await prisma.user.findUnique({ where: { email } });

  // No revelamos si falló por email inexistente o contraseña incorrecta
  // (mismo mensaje genérico) — evita que alguien pueda "probar" emails válidos
  if (!user || !user.activo) {
    throw new Error('Credenciales inválidas');
  }

  // bcrypt.compare re-hashea la contraseña recibida y la compara
  // contra el hash guardado, sin nunca desencriptar el hash original
  const passwordValida = await bcrypt.compare(password, user.passwordHash);

  if (!passwordValida) {
    throw new Error('Credenciales inválidas');
  }

  // El PAYLOAD del token: datos mínimos necesarios para identificar
  // y autorizar al usuario en cada request futura, sin tener que
  // consultar la DB de nuevo en cada endpoint protegido.
  const payload = {
    id: user.id,
    email: user.email,
    rol: user.rol,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  return {
    token,
    usuario: {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
    },
  };
}

module.exports = { login };