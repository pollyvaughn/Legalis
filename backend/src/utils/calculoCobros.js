// ============================================================
// CÁLCULO DE COBROS (Módulo 4 — RF10 / CU-26)
// Funciones puras: no tocan Prisma ni la base de datos. Reciben datos
// ya leídos y devuelven validaciones, saldos y estados. Mismo patrón
// que calculoHonorarios.js y cuentaCorriente.js.
//
// REGLAS (carpeta):
//  - RN-31: un recibo tiene hasta 3 líneas, una por tipo:
//           HONORARIOS, GASTOS (devolución de gastos) o ANTICIPO.
//  - RN-32: el ANTICIPO no pertenece a ninguna liquidación: solo
//           RESTA del saldo total (si sobra, queda saldo a favor).
//           Decisión de Yael 16/10/2026: por ahora no se "aplica"
//           a honorarios ni a gastos.
//  - RN-33: el monto de una línea de HONORARIOS o de GASTOS no puede
//           superar el saldo pendiente de ese tipo.
//
// MONEDA: guaraníes enteros, igual que honorarios y gastos.
// ============================================================
const { ErrorNegocio } = require('./errores');
const { formatearGs } = require('./formatoHonorarios');

// ------------------------------------------------------------
// Valores válidos. Deben coincidir con los enums de schema.prisma
// (TipoLineaCobro y MetodoPago).
// ------------------------------------------------------------
const TIPOS_LINEA = ['HONORARIOS', 'GASTOS', 'ANTICIPO'];
const METODOS_PAGO = ['EFECTIVO', 'TRANSFERENCIA', 'CHEQUE', 'OTRO'];

// Nombre legible de cada tipo, para los mensajes de error
const NOMBRE_TIPO = {
  HONORARIOS: 'honorarios',
  GASTOS: 'devolución de gastos',
  ANTICIPO: 'anticipo',
};

// Tope de columna: Decimal(15,2) -> 13 dígitos enteros (igual que honorarios).
// Se controla acá para responder un 400 claro y no un 500 de Postgres.
const MONTO_MAXIMO = 9999999999999;

// ------------------------------------------------------------
// validarLineas
// Revisa las líneas que llegan del formulario y las devuelve limpias:
//   [{ tipo: 'HONORARIOS', monto: 500000 }, ...]
// Reglas: al menos una línea, tipo válido, un solo renglón por tipo
// y monto entero > 0 con tope. Number(true) da 1 y Number([5]) da 5,
// por eso se rechazan booleanos y arrays a propósito.
// ------------------------------------------------------------
function validarLineas(lineas) {
  if (!Array.isArray(lineas) || lineas.length === 0) {
    throw new ErrorNegocio('El recibo debe tener al menos una línea de cobro');
  }

  const vistos = new Set();
  return lineas.map((linea) => {
    if (!linea || typeof linea !== 'object') {
      throw new ErrorNegocio('Cada línea del recibo debe indicar tipo y monto');
    }
    const { tipo, monto } = linea;

    if (!TIPOS_LINEA.includes(tipo)) {
      throw new ErrorNegocio(`Tipo de línea inválido. Valores válidos: ${TIPOS_LINEA.join(', ')}`);
    }
    if (vistos.has(tipo)) {
      throw new ErrorNegocio(`El recibo no puede repetir la línea de ${NOMBRE_TIPO[tipo]}`);
    }
    vistos.add(tipo);

    const n = Number(monto);
    if (
      monto === null || monto === undefined || monto === '' ||
      typeof monto === 'boolean' || Array.isArray(monto) ||
      !Number.isFinite(n) || n <= 0
    ) {
      throw new ErrorNegocio(`El monto de ${NOMBRE_TIPO[tipo]} debe ser un número mayor a 0`);
    }
    if (!Number.isInteger(n)) {
      throw new ErrorNegocio(`El monto de ${NOMBRE_TIPO[tipo]} se expresa en guaraníes enteros, sin decimales`);
    }
    if (n > MONTO_MAXIMO) {
      throw new ErrorNegocio(`El monto de ${NOMBRE_TIPO[tipo]} supera el máximo permitido`);
    }

    return { tipo, monto: n };
  });
}

// ------------------------------------------------------------
// validarMetodoPago: devuelve el método si es válido, o lanza 400.
// ------------------------------------------------------------
function validarMetodoPago(metodoPago) {
  if (!METODOS_PAGO.includes(metodoPago)) {
    throw new ErrorNegocio(`Método de pago inválido. Valores válidos: ${METODOS_PAGO.join(', ')}`);
  }
  return metodoPago;
}

