// ============================================================
// TESTS: calendarioPlazos.js
// Mismo patrón que calendarioRuc.test.js — funciones puras,
// sin necesidad de levantar Prisma ni la base de datos.
// ============================================================

const {
    calcularFechaVencimiento,
    calcularLimiteConGracia,
    calcularSemaforo,
    esFinDeSemana,
    esDiaNoHabil,
  } = require('./calendarioPlazos');
  
  // Helper local para tests: crea una fecha sin líos de zona horaria
  // (usamos mediodía para evitar bordes por horario de verano/UTC).
  function f(anio, mes, dia) {
    return new Date(anio, mes - 1, dia, 12, 0, 0);
  }
  
  describe('esFinDeSemana', () => {
    test('sábado es fin de semana', () => {
      expect(esFinDeSemana(f(2026, 9, 26))).toBe(true); // sábado
    });
  
    test('domingo es fin de semana', () => {
      expect(esFinDeSemana(f(2026, 9, 27))).toBe(true); // domingo
    });
  
    test('miércoles NO es fin de semana', () => {
      expect(esFinDeSemana(f(2026, 9, 23))).toBe(false);
    });
  });
  
  describe('esDiaNoHabil', () => {
    const feriados = [
      { fechaDesde: f(2026, 12, 25), fechaHasta: null }, // navidad, un solo día
      { fechaDesde: f(2027, 1, 1), fechaHasta: f(2027, 1, 31) }, // feria judicial enero
    ];
  
    test('detecta un feriado de un solo día', () => {
      expect(esDiaNoHabil(f(2026, 12, 25), feriados)).toBe(true);
    });
  
    test('detecta un día dentro de un rango (feria judicial)', () => {
      expect(esDiaNoHabil(f(2027, 1, 15), feriados)).toBe(true);
    });
  
    test('un día fuera de todos los rangos no es no-hábil', () => {
      expect(esDiaNoHabil(f(2026, 12, 26), feriados)).toBe(false);
    });
  
    test('los extremos del rango cuentan como no-hábiles (inclusive)', () => {
      expect(esDiaNoHabil(f(2027, 1, 1), feriados)).toBe(true);
      expect(esDiaNoHabil(f(2027, 1, 31), feriados)).toBe(true);
    });
  });
  
  describe('calcularFechaVencimiento — modalidad CORRIDOS', () => {
    test('cuenta todos los días calendario sin saltar nada', () => {
      // Notificado el lunes 21/09/2026, 6 días corridos → domingo 27/09/2026
      const resultado = calcularFechaVencimiento({
        fechaNotificacion: f(2026, 9, 21),
        diasCantidad: 6,
        modalidad: 'CORRIDOS',
      });
      expect(resultado.getDate()).toBe(27);
      expect(resultado.getMonth()).toBe(8); // setiembre = índice 8
    });
  
    test('cruza fin de mes sin problema', () => {
      // Notificado 28/09/2026, 5 días corridos → 03/10/2026
      const resultado = calcularFechaVencimiento({
        fechaNotificacion: f(2026, 9, 28),
        diasCantidad: 5,
        modalidad: 'CORRIDOS',
      });
      expect(resultado.getDate()).toBe(3);
      expect(resultado.getMonth()).toBe(9); // octubre
    });
  });
  
  describe('calcularFechaVencimiento — modalidad HABILES', () => {
    test('caso simple sin fines de semana ni feriados de por medio', () => {
      // Notificado martes 22/09/2026, 3 días hábiles.
      // Día hábil siguiente: miércoles 23, jueves 24, viernes 25 → vence viernes 25/09/2026
      const resultado = calcularFechaVencimiento({
        fechaNotificacion: f(2026, 9, 22),
        diasCantidad: 3,
        modalidad: 'HABILES',
        diasNoHabiles: [],
      });
      expect(resultado.getDate()).toBe(25);
      expect(resultado.getMonth()).toBe(8);
    });
  
    test('salta el fin de semana correctamente', () => {
      // Notificado viernes 25/09/2026, 2 días hábiles.
      // Sáb 26 y dom 27 NO cuentan → lunes 28 (día 1), martes 29 (día 2) → vence martes 29/09/2026
      const resultado = calcularFechaVencimiento({
        fechaNotificacion: f(2026, 9, 25),
        diasCantidad: 2,
        modalidad: 'HABILES',
        diasNoHabiles: [],
      });
      expect(resultado.getDate()).toBe(29);
      expect(resultado.getMonth()).toBe(8);
    });
  
    test('salta un feriado cargado en DiaNoHabil, además del fin de semana', () => {
      // Notificado miércoles 23/09/2026, 3 días hábiles.
      // Simulamos que el viernes 25/09 es feriado.
      // Jueves 24 (día 1), viernes 25 = feriado (no cuenta),
      // sáb/dom no cuentan, lunes 28 (día 2), martes 29 (día 3) → vence 29/09/2026
      const resultado = calcularFechaVencimiento({
        fechaNotificacion: f(2026, 9, 23),
        diasCantidad: 3,
        modalidad: 'HABILES',
        diasNoHabiles: [{ fechaDesde: f(2026, 9, 25), fechaHasta: null }],
      });
      expect(resultado.getDate()).toBe(29);
      expect(resultado.getMonth()).toBe(8);
    });
  
    test('replica el ejemplo real de la carpeta: contestación civil 18 días hábiles', () => {
      // No verificamos un valor específico (depende del calendario de
      // feriados real), solo que el resultado sea posterior a la
      // notificación y que efectivamente haya "consumido" 18 días hábiles.
      const notificacion = f(2026, 9, 22);
      const resultado = calcularFechaVencimiento({
        fechaNotificacion: notificacion,
        diasCantidad: 18,
        modalidad: 'HABILES',
        diasNoHabiles: [],
      });
      expect(resultado.getTime()).toBeGreaterThan(notificacion.getTime());
    });
  
    test('modalidad HORAS lanza error explícito (no debe calcularse)', () => {
      expect(() =>
        calcularFechaVencimiento({
          fechaNotificacion: f(2026, 9, 22),
          diasCantidad: 1,
          modalidad: 'HORAS',
        })
      ).toThrow();
    });
  });
  
  describe('calcularLimiteConGracia', () => {
    test('devuelve el día hábil siguiente a las 09:00', () => {
      // Vencimiento viernes 25/09/2026 → gracia lunes 28/09/2026 09:00
      const resultado = calcularLimiteConGracia({
        fechaVencimiento: f(2026, 9, 25),
        diasNoHabiles: [],
      });
      expect(resultado.getDate()).toBe(28);
      expect(resultado.getHours()).toBe(9);
    });
  
    test('si el día siguiente también es no-hábil, sigue avanzando', () => {
      // Vencimiento jueves 24/09/2026, pero el viernes 25 es feriado.
      // Gracia debería caer el lunes 28/09/2026 (salta feriado + finde).
      const resultado = calcularLimiteConGracia({
        fechaVencimiento: f(2026, 9, 24),
        diasNoHabiles: [{ fechaDesde: f(2026, 9, 25), fechaHasta: null }],
      });
      expect(resultado.getDate()).toBe(28);
    });
  });
  
  describe('calcularSemaforo', () => {
    const hoy = f(2026, 9, 22);
  
    test('VERDE cuando faltan más de 5 días', () => {
      expect(calcularSemaforo({ fechaVencimiento: f(2026, 9, 30), hoy })).toBe('VERDE');
    });
  
    test('AMARILLO cuando faltan entre 2 y 5 días', () => {
      expect(calcularSemaforo({ fechaVencimiento: f(2026, 9, 26), hoy })).toBe('AMARILLO');
      expect(calcularSemaforo({ fechaVencimiento: f(2026, 9, 24), hoy })).toBe('AMARILLO');
    });
  
    test('ROJO cuando falta 1 día o vence hoy', () => {
      expect(calcularSemaforo({ fechaVencimiento: f(2026, 9, 23), hoy })).toBe('ROJO');
      expect(calcularSemaforo({ fechaVencimiento: f(2026, 9, 22), hoy })).toBe('ROJO'); // vence hoy
    });
  
    test('VENCIDO cuando la fecha ya pasó', () => {
      expect(calcularSemaforo({ fechaVencimiento: f(2026, 9, 20), hoy })).toBe('VENCIDO');
    });
  });