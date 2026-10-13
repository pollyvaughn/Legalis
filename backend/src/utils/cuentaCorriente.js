// ============================================================
// CUENTA CORRIENTE (Módulo 3 — RF8)
// Función pura: no toca Prisma ni la base de datos. Recibe los totales
// ya sumados y devuelve cuánto hay que cobrar y cuánto falta.
//
//   a cobrar = honorarios (neto + IVA) + gastos NO anulados
//   saldo    = a cobrar − cobrado
//
// "cobrado" vale 0 hasta que exista el Módulo 4 (cobros y recibos).
// Cuando exista, solo hay que pasar el monto real en este parámetro:
// la fórmula ya está lista.
// ============================================================

// Guaraníes enteros: todo se suma como números simples
function calcularSaldo({ honorariosTotal = 0, gastosTotal = 0, cobrado = 0 }) {
    const totalACobrar = honorariosTotal + gastosTotal;
    return {
      totalACobrar,
      cobrado,
      saldo: totalACobrar - cobrado,
    };
  }
  
  module.exports = { calcularSaldo };