// ------------------------------------------------------------
// sumarPorTipo
// Suma las líneas de recibos EMITIDOS (los anulados no entran: el
// service los filtra antes). Acepta montos como número, string o
// Decimal de Prisma (Number() los convierte).
// Devuelve lo cobrado por tipo y el total (que va a la cuenta corriente).
// ------------------------------------------------------------
function sumarPorTipo(lineas = []) {
  const r = { honorarios: 0, gastos: 0, anticipos: 0 };
  for (const { tipo, monto } of lineas) {
    if (tipo === 'HONORARIOS') r.honorarios += Number(monto);
    else if (tipo === 'GASTOS') r.gastos += Number(monto);
    else if (tipo === 'ANTICIPO') r.anticipos += Number(monto);
  }
  return { ...r, total: r.honorarios + r.gastos + r.anticipos };
}

// ------------------------------------------------------------
// calcularSaldosPorTipo
// Saldo pendiente de cada tipo = lo liquidado − lo cobrado de ese tipo.
// Es el tope que usa RN-33. Nunca da negativo (mínimo 0).
// El anticipo NO entra acá: no es de honorarios ni de gastos.
// ------------------------------------------------------------
function calcularSaldosPorTipo({ honorariosTotal = 0, gastosTotal = 0, cobradoHonorarios = 0, cobradoGastos = 0 }) {
  return {
    honorarios: Math.max(0, honorariosTotal - cobradoHonorarios),
    gastos: Math.max(0, gastosTotal - cobradoGastos),
  };
}

// ------------------------------------------------------------
// validarContraSaldos (RN-33)
// Cada línea de HONORARIOS o GASTOS no puede superar el saldo pendiente
// de ese tipo. El ANTICIPO no tiene tope: es plata a cuenta.
// `saldos` es el resultado de calcularSaldosPorTipo.
// ------------------------------------------------------------
function validarContraSaldos(lineas, saldos) {
  for (const { tipo, monto } of lineas) {
    if (tipo === 'ANTICIPO') continue;
    const saldo = tipo === 'HONORARIOS' ? saldos.honorarios : saldos.gastos;
    if (monto > saldo) {
      throw new ErrorNegocio(
        saldo === 0
          ? `No hay saldo pendiente de ${NOMBRE_TIPO[tipo]} para cobrar`
          : `El monto de ${NOMBRE_TIPO[tipo]} (${formatearGs(monto)}) supera el saldo pendiente (${formatearGs(saldo)})`
      );
    }
  }
}

// ------------------------------------------------------------
// repartirEstados
// Decide el estado de cada liquidación (o gasto) a partir de CUÁNTO
// se cobró en total de ese tipo. Reparte de la más antigua a la más
// nueva (FIFO): se llena la primera, después la segunda, etc.
//
//   items       -> [{ id, monto }] ya ORDENADOS de la más antigua a la
//                  más nueva (ordena el service por fecha de creación).
//                  Para liquidaciones, monto = montoTotal (neto + IVA);
//                  para gastos, solo los NO anulados.
//   cobradoTipo -> total cobrado de ese tipo (suma de recibos EMITIDOS)
//
// Devuelve [{ id, estado }] con PENDIENTE / COBRADO_PARCIALMENTE / COBRADO.
// Se vuelve a calcular completo en cada cobro y en cada anulación, así
// el estado nunca queda desfasado y no hace falta una tabla de imputaciones.
//
// Por qué es seguro con las reglas del Módulo 3: una liquidación solo se
// edita o elimina si está PENDIENTE, y con FIFO una liquidación PENDIENTE
// implica que no se cobró nada de las anteriores; el reparto no se rompe.
// ------------------------------------------------------------
function repartirEstados(items, cobradoTipo) {
  let restante = Number(cobradoTipo) || 0;

  return items.map(({ id, monto }) => {
    const m = Number(monto);
    if (restante <= 0) return { id, estado: 'PENDIENTE' };
    if (restante >= m) {
      restante -= m;
      return { id, estado: 'COBRADO' };
    }
    restante = 0; // lo que sobraba cubre solo una parte de este ítem
    return { id, estado: 'COBRADO_PARCIALMENTE' };
  });
}

module.exports = {
  TIPOS_LINEA,
  METODOS_PAGO,
  MONTO_MAXIMO,
  validarLineas,
  validarMetodoPago,
  sumarPorTipo,
  calcularSaldosPorTipo,
  validarContraSaldos,
  repartirEstados,
};