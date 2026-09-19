// ============================================================
// CALENDARIO RUC — Módulo 1.3
// Calcula los vencimientos de obligaciones periódicas según la
// terminación del RUC del cliente (Calendario Perpetuo de la DNIT).
//
// Son funciones PURAS (sin BD): reciben datos y devuelven fechas.
// TODAS las fechas son Date en UTC a medianoche, porque en la BD se
// guardan como @db.Date (solo día). Así se evita el clásico bug de
// "se corrió un día por la zona horaria".
//
// Reglas (confirmadas con la abogada):
//  - El día del mes sale de la terminación del RUC (tabla de abajo).
//  - Si cae sábado o domingo, pasa al lunes siguiente.
//  - Los feriados NO se corrigen acá: se ajustan a mano.
// ============================================================
const { ErrorNegocio } = require('./errores');

// ------------------------------------------------------------
// TABLA: terminación del RUC -> día del mes en que vence
// (el día mayor es 25, +2 por fin de semana = 27: nunca cambia de mes)
// ------------------------------------------------------------
const DIA_POR_TERMINACION = Object.freeze({
  0: 7, 1: 9, 2: 11, 3: 13, 4: 15, 5: 17, 6: 19, 7: 21, 8: 23, 9: 25,
});

// ------------------------------------------------------------
// terminacionRuc("80012345-6") -> 5
// Toma el último dígito ANTES del guion (el que va después del
// guion es el dígito verificador y no cuenta).
// Tolera puntos y espacios ("80.012.345-6").
// ------------------------------------------------------------
function terminacionRuc(ruc) {
  if (typeof ruc !== 'string' || ruc.trim() === '') {
    throw new ErrorNegocio('El cliente no tiene RUC cargado; no se pueden calcular vencimientos', 400);
  }
  const limpio = ruc.replace(/[.\s]/g, '');
  // Formato esperado: uno o más dígitos, guion y UN dígito verificador
  const coincidencia = limpio.match(/^(\d+)-(\d)$/);
  if (!coincidencia) {
    throw new ErrorNegocio(`El RUC "${ruc}" no tiene el formato esperado (ej: 80012345-6)`, 400);
  }
  return Number(coincidencia[1].slice(-1));
}

// ------------------------------------------------------------
// ajustarFinDeSemana(fecha)
// Sábado -> lunes (+2 días). Domingo -> lunes (+1 día).
// Devuelve una COPIA: no modifica la fecha recibida.
// ------------------------------------------------------------
function ajustarFinDeSemana(fecha) {
  const resultado = new Date(fecha.getTime());
  const diaSemana = resultado.getUTCDay(); // 0 = domingo ... 6 = sábado
  if (diaSemana === 6) resultado.setUTCDate(resultado.getUTCDate() + 2);
  else if (diaSemana === 0) resultado.setUTCDate(resultado.getUTCDate() + 1);
  return resultado;
}

// ------------------------------------------------------------
// calcularVencimiento(ruc, anio, mes)
// mes = 1 a 12 (el mes en que VENCE). Devuelve un Date UTC.
// Ej: RUC terminado en 5, sept-2026 -> día 17 (jueves) -> 2026-09-17
// ------------------------------------------------------------
function calcularVencimiento(ruc, anio, mes) {
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
    throw new ErrorNegocio('Año inválido', 400);
  }
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    throw new ErrorNegocio('Mes inválido (debe ser de 1 a 12)', 400);
  }
  const dia = DIA_POR_TERMINACION[terminacionRuc(ruc)];
  // Date.UTC recibe el mes en base 0 (enero = 0), por eso mes - 1
  return ajustarFinDeSemana(new Date(Date.UTC(anio, mes - 1, dia)));
}

// ------------------------------------------------------------
// calcularVencimientosDelAnio({ ruc, periodicidad, mesAnual, anio, desde })
// Devuelve [{ periodo: "AAAA-MM", fechaVencimiento: Date }, ...]
//  - MENSUAL: los 12 meses del año.
//  - ANUAL: solo el mes indicado en mesAnual.
//  - desde (opcional, Date UTC): descarta los vencimientos anteriores
//    a esa fecha. Se usa para no crear vencimientos que ya pasaron.
// "periodo" es el mes del VENCIMIENTO (no el período fiscal).
// ------------------------------------------------------------
function calcularVencimientosDelAnio({ ruc, periodicidad, mesAnual, anio, desde }) {
  let meses;
  if (periodicidad === 'MENSUAL') {
    meses = Array.from({ length: 12 }, (_, i) => i + 1); // [1, 2, ..., 12]
  } else if (periodicidad === 'ANUAL') {
    if (!Number.isInteger(mesAnual) || mesAnual < 1 || mesAnual > 12) {
      throw new ErrorNegocio('Para una obligación anual hay que indicar el mes (1 a 12)', 400);
    }
    meses = [mesAnual];
  } else {
    throw new ErrorNegocio('Periodicidad inválida (debe ser MENSUAL o ANUAL)', 400);
  }

  return meses
    .map((mes) => ({
      periodo: `${anio}-${String(mes).padStart(2, '0')}`,
      fechaVencimiento: calcularVencimiento(ruc, anio, mes),
    }))
    .filter((v) => !desde || v.fechaVencimiento >= desde);
}

// ------------------------------------------------------------
// fechaDeHoy()
// El día de hoy como Date UTC a medianoche, tomando la fecha LOCAL
// del servidor (la PC del estudio, en hora de Paraguay).
// Se usa como "desde" al generar vencimientos.
// ------------------------------------------------------------
function fechaDeHoy() {
  const ahora = new Date();
  return new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()));
}

module.exports = {
  DIA_POR_TERMINACION,
  terminacionRuc,
  calcularVencimiento,
  calcularVencimientosDelAnio,
  fechaDeHoy,
};