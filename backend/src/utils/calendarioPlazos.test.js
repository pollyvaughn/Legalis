// ============================================================
// PRUEBAS DE calendarioPlazos.js
// Se ejecutan con:  node --test src/utils/calendarioPlazos.test.js
// (o todas juntas con:  npm test)
// Mismo patrón que calendarioRuc.test.js: runner nativo de Node
// (node:test + assert), funciones puras, sin Prisma ni base de datos.
//
// Las fechas sin hora se arman en UTC (medianoche), igual que llegan
// de la base y del formulario. Así las pruebas dan lo mismo sin
// importar la zona horaria de la máquina (probado con TZ=UTC y con
// TZ=America/Asuncion).
// ============================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calcularFechaVencimiento,
  calcularLimiteConGracia,
  calcularSemaforo,
  calcularSemaforoHoras,
  esFinDeSemana,
  esDiaNoHabil,
} = require('./calendarioPlazos');

// Helper: arma un Date UTC a medianoche de un día concreto (mes en base 1)
const dia = (anio, mes, d) => new Date(Date.UTC(anio, mes - 1, d));

// Helper: Date -> "AAAA-MM-DD" (en UTC), para comparar fácil
const iso = (fecha) => fecha.toISOString().slice(0, 10);

// ---------- esFinDeSemana ----------
test('esFinDeSemana: sábado y domingo sí', () => {
  assert.equal(esFinDeSemana(dia(2026, 9, 26)), true); // sábado
  assert.equal(esFinDeSemana(dia(2026, 9, 27)), true); // domingo
});

test('esFinDeSemana: miércoles no', () => {
  assert.equal(esFinDeSemana(dia(2026, 9, 23)), false);
});

// ---------- esDiaNoHabil ----------
const feriados = [
  { fechaDesde: dia(2026, 12, 25), fechaHasta: null }, // Navidad, un solo día
  { fechaDesde: dia(2027, 1, 1), fechaHasta: dia(2027, 1, 31) }, // feria judicial de enero
];

test('esDiaNoHabil detecta un feriado de un solo día', () => {
  assert.equal(esDiaNoHabil(dia(2026, 12, 25), feriados), true);
});

test('esDiaNoHabil detecta un día dentro de un rango (feria judicial)', () => {
  assert.equal(esDiaNoHabil(dia(2027, 1, 15), feriados), true);
});

test('esDiaNoHabil: un día fuera de todos los rangos no es no-hábil', () => {
  assert.equal(esDiaNoHabil(dia(2026, 12, 26), feriados), false);
});

test('esDiaNoHabil: los extremos del rango cuentan (inclusive)', () => {
  assert.equal(esDiaNoHabil(dia(2027, 1, 1), feriados), true);
  assert.equal(esDiaNoHabil(dia(2027, 1, 31), feriados), true);
});

// ---------- calcularFechaVencimiento: CORRIDOS ----------
test('CORRIDOS cuenta todos los días calendario sin saltar nada', () => {
  // Notificado lunes 21/09/2026 + 6 corridos = domingo 27/09/2026
  const resultado = calcularFechaVencimiento({
    fechaNotificacion: dia(2026, 9, 21),
    diasCantidad: 6,
    modalidad: 'CORRIDOS',
  });
  assert.equal(iso(resultado), '2026-09-27');
});

test('CORRIDOS cruza fin de mes sin problema', () => {
  // Notificado 28/09/2026 + 5 corridos = 03/10/2026
  const resultado = calcularFechaVencimiento({
    fechaNotificacion: dia(2026, 9, 28),
    diasCantidad: 5,
    modalidad: 'CORRIDOS',
  });
  assert.equal(iso(resultado), '2026-10-03');
});

// ---------- calcularFechaVencimiento: HABILES ----------
test('HABILES: caso simple sin fines de semana ni feriados de por medio', () => {
  // Notificado martes 22/09/2026 + 3 hábiles: mié 23, jue 24, vie 25
  const resultado = calcularFechaVencimiento({
    fechaNotificacion: dia(2026, 9, 22),
    diasCantidad: 3,
    modalidad: 'HABILES',
  });
  assert.equal(iso(resultado), '2026-09-25');
});

