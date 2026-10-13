// ============================================================
// PRUEBAS DE cuentaCorriente.js
// Se ejecutan con:  node --test src/utils/cuentaCorriente.test.js
// (o todas juntas con:  npm test)
// ============================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const { calcularSaldo } = require('./cuentaCorriente');

test('suma honorarios (con IVA) y gastos; sin cobros el saldo es todo', () => {
  const r = calcularSaldo({ honorariosTotal: 1100000, gastosTotal: 250000 });
  assert.deepEqual(r, { totalACobrar: 1350000, cobrado: 0, saldo: 1350000 });
});

test('con cobros: el saldo es lo que falta', () => {
  const r = calcularSaldo({ honorariosTotal: 1100000, gastosTotal: 250000, cobrado: 500000 });
  assert.deepEqual(r, { totalACobrar: 1350000, cobrado: 500000, saldo: 850000 });
});

test('sin movimientos todo da cero', () => {
  assert.deepEqual(calcularSaldo({}), { totalACobrar: 0, cobrado: 0, saldo: 0 });
});

test('totalmente cobrado: saldo cero', () => {
  const r = calcularSaldo({ honorariosTotal: 1000000, gastosTotal: 0, cobrado: 1000000 });
  assert.equal(r.saldo, 0);
});