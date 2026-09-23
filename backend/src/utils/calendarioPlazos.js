// ============================================================
// CALENDARIO DE PLAZOS JUDICIALES (Módulo 2)
// Funciones puras: no tocan Prisma ni la base de datos. Reciben
// todo lo que necesitan como parámetro y devuelven un resultado,
// igual patrón que backend/src/utils/calendarioRuc.js (Módulo 1.3).
// Esto permite testearlas sin levantar la base de datos.
// ============================================================

// ------------------------------------------------------------
// Helper: ¿esta fecha cae sábado o domingo?
// getDay() en JS: 0 = domingo, 6 = sábado.
// ------------------------------------------------------------
function esFinDeSemana(fecha) {
    const diaSemana = fecha.getDay();
    return diaSemana === 0 || diaSemana === 6;
  }
  
  // ------------------------------------------------------------
  // Helper: ¿esta fecha cae dentro de algún rango de diasNoHabiles?
  // diasNoHabiles es un array de { fechaDesde, fechaHasta } ya
  // traído de la base (el service se encarga de la consulta a
  // Prisma; esta función no sabe nada de eso).
  // fechaHasta puede ser null → se trata como un solo día
  // (fechaDesde === fechaHasta).
  // ------------------------------------------------------------
  function esDiaNoHabil(fecha, diasNoHabiles) {
    const fechaComoTiempo = fecha.getTime();
  
    return diasNoHabiles.some(({ fechaDesde, fechaHasta }) => {
      const desde = new Date(fechaDesde).getTime();
      const hasta = fechaHasta ? new Date(fechaHasta).getTime() : desde;
      return fechaComoTiempo >= desde && fechaComoTiempo <= hasta;
    });
  }
  
  // ------------------------------------------------------------
  // Helper: avanza una fecha un día calendario.
  // Se usa tanto para "días corridos" como para ir revisando
  // candidato por candidato en "días hábiles".
  // ------------------------------------------------------------
  function sumarUnDia(fecha) {
    const nuevaFecha = new Date(fecha);
    nuevaFecha.setDate(nuevaFecha.getDate() + 1);
    return nuevaFecha;
  }
  
  // ------------------------------------------------------------
  // CÁLCULO PRINCIPAL: fecha de vencimiento de un plazo judicial.
  //
  // Parámetros:
  //   fechaNotificacion (Date) — hito que origina el cómputo (RN-20)
  //   diasCantidad (number)    — cantidad de días del plazo
  //   modalidad ('HABILES' | 'CORRIDOS' | 'HORAS')
  //   diasNoHabiles (array)    — [{ fechaDesde, fechaHasta }], solo
  //                              se usa si modalidad === 'HABILES'
  //
  // Si modalidad === 'HORAS', esta función NO debe llamarse: el
  // service carga fechaVencimiento y horaLimite directamente desde
  // lo que ingresa la abogada, sin cálculo (ver nota en el schema).
  //
  // CORRIDOS: cuenta todos los días calendario, sin excepciones,
  // empezando desde el día siguiente a la notificación.
  //
  // HABILES: empieza el día hábil siguiente a la notificación
  // (RN-21) y va sumando de a un día, saltando fines de semana y
  // diasNoHabiles, hasta acumular diasCantidad días hábiles.
  // ------------------------------------------------------------
  function calcularFechaVencimiento({ fechaNotificacion, diasCantidad, modalidad, diasNoHabiles = [] }) {
    if (modalidad === 'HORAS') {
      throw new Error(
        'calcularFechaVencimiento no aplica a modalidad HORAS: la fecha se carga manualmente.'
      );
    }
  
    if (modalidad === 'CORRIDOS') {
      // Días corridos: sin saltos, simplemente sumar diasCantidad
      // días calendario a partir del día siguiente a la notificación.
      let fecha = new Date(fechaNotificacion);
      for (let i = 0; i < diasCantidad; i++) {
        fecha = sumarUnDia(fecha);
      }
      return fecha;
    }
  
    if (modalidad === 'HABILES') {
      // Días hábiles: contamos solo los días que NO son fin de
      // semana ni están en diasNoHabiles, empezando desde el día
      // siguiente a la notificación (RN-21).
      let fecha = new Date(fechaNotificacion);
      let diasHabilesContados = 0;
  
      while (diasHabilesContados < diasCantidad) {
        fecha = sumarUnDia(fecha);
  
        const esHabil = !esFinDeSemana(fecha) && !esDiaNoHabil(fecha, diasNoHabiles);
        if (esHabil) {
          diasHabilesContados++;
        }
        // Si no es hábil, el while sigue sin contar ese día —
        // simplemente se salta y se prueba el día siguiente.
      }
  
      return fecha;
    }
  
    throw new Error(`Modalidad de plazo desconocida: ${modalidad}`);
  }
  
  // ------------------------------------------------------------
  // LÍMITE CON GRACIA (RN-22): solo informativo, no cambia
  // fechaVencimiento ni el semáforo (que se calcula sobre la
  // fecha de vencimiento real, sin la gracia).
  //
  // No aplica en fuero Penal (RN-19: sin gracia) — el llamador
  // (service) decide si mostrar este dato según esPenal.
  //
  // Devuelve: el día hábil siguiente al vencimiento, a las 09:00.
  // ------------------------------------------------------------
  function calcularLimiteConGracia({ fechaVencimiento, diasNoHabiles = [] }) {
    let fecha = sumarUnDia(new Date(fechaVencimiento));
  
    // Igual que en el cálculo de hábiles: si el día siguiente cae
    // en no-hábil, se sigue avanzando hasta el próximo hábil real.
    while (esFinDeSemana(fecha) || esDiaNoHabil(fecha, diasNoHabiles)) {
      fecha = sumarUnDia(fecha);
    }
  
    fecha.setHours(9, 0, 0, 0);
    return fecha;
  }
  
  // ------------------------------------------------------------
  // SEMÁFORO (RN-24): se calcula al vuelo, nunca se guarda.
  // Compara fechaVencimiento contra hoy.
  //
  // Devuelve uno de: 'VERDE' | 'AMARILLO' | 'ROJO' | 'VENCIDO' | 'CUMPLIDO'
  //
  // Si el plazo ya está marcado CUMPLIDO en la base, el llamador
  // debe devolver 'CUMPLIDO' directamente sin llamar a esta función
  // (no tiene sentido calcular urgencia sobre algo ya resuelto).
  // Esta función asume que el plazo sigue PENDIENTE.
  // ------------------------------------------------------------
  function calcularSemaforo({ fechaVencimiento, hoy = new Date() }) {
    // Normalizamos ambas fechas a medianoche para comparar solo
    // el día calendario, sin que la hora actual afecte el cálculo.
    const vencimiento = new Date(fechaVencimiento);
    vencimiento.setHours(0, 0, 0, 0);
  
    const hoyNormalizado = new Date(hoy);
    hoyNormalizado.setHours(0, 0, 0, 0);
  
    const unDiaEnMs = 24 * 60 * 60 * 1000;
    const diasRestantes = Math.round((vencimiento.getTime() - hoyNormalizado.getTime()) / unDiaEnMs);
  
    if (diasRestantes < 0) return 'VENCIDO';       // la fecha ya pasó y sigue pendiente
    if (diasRestantes <= 1) return 'ROJO';         // falta 1 día o menos (incluye "vence hoy")
    if (diasRestantes <= 5) return 'AMARILLO';     // faltan de 2 a 5 días
    return 'VERDE';                                // faltan más de 5 días
  }
  
  module.exports = {
    calcularFechaVencimiento,
    calcularLimiteConGracia,
    calcularSemaforo,
    // exportadas para poder testearlas sueltas también
    esFinDeSemana,
    esDiaNoHabil,
  };