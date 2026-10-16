// ============================================================
// PRUEBAS DE calculoHonorarios.js
// Se ejecutan con:  node --test src/utils/calculoHonorarios.test.js
// (o todas juntas con:  npm test)
// Mismo patrón que calendarioPlazos.test.js: runner nativo de Node
// (node:test + assert), funciones puras, sin Prisma ni base de datos.
// ============================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const { calcularLiquidacion } = require('./calculoHonorarios');
const { ErrorNegocio } = require('./errores');

// ---------- PORCENTAJE ----------
test('porcentaje: 10.000.000 x 10% = 1.000.000 neto, IVA 10% se suma encima', () => {
  // Ejemplo exacto que se le consultó a la abogada (IVA se SUMA)
  const r = calcularLiquidacion({ metodo: 'PORCENTAJE', montoBase: 10000000, porcentaje: 10, tasaIva: 'IVA_10' });
  assert.deepEqual(r, { montoNeto: 1000000, montoIva: 100000, montoTotal: 1100000 });
});

test('porcentaje con decimales: 12,5% de 10.500.000', () => {
  const r = calcularLiquidacion({ metodo: 'PORCENTAJE', montoBase: 10500000, porcentaje: 12.5, tasaIva: 'IVA_5' });
  assert.deepEqual(r, { montoNeto: 1312500, montoIva: 65625, montoTotal: 1378125 });
});

test('porcentaje: redondea al guaraní entero y neto + IVA = total', () => {
  // 1.234.567 x 3% = 37.037,01 -> 37.037 ; IVA 10% = 3.703,7 -> 3.704
  const r = calcularLiquidacion({ metodo: 'PORCENTAJE', montoBase: 1234567, porcentaje: 3, tasaIva: 'IVA_10' });
  assert.equal(r.montoNeto, 37037);
  assert.equal(r.montoIva, 3704);
  assert.equal(r.montoTotal, r.montoNeto + r.montoIva);
});

test('porcentaje: acepta strings (como llegan del formulario) y objetos tipo Decimal', () => {
  const comoDecimal = { valueOf: () => '10000000' }; // simula el Decimal de Prisma
  const r = calcularLiquidacion({ metodo: 'PORCENTAJE', montoBase: comoDecimal, porcentaje: '10', tasaIva: 'EXENTA' });
  assert.deepEqual(r, { montoNeto: 1000000, montoIva: 0, montoTotal: 1000000 });
});

test('porcentaje: más de 100 o más de 2 decimales se rechaza', () => {
  assert.throws(
    () => calcularLiquidacion({ metodo: 'PORCENTAJE', montoBase: 1000, porcentaje: 101, tasaIva: 'EXENTA' }),
    ErrorNegocio
  );
  assert.throws(
    () => calcularLiquidacion({ metodo: 'PORCENTAJE', montoBase: 1000, porcentaje: 10.123, tasaIva: 'EXENTA' }),
    /2 decimales/
  );
});

// ---------- JORNALES ----------
test('jornales: 20 jornales x 115.000 con IVA 10%', () => {
  const r = calcularLiquidacion({ metodo: 'JORNALES', cantidadJornales: 20, valorJornal: 115000, tasaIva: 'IVA_10' });
  assert.deepEqual(r, { montoNeto: 2300000, montoIva: 230000, montoTotal: 2530000 });
});

test('jornales con decimales: 2,5 jornales x 115.000', () => {
  const r = calcularLiquidacion({ metodo: 'JORNALES', cantidadJornales: 2.5, valorJornal: 115000, tasaIva: 'EXENTA' });
  assert.equal(r.montoNeto, 287500);
});

// ---------- MONTO FIJO ----------
test('monto fijo: el neto es el monto ingresado; IVA 5%', () => {
  const r = calcularLiquidacion({ metodo: 'MONTO_FIJO', montoFijo: 2000000, tasaIva: 'IVA_5' });
  assert.deepEqual(r, { montoNeto: 2000000, montoIva: 100000, montoTotal: 2100000 });
});

test('monto fijo exento: IVA = 0 y total = neto', () => {
  const r = calcularLiquidacion({ metodo: 'MONTO_FIJO', montoFijo: 500000, tasaIva: 'EXENTA' });
  assert.deepEqual(r, { montoNeto: 500000, montoIva: 0, montoTotal: 500000 });
});