test('HABILES salta el fin de semana', () => {
  // Notificado viernes 25/09 + 2 hábiles: lun 28 (1), mar 29 (2)
  const resultado = calcularFechaVencimiento({
    fechaNotificacion: dia(2026, 9, 25),
    diasCantidad: 2,
    modalidad: 'HABILES',
  });
  assert.equal(iso(resultado), '2026-09-29');
});

// Casos que fallaban con getDay()/setDate() locales en hora de Paraguay:
// el vencimiento caía en sábado porque se contaba como día hábil.
test('HABILES nunca cae en sábado: viernes + 1 hábil = lunes', () => {
  const resultado = calcularFechaVencimiento({
    fechaNotificacion: dia(2026, 9, 25),
    diasCantidad: 1,
    modalidad: 'HABILES',
  });
  assert.equal(iso(resultado), '2026-09-28');
});

test('HABILES: jueves + 2 hábiles = lunes (viernes y lunes)', () => {
  const resultado = calcularFechaVencimiento({
    fechaNotificacion: dia(2026, 9, 24),
    diasCantidad: 2,
    modalidad: 'HABILES',
  });
  assert.equal(iso(resultado), '2026-09-28');
});

test('HABILES: lunes + 5 hábiles = lunes siguiente', () => {
  const resultado = calcularFechaVencimiento({
    fechaNotificacion: dia(2026, 9, 28),
    diasCantidad: 5,
    modalidad: 'HABILES',
  });
  assert.equal(iso(resultado), '2026-10-05');
});

test('HABILES salta un feriado cargado en DiaNoHabil, además del fin de semana', () => {
  // Notificado miércoles 23/09 + 3 hábiles, con viernes 25/09 feriado:
  // jue 24 (1), vie 25 feriado, sáb/dom no cuentan, lun 28 (2), mar 29 (3)
  const resultado = calcularFechaVencimiento({
    fechaNotificacion: dia(2026, 9, 23),
    diasCantidad: 3,
    modalidad: 'HABILES',
    diasNoHabiles: [{ fechaDesde: dia(2026, 9, 25), fechaHasta: null }],
  });
  assert.equal(iso(resultado), '2026-09-29');
});

test('HABILES salta un rango completo (feria judicial de enero)', () => {
  // Notificado jueves 31/12/2026 + 1 hábil, con feria del 1 al 31 de enero:
  // primer día hábil = lunes 01/02/2027
  const resultado = calcularFechaVencimiento({
    fechaNotificacion: dia(2026, 12, 31),
    diasCantidad: 1,
    modalidad: 'HABILES',
    diasNoHabiles: [{ fechaDesde: dia(2027, 1, 1), fechaHasta: dia(2027, 1, 31) }],
  });
  assert.equal(iso(resultado), '2027-02-01');
});

test('HABILES 18 días (contestación civil) consume 18 días hábiles exactos', () => {
  // Notificado martes 22/09/2026, sin feriados: 18 hábiles = viernes 16/10/2026
  const resultado = calcularFechaVencimiento({
    fechaNotificacion: dia(2026, 9, 22),
    diasCantidad: 18,
    modalidad: 'HABILES',
  });
  assert.equal(iso(resultado), '2026-10-16');
  assert.equal(esFinDeSemana(resultado), false);
});

test('modalidad HORAS lanza error (no se calcula, se carga a mano)', () => {
  assert.throws(() =>
    calcularFechaVencimiento({
      fechaNotificacion: dia(2026, 9, 22),
      diasCantidad: 1,
      modalidad: 'HORAS',
    })
  );
});

test('modalidad desconocida lanza error', () => {
  assert.throws(() =>
    calcularFechaVencimiento({
      fechaNotificacion: dia(2026, 9, 22),
      diasCantidad: 1,
      modalidad: 'XYZ',
    })
  );
});

