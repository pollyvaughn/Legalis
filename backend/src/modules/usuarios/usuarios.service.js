// ============================================================
// USUARIOS SERVICE — Gestión de cuentas (solo ABOGADO)
// Lógica de negocio: crear asistentes con contraseña temporal,
// listar, editar, activar/desactivar y resetear contraseña.
// No sabe nada de HTTP (eso lo maneja el controller).
// ============================================================

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const prisma = require('../../config/database');
const { BCRYPT_ROUNDS } = require('../auth/auth.service');

// ------------------------------------------
// CAMPOS QUE SE DEVUELVEN AL FRONTEND
// Lista explícita ("select") para NUNCA filtrar el passwordHash
// por accidente en una respuesta. Si agregás un campo al modelo
// User, no se expone hasta que lo sumes acá.
// ------------------------------------------
const CAMPOS_PUBLICOS = {
  id: true,
  email: true,
  nombre: true,
  rol: true,
  activo: true,
  debeCambiarPassword: true,
  createdAt: true,
  updatedAt: true,
};

// ------------------------------------------
// generarPasswordTemporal
// Crea una contraseña aleatoria de 10 caracteres.
// - crypto.randomBytes: aleatoriedad criptográficamente segura
//   (Math.random() NO sirve para contraseñas, es predecible).
// - Alfabeto SIN caracteres ambiguos (0/O, 1/l/I) para que sea
//   fácil de leer o dictar por teléfono.
// ------------------------------------------
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const LARGO_PASSWORD_TEMPORAL = 10;

function generarPasswordTemporal() {
  const bytes = crypto.randomBytes(LARGO_PASSWORD_TEMPORAL);
  let resultado = '';
  for (let i = 0; i < LARGO_PASSWORD_TEMPORAL; i++) {
    // "% ALFABETO.length" mapea cada byte (0-255) a una posición del alfabeto
    resultado += ALFABETO[bytes[i] % ALFABETO.length];
  }
  return resultado;
}

// ------------------------------------------
// normalizarEmail
// Minúsculas y sin espacios, para que "Ana@Mail.com " y
// "ana@mail.com" no cuenten como dos cuentas distintas.
// ------------------------------------------
function normalizarEmail(email) {
  return email.trim().toLowerCase();
}

// ------------------------------------------
// listar
// Devuelve todos los usuarios (activos e inactivos) ordenados:
// primero el ABOGADO, después los asistentes por nombre.
// ------------------------------------------
async function listar() {
  return prisma.user.findMany({
    select: CAMPOS_PUBLICOS,
    // orderBy con arreglo = primero por rol, después por nombre.
    // El enum se ordena según el orden de declaración (ABOGADO antes que ASISTENTE).
    orderBy: [{ rol: 'asc' }, { nombre: 'asc' }],
  });
}

// ------------------------------------------
// crear
// Alta de un ASISTENTE. Devuelve el usuario creado + la contraseña
// temporal EN TEXTO PLANO (única vez que existe así: en la base
// solo se guarda el hash, así que no se puede recuperar después).
// ------------------------------------------
async function crear({ nombre, email }) {
  const emailNormalizado = normalizarEmail(email);

  // Validación previa de email duplicado: da un mensaje claro en
  // vez del error crudo de la restricción UNIQUE de la base.
  const existente = await prisma.user.findUnique({ where: { email: emailNormalizado } });
  if (existente) {
    throw new Error('Ya existe un usuario con ese email');
  }

  const passwordTemporal = generarPasswordTemporal();
  const passwordHash = await bcrypt.hash(passwordTemporal, BCRYPT_ROUNDS);

  const usuario = await prisma.user.create({
    data: {
      nombre: nombre.trim(),
      email: emailNormalizado,
      passwordHash,
      rol: 'ASISTENTE',          // siempre ASISTENTE: hay un único ABOGADO
      activo: true,
      debeCambiarPassword: true, // obligado a cambiarla en el primer ingreso
    },
    select: CAMPOS_PUBLICOS,
  });

  return { usuario, passwordTemporal };
}

// ------------------------------------------
// actualizar
// Edita nombre y/o email. El rol, el estado y la contraseña
// tienen sus propias acciones (no se tocan desde acá).
// ------------------------------------------
async function actualizar(id, { nombre, email }) {
  const usuario = await prisma.user.findUnique({ where: { id } });
  if (!usuario) {
    throw new Error('Usuario no encontrado');
  }

  const data = {};
  if (nombre !== undefined) {
    data.nombre = nombre.trim();
  }
  if (email !== undefined) {
    const emailNormalizado = normalizarEmail(email);
    // Solo chequea duplicado si el email realmente cambió
    if (emailNormalizado !== usuario.email) {
      const duplicado = await prisma.user.findUnique({ where: { email: emailNormalizado } });
      if (duplicado) {
        throw new Error('Ya existe un usuario con ese email');
      }
      data.email = emailNormalizado;
    }
  }

  return prisma.user.update({
    where: { id },
    data,
    select: CAMPOS_PUBLICOS,
  });
}

// ------------------------------------------
// cambiarEstado
// Activa o desactiva una cuenta (no se borra: se conserva el
// historial). Reglas:
//   1. No puede desactivarse a sí mismo (quedaría sin acceso).
//   2. No se puede desactivar al último ABOGADO activo.
// idSolicitante = id de quien hace la acción (sale del token).
// ------------------------------------------
async function cambiarEstado(id, activo, idSolicitante) {
  const usuario = await prisma.user.findUnique({ where: { id } });
  if (!usuario) {
    throw new Error('Usuario no encontrado');
  }

  if (!activo) {
    // Regla 1: autodesactivación
    if (id === idSolicitante) {
      throw new Error('No podés desactivar tu propia cuenta');
    }

    // Regla 2: último ABOGADO activo
    if (usuario.rol === 'ABOGADO') {
      const abogadosActivos = await prisma.user.count({
        where: { rol: 'ABOGADO', activo: true },
      });
      if (abogadosActivos <= 1) {
        throw new Error('No se puede desactivar al único abogado activo del sistema');
      }
    }
  }

  return prisma.user.update({
    where: { id },
    data: { activo },
    select: CAMPOS_PUBLICOS,
  });
}

// ------------------------------------------
// resetearPassword
// La abogada genera una nueva contraseña temporal para un usuario
// (ej. la asistente olvidó la suya). Reactiva debeCambiarPassword
// para que la cambie al próximo ingreso. Devuelve la temporal
// en texto plano UNA sola vez.
// Solo aplica a ASISTENTE: la abogada cambia la suya desde "Mi perfil".
// ------------------------------------------
async function resetearPassword(id) {
  const usuario = await prisma.user.findUnique({ where: { id } });
  if (!usuario) {
    throw new Error('Usuario no encontrado');
  }
  if (usuario.rol === 'ABOGADO') {
    throw new Error('La contraseña del abogado se cambia desde "Mi perfil"');
  }

  const passwordTemporal = generarPasswordTemporal();
  const passwordHash = await bcrypt.hash(passwordTemporal, BCRYPT_ROUNDS);

  await prisma.user.update({
    where: { id },
    data: { passwordHash, debeCambiarPassword: true },
  });

  return { passwordTemporal };
}

module.exports = { listar, crear, actualizar, cambiarEstado, resetearPassword };