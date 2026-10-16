// ============================================================
// CÁLCULO DE HONORARIOS (Módulo 3 — RF7 / CU-22)
// Funciones puras: no tocan Prisma ni la base de datos. Reciben los
// datos que ingresó la abogada y devuelven neto + IVA + total.
// Mismo patrón que calendarioRuc.js y calendarioPlazos.js.
//
// REGLAS (carpeta, RN-25 / RN-28 + respuesta de la abogada 08/10/2026):
//  - RN-25: el sistema NO aplica escalas del arancel. Usa solo lo que
//    se ingresa (porcentaje, jornales, monto fijo).
//  - El IVA se SUMA ENCIMA del resultado del cálculo (no está incluido).
//  - La tasa de IVA (10%, 5% o exenta) se elige en los TRES métodos.
//
// MONEDA: guaraníes, sin decimales. Cada resultado se redondea al
// guaraní entero (Math.round) en cada paso, así neto + IVA = total
// siempre cuadra exacto y lo que se muestra es lo que se cobra.
// ============================================================
const { ErrorNegocio } = require('./errores');

// ------------------------------------------------------------
// Valores válidos. Deben coincidir con los enums de schema.prisma
// (MetodoHonorarios y TasaIva).
// ------------------------------------------------------------
const METODOS = ['PORCENTAJE', 'JORNALES', 'MONTO_FIJO'];

// Tasa de IVA en %: IVA_10 -> 10, IVA_5 -> 5, EXENTA -> 0
const TASAS_IVA = { IVA_10: 10, IVA_5: 5, EXENTA: 0 };

// ------------------------------------------------------------
// TOPES DE COLUMNA (deben coincidir con schema.prisma)
// Si un valor supera el tope de su columna, Postgres rechaza el
// INSERT y el usuario vería un 500 genérico: por eso se controla
// ACÁ, antes de guardar, y se responde un 400 claro.
//  - Decimal(15,2) -> 13 dígitos enteros (montoBase, valorJornal, montos)
//  - Decimal(8,2)  -> hasta 999.999,99 (cantidadJornales)
// ------------------------------------------------------------
const MONTO_MAXIMO = 9999999999999;
const JORNALES_MAXIMO = 999999.99;

// ------------------------------------------------------------
// Helper: convierte a número y exige que sea > 0.
// Number() también sirve con los Decimal de Prisma y con strings
// que llegan del formulario ("1500000").
// Number(true) da 1 y Number([5]) da 5: se rechazan a propósito
// (un booleano o un array no es un monto).
// ------------------------------------------------------------
function numeroPositivo(valor, nombreCampo) {
  const n = Number(valor);
  if (
    valor === null || valor === undefined || valor === '' ||
    typeof valor === 'boolean' || Array.isArray(valor) ||
    !Number.isFinite(n) || n <= 0
  ) {
    throw new ErrorNegocio(`${nombreCampo} debe ser un número mayor a 0`);
  }
  return n;
}

// ------------------------------------------------------------
// Helper: monto en guaraníes -> > 0, entero (sin decimales) y con tope.
// Lo usan monto base, valor del jornal y monto fijo (misma regla que
// los gastos: guaraníes enteros, decisión de Yael 13/10/2026).
// ------------------------------------------------------------
function montoEnGuaranies(valor, nombreCampo) {
  const n = numeroPositivo(valor, nombreCampo);
  if (!Number.isInteger(n)) {
    throw new ErrorNegocio(`${nombreCampo} se expresa en guaraníes enteros, sin decimales`);
  }
  if (n > MONTO_MAXIMO) {
    throw new ErrorNegocio(`${nombreCampo} supera el máximo permitido`);
  }
  return n;
}

// ------------------------------------------------------------
// Helper: exige que el número tenga como máximo 2 decimales
// (porcentaje es Decimal(5,2); jornales es Decimal(8,2)).
// Se trabaja en "centésimas" enteras para evitar errores de punto
// flotante (ej: 0.1 + 0.2 !== 0.3 en JavaScript).
// ------------------------------------------------------------
function aCentesimas(n, nombreCampo) {
  const centesimas = Math.round(n * 100);
  if (Math.abs(n * 100 - centesimas) > 1e-6) {
    throw new ErrorNegocio(`${nombreCampo} admite como máximo 2 decimales`);
  }
  return centesimas;
}

// ------------------------------------------------------------
// calcularNeto: aplica la fórmula del método elegido (RF7).
//  PORCENTAJE -> montoBase × (porcentaje ÷ 100)
//  JORNALES   -> cantidadJornales × valorJornal
//  MONTO_FIJO -> montoFijo (tal cual)
// ------------------------------------------------------------
function calcularNeto({ metodo, montoBase, porcentaje, cantidadJornales, valorJornal, montoFijo }) {
  if (metodo === 'PORCENTAJE') {
    const base = montoEnGuaranies(montoBase, 'El monto base');
    const pct = numeroPositivo(porcentaje, 'El porcentaje');
    if (pct > 100) throw new ErrorNegocio('El porcentaje no puede ser mayor a 100');
    // porcentaje en centésimas (12,5% -> 1250) para dividir por 10.000 exacto
    return Math.round((base * aCentesimas(pct, 'El porcentaje')) / 10000);
  }

  if (metodo === 'JORNALES') {
    const jornales = numeroPositivo(cantidadJornales, 'La cantidad de jornales');
    if (jornales > JORNALES_MAXIMO) throw new ErrorNegocio('La cantidad de jornales supera el máximo permitido');
    const valor = montoEnGuaranies(valorJornal, 'El valor del jornal');
    // jornales en centésimas (2,5 -> 250) para dividir por 100 exacto
    return Math.round((aCentesimas(jornales, 'La cantidad de jornales') * valor) / 100);
  }

  if (metodo === 'MONTO_FIJO') {
    return montoEnGuaranies(montoFijo, 'El monto a cobrar');
  }

  throw new ErrorNegocio(`Método de cálculo inválido. Valores permitidos: ${METODOS.join(', ')}`);
}

// ------------------------------------------------------------
// calcularLiquidacion: función principal.
// Entrada: método + datos de ese método + tasaIva ('IVA_10' | 'IVA_5' | 'EXENTA')
// Salida:  { montoNeto, montoIva, montoTotal } en guaraníes enteros.
// Es lo que muestra GET .../calcular antes de confirmar (RF7: "cálculo
// en pantalla antes de confirmar") y lo que guarda el POST.
// ------------------------------------------------------------
function calcularLiquidacion(datos) {
  const { tasaIva } = datos;

  if (!Object.prototype.hasOwnProperty.call(TASAS_IVA, tasaIva)) {
    throw new ErrorNegocio(`Tasa de IVA inválida. Valores permitidos: ${Object.keys(TASAS_IVA).join(', ')}`);
  }

  const montoNeto = calcularNeto(datos);
  // IVA sobre el neto (se suma encima, no está incluido)
  const montoIva = Math.round((montoNeto * TASAS_IVA[tasaIva]) / 100);
  const montoTotal = montoNeto + montoIva;

  return { montoNeto, montoIva, montoTotal };
}

module.exports = { METODOS, TASAS_IVA, MONTO_MAXIMO, calcularLiquidacion };