// ---------- calcularLimiteConGracia ----------
test('gracia: día hábil siguiente a las 09:00 (hora local)', () => {
  // Vencimiento viernes 25/09 → gracia lunes 28/09 09:00
  const resultado = calcularLimiteConGracia({ fechaVencimiento: dia(2026, 9, 25) });
  assert.equal(resultado.getFullYear(), 2026);
  assert.equal(resultado.getMonth(), 8); // setiembre = índice 8
  assert.equal(resultado.getDate(), 28);
  assert.equal(resultado.getHours(), 9);
  assert.equal(resultado.getMinutes(), 0);
});

test('gracia: si el día siguiente también es no-hábil, sigue avanzando', () => {
  // Vencimiento jueves 24/09, viernes 25 feriado → gracia lunes 28/09
  const resultado = calcularLimiteConGracia({
    fechaVencimiento: dia(2026, 9, 24),
    diasNoHabiles: [{ fechaDesde: dia(2026, 9, 25), fechaHasta: null }],
  });
  assert.equal(resultado.getDate(), 28);
  assert.equal(resultado.getHours(), 9);
});

// ---------- calcularSemaforo (por días) ----------
// "hoy" es el día calendario local; la fecha de vencimiento, un día UTC.
const hoy = new Date(2026, 8, 22, 15, 0, 0); // 22/09/2026, 15:00 local

test('semáforo VERDE cuando faltan más de 5 días', () => {
  assert.equal(calcularSemaforo({ fechaVencimiento: dia(2026, 9, 30), hoy }), 'VERDE');
});

test('semáforo AMARILLO cuando faltan entre 2 y 5 días', () => {
  assert.equal(calcularSemaforo({ fechaVencimiento: dia(2026, 9, 27), hoy }), 'AMARILLO'); // 5
  assert.equal(calcularSemaforo({ fechaVencimiento: dia(2026, 9, 24), hoy }), 'AMARILLO'); // 2
});

test('semáforo ROJO cuando falta 1 día o vence hoy', () => {
  assert.equal(calcularSemaforo({ fechaVencimiento: dia(2026, 9, 23), hoy }), 'ROJO');
  assert.equal(calcularSemaforo({ fechaVencimiento: dia(2026, 9, 22), hoy }), 'ROJO'); // vence hoy
});

test('semáforo VENCIDO cuando la fecha ya pasó', () => {
  assert.equal(calcularSemaforo({ fechaVencimiento: dia(2026, 9, 21), hoy }), 'VENCIDO');
});

// ---------- calcularSemaforoHoras (modalidad HORAS) ----------
const ahora = new Date('2026-10-12T12:00:00.000Z');
const enHoras = (h) => new Date(ahora.getTime() + h * 60 * 60 * 1000);

test('semáforo horas: VENCIDO apenas pasa el momento exacto', () => {
  assert.equal(calcularSemaforoHoras({ horaLimite: enHoras(-0.01), ahora }), 'VENCIDO');
  assert.equal(calcularSemaforoHoras({ horaLimite: enHoras(-30), ahora }), 'VENCIDO');
});

test('semáforo horas: ROJO si faltan 24 horas o menos (incluye el instante exacto)', () => {
  assert.equal(calcularSemaforoHoras({ horaLimite: enHoras(0), ahora }), 'ROJO');
  assert.equal(calcularSemaforoHoras({ horaLimite: enHoras(24), ahora }), 'ROJO');
});

test('semáforo horas: AMARILLO entre más de 24 y 120 horas', () => {
  assert.equal(calcularSemaforoHoras({ horaLimite: enHoras(24.5), ahora }), 'AMARILLO');
  assert.equal(calcularSemaforoHoras({ horaLimite: enHoras(120), ahora }), 'AMARILLO');
});

test('semáforo horas: VERDE si faltan más de 120 horas', () => {
  assert.equal(calcularSemaforoHoras({ horaLimite: enHoras(121), ahora }), 'VERDE');
});

test('semáforo horas acepta horaLimite como texto ISO (como llega de la API)', () => {
  assert.equal(
    calcularSemaforoHoras({ horaLimite: enHoras(3).toISOString(), ahora }),
    'ROJO'
  );
});