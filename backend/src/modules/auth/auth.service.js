// ==========================================
// AUTH SERVICE
// Lógica de autenticación: valida credenciales, genera JWT
// y permite al usuario cambiar SU PROPIA contraseña.
// No sabe nada de HTTP (eso lo maneja el controller).
// ==========================================

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/database');

// TIEMPO DE VIDA DEL TOKEN: 8h cubre una jornada laboral.
const JWT_EXPIRES_IN = '8h';

// COSTO DE BCRYPT: cuántas "rondas" de hasheo. 10 es el estándar;
// más alto = más seguro pero más lento. Se usa el mismo valor
// en todo el sistema (login, cambio de clave, alta de usuarios).
const BCRYPT_ROUNDS = 10;

// LARGO MÍNIMO de contraseña. Se valida solo al CAMBIARLA/CREARLA,
// nunca al hacer login (no tiene sentido validar reglas ahí).
const PASSWORD_MIN_LENGTH = 8;

// ------------------------------------------
// login
// Devuelve token + datos del usuario, incluyendo debeCambiarPassword
// para que el frontend sepa si tiene que forzar el cambio de clave.
// ------------------------------------------
async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Mismo mensaje genérico para "no existe" e "inactivo" y "clave mala":
  // evita que alguien pueda probar qué emails existen.
  if (!user || !user.activo) {
    throw new Error('Credenciales inválidas');
  }

  const passwordValida = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValida) {
    throw new Error('Credenciales inválidas');
  }

  // PAYLOAD del token: solo lo mínimo para identificar/autorizar.
  // (debeCambiarPassword NO va en el token a propósito: si la abogada
  // resetea la clave de alguien, el estado real vive en la DB, no en
  // un token viejo que todavía no venció.)
  const payload = { id: user.id, email: user.email, rol: user.rol };
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
      debeCambiarPassword: user.debeCambiarPassword,
    },
  };
}

// ------------------------------------------
// cambiarPassword
// El usuario logueado cambia SU PROPIA contraseña.
// Pide la actual (aunque sea la temporal) como prueba de que es él
// y no alguien que encontró la sesión abierta.
// Al terminar, apaga el flag debeCambiarPassword.
// ------------------------------------------
async function cambiarPassword(userId, passwordActual, passwordNueva) {
  if (!passwordNueva || passwordNueva.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`La contraseña nueva debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.activo) {
    throw new Error('Usuario no encontrado');
  }

  const actualValida = await bcrypt.compare(passwordActual, user.passwordHash);
  if (!actualValida) {
    throw new Error('La contraseña actual es incorrecta');
  }

  // Evita "cambiar" a la misma clave (sobre todo a la temporal,
  // que la abogada conoce).
  const esLaMisma = await bcrypt.compare(passwordNueva, user.passwordHash);
  if (esLaMisma) {
    throw new Error('La contraseña nueva debe ser distinta a la actual');
  }

  const nuevoHash = await bcrypt.hash(passwordNueva, BCRYPT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: nuevoHash, debeCambiarPassword: false },
  });
}

module.exports = { login, cambiarPassword, BCRYPT_ROUNDS, PASSWORD_MIN_LENGTH };