// ============================================================
// SEED: TipoPlazo
// Carga los plazos habituales que confirmó la abogada, para no
// tener que tipearlos a mano uno por uno desde Postman/UI.
// Es idempotente: si un tipo (mismo nombre+fuero) ya existe, lo
// saltea en vez de duplicarlo o romper por el @@unique.
//
// Uso (desde la carpeta backend):
//   node prisma/seeds/seedTiposPlazo.js
// ============================================================

require('dotenv').config();
const prisma = require('../../src/config/database'); // misma instancia compartida que el resto del proyecto

// Los 8 plazos confirmados por la abogada (carpeta de proyecto).
// modalidadDefault HABILES en todos, porque son plazos de fueros
// no penales (civil/laboral) — RN-19 solo cambia la modalidad
// por defecto para Penal, que no tiene un tipo propio en esta lista.
const TIPOS_PLAZO_INICIALES = [
  { nombre: 'Contestación de demanda civil', fuero: 'CIVIL_COMERCIAL', diasDefault: 18, modalidadDefault: 'HABILES' },
  { nombre: 'Contestación de demanda laboral', fuero: 'LABORAL', diasDefault: 6, modalidadDefault: 'HABILES' },
  { nombre: 'Oposición de excepciones', fuero: 'CIVIL_COMERCIAL', diasDefault: 5, modalidadDefault: 'HABILES' },
  { nombre: 'Apelación de sentencia civil', fuero: 'CIVIL_COMERCIAL', diasDefault: 5, modalidadDefault: 'HABILES' },
  { nombre: 'Apelación de auto interlocutorio civil', fuero: 'CIVIL_COMERCIAL', diasDefault: 3, modalidadDefault: 'HABILES' },
  { nombre: 'Apelación laboral', fuero: 'LABORAL', diasDefault: 3, modalidadDefault: 'HABILES' },
  { nombre: 'Alegato civil', fuero: 'CIVIL_COMERCIAL', diasDefault: 6, modalidadDefault: 'HABILES' },
  { nombre: 'Alegato laboral', fuero: 'LABORAL', diasDefault: 6, modalidadDefault: 'HABILES' },
];

async function main() {
  let creados = 0;
  let saltados = 0;

  for (const tipo of TIPOS_PLAZO_INICIALES) {
    // Idempotencia: busca por la misma combinación que protege
    // @@unique([nombre, fuero]) en el schema, antes de intentar crear.
    const yaExiste = await prisma.tipoPlazo.findFirst({
      where: { nombre: tipo.nombre, fuero: tipo.fuero },
    });

    if (yaExiste) {
      console.log(`- Ya existe, se salta: "${tipo.nombre}" (${tipo.fuero})`);
      saltados++;
      continue;
    }

    await prisma.tipoPlazo.create({ data: tipo });
    console.log(`+ Creado: "${tipo.nombre}" (${tipo.fuero}, ${tipo.diasDefault} días)`);
    creados++;
  }

  console.log(`\nSeed de TipoPlazo terminado: ${creados} creados, ${saltados} ya existían.`);
}

main()
  .catch((error) => {
    console.error('Error corriendo el seed de TipoPlazo:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });