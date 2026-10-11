// ============================================================
// eventosCalendario.js
// El calendario muestra DOS tipos de vencimientos juntos:
//   - PLAZO: plazos judiciales (de un expediente)
//   - RUC:   trámites abiertos de Asesorías (vencimientos de RUC)
// Cada uno viene del backend con una forma distinta; acá se
// "normalizan" a un mismo formato (un "evento") para que la vista
// de mes y la lista los traten igual.
//
// Evento = {
//   clave:    texto único ('plazo-12', 'ruc-7')
//   tipo:     'PLAZO' | 'RUC'
//   fecha:    'AAAA-MM-DD' (día del vencimiento, sin hora)
//   hora:     'HH:MM' o null (solo plazos en modalidad HORAS)
//   semaforo: 'VERDE' | 'AMARILLO' | 'ROJO' | 'VENCIDO' | 'CUMPLIDO'
//   titulo:   qué vence (tipo de plazo / tipo de trámite)
//   detalle:  de quién (carátula y expediente / cliente y RUC)
//   ruta:     a dónde lleva al hacer clic
// }
// ============================================================

import { formatearFechaSola } from '../../utils/fechas';

export const TIPO_PLAZO = 'PLAZO';
export const TIPO_RUC = 'RUC';

// Textos de cada tipo: 'etiqueta' va en los filtros y 'corta' en cada fila
export const TIPOS_EVENTO = {
  [TIPO_PLAZO]: { etiqueta: 'Plazos judiciales', corta: 'Plazo judicial' },
  [TIPO_RUC]: { etiqueta: 'Vencimientos RUC', corta: 'Vencimiento RUC' },
};

// ------------------------------------------------------------
// Plazo judicial (GET /api/plazos) -> evento
// fechaVencimiento viene como ISO a medianoche UTC: se toma solo el
// día (los primeros 10 caracteres) para que no se corra por zona horaria.
// En modalidad HORAS además se muestra la hora límite.
// ------------------------------------------------------------
export function plazoAEvento(plazo) {
  const hora =
    plazo.modalidad === 'HORAS' && plazo.horaLimite
      ? new Intl.DateTimeFormat('es-PY', { hour: '2-digit', minute: '2-digit', hour12: false }).format(
          new Date(plazo.horaLimite)
        )
      : null;

  return {
    clave: `plazo-${plazo.id}`,
    tipo: TIPO_PLAZO,
    fecha: plazo.fechaVencimiento.slice(0, 10),
    hora,
    semaforo: plazo.semaforo,
    titulo: plazo.tipoPlazo?.nombre ?? 'Plazo judicial',
    detalle: `${plazo.expediente?.caratula ?? ''} · Exp. ${plazo.expediente?.numeroExpediente ?? ''}`,
    ruta: plazo.expediente ? `/expedientes/${plazo.expediente.id}` : null,
  };
}

// ------------------------------------------------------------
// Trámite abierto (GET /api/tramites/calendario) -> evento
// Al hacer clic abre Asesorías con el detalle de ese trámite
// (/asesorias?tramiteId=12).
// ------------------------------------------------------------
export function tramiteAEvento(tramite) {
  const cliente = tramite.cliente;
  return {
    clave: `ruc-${tramite.id}`,
    tipo: TIPO_RUC,
    fecha: tramite.fechaVencimiento.slice(0, 10),
    hora: null,
    semaforo: tramite.semaforo,
    titulo: tramite.tipoTramite?.nombre ?? 'Trámite',
    detalle: `${cliente?.nombreRazonSocial ?? ''}${cliente?.ruc ? ` · RUC ${cliente.ruc}` : ''}`,
    ruta: `/asesorias?tramiteId=${tramite.id}`,
  };
}

// ------------------------------------------------------------
// ORDEN POR URGENCIA: vencidos primero, después rojo, amarillo,
// verde y cumplidos al final. Dentro de cada grupo, por fecha y,
// si empatan, los plazos judiciales antes que los de RUC.
// ------------------------------------------------------------
const PRIORIDAD = { VENCIDO: 0, ROJO: 1, AMARILLO: 2, VERDE: 3, CUMPLIDO: 4 };

export function ordenarPorUrgencia(eventos) {
  return [...eventos].sort(
    (a, b) =>
      (PRIORIDAD[a.semaforo] ?? 5) - (PRIORIDAD[b.semaforo] ?? 5) ||
      a.fecha.localeCompare(b.fecha) ||
      a.tipo.localeCompare(b.tipo) ||
      a.clave.localeCompare(b.clave)
  );
}

// El semáforo más urgente de un grupo de eventos (para el "+N" de un día)
export function peorSemaforo(eventos) {
  return ordenarPorUrgencia(eventos)[0]?.semaforo;
}

// ------------------------------------------------------------
// Fechas de un evento ('AAAA-MM-DD'), siempre en UTC para que no
// se corran un día.
// ------------------------------------------------------------
const aFechaUtc = (fecha) => new Date(`${fecha}T00:00:00.000Z`);

// 'AAAA-MM-DD' -> { dia: '17', mes: 'OCT' } (para el bloque de fecha de la lista)
export function partesFecha(fecha) {
  const f = aFechaUtc(fecha);
  return {
    dia: new Intl.DateTimeFormat('es-PY', { day: '2-digit', timeZone: 'UTC' }).format(f),
    mes: new Intl.DateTimeFormat('es-PY', { month: 'short', timeZone: 'UTC' })
      .format(f)
      .replace(/\./g, '')
      .toLocaleUpperCase('es-PY'),
  };
}

// 'AAAA-MM-DD' -> '17/10/2026'
export function fechaCorta(fecha) {
  return formatearFechaSola(aFechaUtc(fecha).toISOString());
}

// Días desde hoy (fecha local) hasta 'AAAA-MM-DD'. Negativo = ya pasó.
export function diasHastaFecha(fecha) {
  const ahora = new Date();
  const hoy = Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  return Math.round((aFechaUtc(fecha).getTime() - hoy) / 86400000); // 86.400.000 ms = 1 día
}