// ============================================================
// PRUEBAS DE calculoCobros.js
// Se ejecutan con:  node --test src/utils/calculoCobros.test.js
// (o todas juntas con:  npm test)
// Mismo patrón que calculoHonorarios.test.js: runner nativo de Node
// (node:test + assert), funciones puras, sin Prisma ni base de datos.
// ============================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validarLineas,
  validarMetodoPago,
  sumarPorTipo,
  calcularSaldosPorTipo,
  validarContraSaldos,
  repartirEstados,
} = require('./calculoCobros');
const { calcularSaldo } = require('./cuentaCorriente');
const { ErrorNegocio } = require('./errores');

// ---------- validarLineas ----------
test('líneas: acepta una por tipo y devuelve montos como número', () => {
  const r = validarLineas([
    { tipo: 'HONORARIOS', monto: '500000' },
    { tipo: 'GASTOS', monto: 120000 },
    { tipo: 'ANTICIPO', monto: 1 },
  ]);
  assert.deepEqual(r, [
    { tipo: 'HONORARIOS', monto: 500000 },
    { tipo: 'GASTOS', monto: 120000 },
    { tipo: 'ANTICIPO', monto: 1 },
  ]);
});

test('líneas: sin líneas o que no sea lista se rechaza', () => {
  assert.throws(() => validarLineas([]), ErrorNegocio);
  assert.throws(() => validarLineas(undefined), /al menos una línea/);
  assert.throws(() => validarLineas('HONORARIOS'), ErrorNegocio);
});

test('líneas: tipo inválido o repetido se rechaza (RN-31: una por tipo)', () => {
  assert.throws(() => validarLineas([{ tipo: 'OTRO', monto: 1000 }]), /Tipo de línea inválido/);
  assert.throws(
    () => validarLineas([{ tipo: 'HONORARIOS', monto: 1000 }, { tipo: 'HONORARIOS', monto: 2000 }]),
    /no puede repetir/
  );
  assert.throws(() => validarLineas([null]), ErrorNegocio);
});

test('líneas: monto cero, negativo, vacío, booleano o array se rechaza', () => {
  for (const monto of [0, -5, '', null, undefined, true, [5], 'abc', NaN]) {
    assert.throws(() => validarLineas([{ tipo: 'HONORARIOS', monto }]), ErrorNegocio, `monto ${String(monto)}`);
  }
});

test('líneas: guaraníes enteros y con tope de 13 dígitos', () => {
  assert.throws(() => validarLineas([{ tipo: 'GASTOS', monto: 1000.5 }]), /enteros, sin decimales/);
  assert.throws(() => validarLineas([{ tipo: 'GASTOS', monto: 10000000000000 }]), /máximo permitido/);
  assert.equal(validarLineas([{ tipo: 'GASTOS', monto: 9999999999999 }])[0].monto, 9999999999999);
});

// ---------- validarMetodoPago ----------
test('método de pago: acepta los del enum y rechaza otros', () => {
  assert.equal(validarMetodoPago('TRANSFERENCIA'), 'TRANSFERENCIA');
  assert.throws(() => validarMetodoPago('BITCOIN'), /Método de pago inválido/);
  assert.throws(() => validarMetodoPago(undefined), ErrorNegocio);
});

// ---------- sumarPorTipo ----------
test('sumarPorTipo: separa por tipo, acepta Decimal/strings y suma el total', () => {
  const comoDecimal = { valueOf: () => '250000' }; // simula el Decimal de Prisma
  const r = sumarPorTipo([
    { tipo: 'HONORARIOS', monto: 500000 },
    { tipo: 'HONORARIOS', monto: '100000.00' },
    { tipo: 'GASTOS', monto: comoDecimal },
    { tipo: 'ANTICIPO', monto: 50000 },
  ]);
  assert.deepEqual(r, { honorarios: 600000, gastos: 250000, anticipos: 50000, total: 900000 });
});

test('sumarPorTipo: sin líneas todo da cero', () => {
  assert.deepEqual(sumarPorTipo(), { honorarios: 0, gastos: 0, anticipos: 0, total: 0 });
});

// ---------- calcularSaldosPorTipo ----------
test('saldos por tipo: lo liquidado menos lo cobrado de ese tipo', () => {
  const r = calcularSaldosPorTipo({
    honorariosTotal: 1100000, gastosTotal: 250000, cobradoHonorarios: 400000, cobradoGastos: 250000,
  });
  assert.deepEqual(r, { honorarios: 700000, gastos: 0 });
});

test('saldos por tipo: nunca da negativo y sin datos da cero', () => {
  assert.deepEqual(calcularSaldosPorTipo({ honorariosTotal: 100, cobradoHonorarios: 500 }), { honorarios: 0, gastos: 0 });
  assert.deepEqual(calcularSaldosPorTipo({}), { honorarios: 0, gastos: 0 });
});

// ---------- validarContraSaldos (RN-33) ----------
test('RN-33: cobrar exactamente el saldo está permitido', () => {
  const saldos = { honorarios: 700000, gastos: 100000 };
  assert.doesNotThrow(() =>
    validarContraSaldos([{ tipo: 'HONORARIOS', monto: 700000 }, { tipo: 'GASTOS', monto: 100000 }], saldos)
  );
});

test('RN-33: superar el saldo de honorarios o de gastos se rechaza con el saldo en el mensaje', () => {
  const saldos = { honorarios: 700000, gastos: 100000 };
  assert.throws(
    () => validarContraSaldos([{ tipo: 'HONORARIOS', monto: 700001 }], saldos),
    (e) => e instanceof ErrorNegocio && /honorarios/.test(e.message) && /700\.000/.test(e.message)
  );
  assert.throws(() => validarContraSaldos([{ tipo: 'GASTOS', monto: 100001 }], saldos), /devolución de gastos/);
});

test('RN-33: sin saldo pendiente de un tipo, el mensaje lo dice claro', () => {
  assert.throws(
    () => validarContraSaldos([{ tipo: 'GASTOS', monto: 1000 }], { honorarios: 5000, gastos: 0 }),
    /No hay saldo pendiente de devolución de gastos/
  );
});

test('RN-32: el anticipo no tiene tope, aunque no haya nada liquidado', () => {
  assert.doesNotThrow(() => validarContraSaldos([{ tipo: 'ANTICIPO', monto: 5000000 }], { honorarios: 0, gastos: 0 }));
});

// ---------- repartirEstados (FIFO) ----------
const ITEMS = [
  { id: 1, monto: 1000000 },
  { id: 2, monto: 500000 },
  { id: 3, monto: 300000 },
];

test('FIFO: sin cobros todo queda PENDIENTE', () => {
  assert.deepEqual(repartirEstados(ITEMS, 0).map((x) => x.estado), ['PENDIENTE', 'PENDIENTE', 'PENDIENTE']);
});

test('FIFO: un cobro parcial llena primero la más antigua', () => {
  assert.deepEqual(repartirEstados(ITEMS, 400000), [
    { id: 1, estado: 'COBRADO_PARCIALMENTE' },
    { id: 2, estado: 'PENDIENTE' },
    { id: 3, estado: 'PENDIENTE' },
  ]);
});

test('FIFO: cobra la primera completa y parte de la segunda', () => {
  assert.deepEqual(repartirEstados(ITEMS, 1200000), [
    { id: 1, estado: 'COBRADO' },
    { id: 2, estado: 'COBRADO_PARCIALMENTE' },
    { id: 3, estado: 'PENDIENTE' },
  ]);
});

test('FIFO: justo en el límite de un ítem, ese queda COBRADO y el siguiente PENDIENTE', () => {
  assert.deepEqual(repartirEstados(ITEMS, 1000000).map((x) => x.estado), ['COBRADO', 'PENDIENTE', 'PENDIENTE']);
});

test('FIFO: cobrado total deja todo en COBRADO', () => {
  assert.deepEqual(repartirEstados(ITEMS, 1800000).map((x) => x.estado), ['COBRADO', 'COBRADO', 'COBRADO']);
});

test('FIFO: acepta Decimal/strings y una lista vacía no falla', () => {
  assert.deepEqual(repartirEstados([{ id: 7, monto: '100000.00' }], '100000'), [{ id: 7, estado: 'COBRADO' }]);
  assert.deepEqual(repartirEstados([], 500000), []);
});

test('anular un recibo = volver a repartir con menos cobrado', () => {
  // Estaba cobrado 1.200.000 y se anula un recibo de 700.000 -> queda 500.000
  assert.deepEqual(repartirEstados(ITEMS, 500000).map((x) => x.estado), ['COBRADO_PARCIALMENTE', 'PENDIENTE', 'PENDIENTE']);
});

// ---------- Integración con cuentaCorriente.calcularSaldo (RN-29 / RN-32) ----------
test('el anticipo resta del saldo total y puede dejar saldo a favor (negativo)', () => {
  const cobrado = sumarPorTipo([{ tipo: 'ANTICIPO', monto: 800000 }]).total;
  const r = calcularSaldo({ honorariosTotal: 500000, gastosTotal: 0, cobrado });
  assert.equal(r.saldo, -300000); // saldo a favor del cliente
});

test('honorarios + gastos + anticipo cobrados se descuentan todos del saldo (RN-29)', () => {
  const cobrado = sumarPorTipo([
    { tipo: 'HONORARIOS', monto: 400000 },
    { tipo: 'GASTOS', monto: 100000 },
    { tipo: 'ANTICIPO', monto: 50000 },
  ]).total;
  const r = calcularSaldo({ honorariosTotal: 1100000, gastosTotal: 250000, cobrado });
  assert.deepEqual(r, { totalACobrar: 1350000, cobrado: 550000, saldo: 800000 });
});