// ==========================================
// SEED: Creación de usuarios iniciales
// Script de uso único (o repetible) para crear los usuarios
// del estudio. No es un endpoint público a propósito:
// este sistema no tiene alta de usuarios abierta.
// Se corre manualmente con: node prisma/seed-users.js
// ==========================================

require('dotenv').config();
const prisma = require('../src/config/database');
const bcrypt = require('bcrypt');

// CANTIDAD DE "SALT ROUNDS" para bcrypt: cuántas veces se re-hashea
// la contraseña internamente. 10 es el estándar recomendado
// (balance entre seguridad y velocidad de login).
const SALT_ROUNDS = 10;

async function main() {
  // --- Usuario 1: Abogada principal (acceso total) ---
  const passwordAbogada = 'password111';
  const hashAbogada = await bcrypt.hash(passwordAbogada, SALT_ROUNDS);

  const abogada = await prisma.user.upsert({
    where: { email: 'abogada@legalis.com' },
    update: {},
    create: {
      email: 'abogada@legalis.com',
      passwordHash: hashAbogada,
      nombre: 'Abogada Legalis',
      rol: 'ABOGADO',
    },
  });

  // --- Usuario 2: Asistente (solo lectura + reportes) ---
  const passwordAsistente = 'password222';
  const hashAsistente = await bcrypt.hash(passwordAsistente, SALT_ROUNDS);

  const asistente = await prisma.user.upsert({
    where: { email: 'asistente@legalis.com' },
    update: {},
    create: {
      email: 'asistente@legalis.com',
      passwordHash: hashAsistente,
      nombre: 'Asistente Legalis',
      rol: 'ASISTENTE',
    },
  });

  console.log('Usuarios creados/actualizados:');
  console.log({ id: abogada.id, email: abogada.email, rol: abogada.rol });
  console.log({ id: asistente.id, email: asistente.email, rol: asistente.rol });
}

main()
  .catch((error) => {
    console.error('Error en el seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });