// ==========================================
// SEED: Creación de los usuarios iniciales
// Este sistema no tiene alta de usuarios abierta a propósito:
// los usuarios iniciales se crean con este script, corrido a mano.
//
// Roles del sistema:
//   ABOGADO     acceso total (obligatorio)
//   ASISTENTE   solo ve y usa reportes (opcional)
//
// Las credenciales NO se escriben acá: salen del archivo .env
//   SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD / SEED_ADMIN_NOMBRE          -> abogada
//   SEED_ASISTENTE_EMAIL / SEED_ASISTENTE_PASSWORD / SEED_ASISTENTE_NOMBRE -> asistente (opcional)
// La contraseña debe tener al menos 8 caracteres.
//
// Uso (desde la carpeta backend):
//   npm run seed                        crea los usuarios que no existan
//   npm run seed -- --reset-password    además, cambia la contraseña de los que ya existen
// ==========================================

require('dotenv').config();
const prisma = require('../src/config/database');
const bcrypt = require('bcrypt');

// CANTIDAD DE "SALT ROUNDS" para bcrypt: cuántas veces se re-hashea
// la contraseña internamente. 10 es el estándar recomendado
// (balance entre seguridad y velocidad de login).
const SALT_ROUNDS = 10;
const LARGO_MINIMO_PASSWORD = 8;

// ------------------------------------------
// Lee del .env los datos de un usuario a partir de su prefijo.
//  - Si no hay ni correo ni contraseña: es obligatorio -> error; opcional -> null (se omite).
//  - Si falta uno de los dos, o la contraseña es corta: error claro.
// ------------------------------------------
function leerUsuario(prefijo, rol, nombrePorDefecto, obligatorio) {
  const email = process.env[`${prefijo}_EMAIL`]?.trim().toLowerCase();
  const password = process.env[`${prefijo}_PASSWORD`];
  const nombre = process.env[`${prefijo}_NOMBRE`]?.trim() || nombrePorDefecto;

  if (!email && !password) {
    if (obligatorio) {
      throw new Error(`Faltan ${prefijo}_EMAIL y ${prefijo}_PASSWORD en el archivo .env`);
    }
    return null;
  }
  if (!email || !password) {
    throw new Error(`${prefijo}: hay que definir el correo Y la contraseña en el archivo .env`);
  }
  if (password.length < LARGO_MINIMO_PASSWORD) {
    throw new Error(`${prefijo}_PASSWORD debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres`);
  }
  return { email, password, nombre, rol };
}

// ------------------------------------------
// Crea el usuario, o (con --reset-password) le cambia la contraseña si ya existe.
// Nunca imprime la contraseña.
// ------------------------------------------
async function sembrarUsuario({ email, password, nombre, rol }, resetearPassword) {
  const existente = await prisma.user.findUnique({ where: { email } });

  if (existente && !resetearPassword) {
    console.log(`[${rol}] ${email} ya existe; sin cambios.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  if (existente) {
    await prisma.user.update({ where: { email }, data: { passwordHash } });
    console.log(`[${rol}] contraseña actualizada: ${email}`);
  } else {
    const usuario = await prisma.user.create({ data: { email, passwordHash, nombre, rol } });
    console.log(`[${rol}] creado:`, { id: usuario.id, email: usuario.email });
  }
}

async function main() {
  const resetearPassword = process.argv.includes('--reset-password');

  // Se leen y validan TODOS antes de escribir en la base: si algo está mal, no se crea nada a medias
  const usuarios = [
    leerUsuario('SEED_ADMIN', 'ABOGADO', 'Abogada Legalis', true),
    leerUsuario('SEED_ASISTENTE', 'ASISTENTE', 'Asistente Legalis', false),
  ].filter(Boolean);

  for (const usuario of usuarios) {
    await sembrarUsuario(usuario, resetearPassword);
  }
}

main()
  .catch((error) => {
    console.error('Error en el seed:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });