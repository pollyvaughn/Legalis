// ============================================
// CONFIGURACIÓN DE PRISMA CLIENT
// Instancia única compartida por toda la app.
// Evita abrir múltiples conexiones a la base de datos.
//
// Prisma 7 requiere pasar explícitamente un "driver adapter"
// para conectarse directo a PostgreSQL (antes era automático).
// ============================================

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

// El adapter recibe la connection string y hace de puente
// entre Prisma y el driver real de PostgreSQL (pg)
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Instancia única de Prisma Client (patrón singleton), usando el adapter
const prisma = new PrismaClient({ adapter });

module.exports = prisma;