// ---------- VALIDACIONES ----------
test('faltan datos del método elegido -> ErrorNegocio 400', () => {
  assert.throws(
    () => calcularLiquidacion({ metodo: 'JORNALES', cantidadJornales: 10, tasaIva: 'EXENTA' }),
    (e) => e instanceof ErrorNegocio && e.status === 400 && /valor del jornal/.test(e.message)
  );
});

test('montos en 0 o negativos se rechazan', () => {
  assert.throws(() => calcularLiquidacion({ metodo: 'MONTO_FIJO', montoFijo: 0, tasaIva: 'EXENTA' }), ErrorNegocio);
  assert.throws(() => calcularLiquidacion({ metodo: 'MONTO_FIJO', montoFijo: -5, tasaIva: 'EXENTA' }), ErrorNegocio);
});

test('método o tasa de IVA inválidos se rechazan', () => {
  assert.throws(() => calcularLiquidacion({ metodo: 'OTRO', montoFijo: 1000, tasaIva: 'EXENTA' }), /Método/);
  assert.throws(() => calcularLiquidacion({ metodo: 'MONTO_FIJO', montoFijo: 1000, tasaIva: 'IVA_21' }), /IVA/);
  assert.throws(() => calcularLiquidacion({ metodo: 'MONTO_FIJO', montoFijo: 1000 }), /IVA/);
});
// ---------- TOPES DE COLUMNA Y TIPOS (cierre 3.6) ----------
// Sin estos controles, Postgres rechazaba el INSERT (columna Decimal) y
// el usuario veía un 500 genérico en vez de un mensaje claro.
test('tope: monto base, valor del jornal y monto fijo no pueden superar los 13 dígitos', () => {
  assert.throws(
    () => calcularLiquidacion({ metodo: 'PORCENTAJE', montoBase: 1e15, porcentaje: 0.01, tasaIva: 'EXENTA' }),
    /monto base supera el máximo/
  );
  assert.throws(
    () => calcularLiquidacion({ metodo: 'JORNALES', cantidadJornales: 0.01, valorJornal: 1e14, tasaIva: 'EXENTA' }),
    /valor del jornal supera el máximo/
  );
  assert.throws(
    () => calcularLiquidacion({ metodo: 'MONTO_FIJO', montoFijo: 1e14, tasaIva: 'EXENTA' }),
    /monto a cobrar supera el máximo/
  );
});

test('tope: la cantidad de jornales no puede superar 999.999,99 (columna Decimal(8,2))', () => {
  assert.throws(
    () => calcularLiquidacion({ metodo: 'JORNALES', cantidadJornales: 1000000, valorJornal: 1, tasaIva: 'EXENTA' }),
    /jornales supera el máximo/
  );
});

test('guaraníes enteros: monto base, valor del jornal y monto fijo no admiten decimales', () => {
  assert.throws(
    () => calcularLiquidacion({ metodo: 'MONTO_FIJO', montoFijo: 1500.5, tasaIva: 'EXENTA' }),
    /enteros, sin decimales/
  );
  assert.throws(
    () => calcularLiquidacion({ metodo: 'PORCENTAJE', montoBase: 1000.55, porcentaje: 10, tasaIva: 'EXENTA' }),
    /enteros, sin decimales/
  );
  assert.throws(
    () => calcularLiquidacion({ metodo: 'JORNALES', cantidadJornales: 2, valorJornal: 100.5, tasaIva: 'EXENTA' }),
    /enteros, sin decimales/
  );
});

test('tipos: un booleano o un array no son un monto válido', () => {
  assert.throws(() => calcularLiquidacion({ metodo: 'MONTO_FIJO', montoFijo: true, tasaIva: 'EXENTA' }), ErrorNegocio);
  assert.throws(() => calcularLiquidacion({ metodo: 'MONTO_FIJO', montoFijo: [5], tasaIva: 'EXENTA' }), ErrorNegocio);
});

test('en el límite: 13 dígitos exactos es válido', () => {
  const r = calcularLiquidacion({ metodo: 'MONTO_FIJO', montoFijo: 9999999999999, tasaIva: 'EXENTA' });
  assert.equal(r.montoTotal, 9999999999999);
});