// ============================================================
// PRUEBAS DE calendarioRuc.js
// Se ejecutan con:  node --test src/utils/calendarioRuc.test.js
// Cada test() es un caso: si el resultado no coincide, falla.
// ============================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  terminacionRuc,
  calcularVencimiento,
  calcularVencimientosDelAnio,
} = require('./calendarioRuc');
const { ErrorNegocio } = require('./errores');

// Helper: Date -> "AAAA-MM-DD" (en UTC), para comparar fácil
const iso = (fecha) => fecha.toISOString().slice(0, 10);

// Helper: arma un Date UTC de un día concreto (mes en base 1)
const dia = (anio, mes, d) => new Date(Date.UTC(anio, mes - 1, d));

// ---------- terminacionRuc ----------
test('terminacionRuc toma el último dígito ANTES del guion', () => {
  assert.equal(terminacionRuc('80012345-6'), 5); // el 6 es el verificador
  assert.equal(terminacionRuc('3456789-1'), 9);
});

test('terminacionRuc tolera puntos y espacios', () => {
  assert.equal(terminacionRuc('80.012.345-6'), 5);
  assert.equal(terminacionRuc(' 80012345-6 '), 5);
});

test('terminacionRuc rechaza RUC ausente o mal formado', () => {
  assert.throws(() => terminacionRuc(null), ErrorNegocio);
  assert.throws(() => terminacionRuc(''), ErrorNegocio);
  assert.throws(() => terminacionRuc('800123456'), ErrorNegocio); // sin guion
  assert.throws(() => terminacionRuc('ABC-1'), ErrorNegocio);
});

// ---------- calcularVencimiento ----------
test('día normal: terminación 5 en sept-2026 vence el 17 (jueves)', () => {
  assert.equal(iso(calcularVencimiento('80012345-6', 2026, 9)), '2026-09-17');
});

test('domingo pasa a lunes: terminación 3 en sept-2026 (13 -> 14)', () => {
  assert.equal(iso(calcularVencimiento('1234563-0', 2026, 9)), '2026-09-14');
});

test('sábado pasa a lunes: terminación 6 en sept-2026 (19 -> 21)', () => {
  assert.equal(iso(calcularVencimiento('1234566-0', 2026, 9)), '2026-09-21');
});

test('octubre-2026: terminaciones 0, 2, 5 y 9', () => {
  assert.equal(iso(calcularVencimiento('1234560-1', 2026, 10)), '2026-10-07'); // miércoles
  assert.equal(iso(calcularVencimiento('1234562-1', 2026, 10)), '2026-10-12'); // 11 es domingo
  assert.equal(iso(calcularVencimiento('1234565-1', 2026, 10)), '2026-10-19'); // 17 es sábado
  assert.equal(iso(calcularVencimiento('1234569-1', 2026, 10)), '2026-10-26'); // 25 es domingo
});

test('NO corrige feriados: 25/12/2026 (Navidad, viernes) queda igual', () => {
  // Los feriados se ajustan a mano (decisión de la abogada)
  assert.equal(iso(calcularVencimiento('1234569-1', 2026, 12)), '2026-12-25');
});

test('calcularVencimiento valida año y mes', () => {
  assert.throws(() => calcularVencimiento('80012345-6', 2026, 13), ErrorNegocio);
  assert.throws(() => calcularVencimiento('80012345-6', 2026, 0), ErrorNegocio);
  assert.throws(() => calcularVencimiento('80012345-6', 'abc', 5), ErrorNegocio);
});

// ---------- calcularVencimientosDelAnio ----------
test('MENSUAL sin "desde" genera los 12 meses', () => {
  const lista = calcularVencimientosDelAnio({
    ruc: '80012345-6', periodicidad: 'MENSUAL', anio: 2026,
  });
  assert.equal(lista.length, 12);
  assert.equal(lista[0].periodo, '2026-01');
  assert.equal(lista[11].periodo, '2026-12');
});

test('MENSUAL con "desde" descarta los vencimientos ya pasados', () => {
  // Hoy = sábado 19/09/2026. Terminación 5: sept vence el 17 (ya pasó).
  const lista = calcularVencimientosDelAnio({
    ruc: '80012345-6', periodicidad: 'MENSUAL', anio: 2026, desde: dia(2026, 9, 19),
  });
  assert.deepEqual(lista.map((v) => v.periodo), ['2026-10', '2026-11', '2026-12']);
});

test('MENSUAL incluye el mes actual si su vencimiento todavía no pasó', () => {
  const lista = calcularVencimientosDelAnio({
    ruc: '80012345-6', periodicidad: 'MENSUAL', anio: 2026, desde: dia(2026, 9, 15),
  });
  assert.equal(lista[0].periodo, '2026-09'); // 17/09 >= 15/09
  assert.equal(lista.length, 4);
});

test('ANUAL genera solo el mes indicado (y corre el fin de semana)', () => {
  // 17/04/2027 es sábado -> lunes 19/04/2027
  const lista = calcularVencimientosDelAnio({
    ruc: '80012345-6', periodicidad: 'ANUAL', mesAnual: 4, anio: 2027,
  });
  assert.equal(lista.length, 1);
  assert.equal(lista[0].periodo, '2027-04');
  assert.equal(iso(lista[0].fechaVencimiento), '2027-04-19');
});

test('ANUAL con el mes ya pasado devuelve lista vacía', () => {
  const lista = calcularVencimientosDelAnio({
    ruc: '80012345-6', periodicidad: 'ANUAL', mesAnual: 4, anio: 2026, desde: dia(2026, 9, 19),
  });
  assert.deepEqual(lista, []);
});

test('valida periodicidad y mesAnual', () => {
  const base = { ruc: '80012345-6', anio: 2026 };
  assert.throws(() => calcularVencimientosDelAnio({ ...base, periodicidad: 'SEMANAL' }), ErrorNegocio);
  assert.throws(() => calcularVencimientosDelAnio({ ...base, periodicidad: 'ANUAL' }), ErrorNegocio);
  assert.throws(() => calcularVencimientosDelAnio({ ...base, periodicidad: 'ANUAL', mesAnual: 13 }), ErrorNegocio);
});