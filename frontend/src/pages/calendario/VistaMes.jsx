// ============================================================
// VistaMes.jsx
// Sub-componente de CalendarioPlazosPage: grilla mensual hecha a
// mano (sin librería de calendario — el sistema no necesita drag,
// vista semanal/diaria interactiva ni superposición de eventos,
// solo ver qué días tienen vencimientos y entrar al detalle).
//
// Recibe los EVENTOS (plazos judiciales + vencimientos de RUC, ya
// normalizados, ver eventosCalendario.js) de cualquier mes; agrupa
// internamente por día. Flechas < > cambian de mes.
//
// Cada día con vencimientos muestra hasta MAX_MARCAS figuras
// (círculo = plazo judicial, cuadrado = RUC; color = semáforo). Si
// hay más, aparece un "+N" del color del vencimiento más urgente del
// día. Al hacer clic en un día se abre, debajo de la grilla, el panel
// con TODOS los vencimientos de ese día.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ETIQUETA_SEMAFORO } from '../../constants/semaforoPlazos';
import FilaEvento from './FilaEvento';
import MarcaEvento, { COLOR_MARCA } from './MarcaEvento';
import {
  TIPO_PLAZO,
  TIPO_RUC,
  TIPOS_EVENTO,
  fechaCorta,
  ordenarPorUrgencia,
  peorSemaforo,
} from './eventosCalendario';

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Cuántas figuras caben en la celda de un día antes de pasar a "+N"
const MAX_MARCAS = 4;

// Arma la grilla de un mes: array de semanas, cada semana un array
// de 7 días (número de día o null si es relleno antes/después del mes).
// getDay() de JS da 0=domingo — lo convertimos a que la semana
// empiece en lunes (índice 0), como en el Figma de referencia.
function armarGrilla(anio, mes) {
  const primerDia = new Date(anio, mes, 1);
  const ultimoDia = new Date(anio, mes + 1, 0).getDate();
  const diaSemanaPrimero = (primerDia.getDay() + 6) % 7; // 0=lunes

  const celdas = [];
  for (let i = 0; i < diaSemanaPrimero; i++) celdas.push(null);
  for (let dia = 1; dia <= ultimoDia; dia++) celdas.push(dia);
  while (celdas.length % 7 !== 0) celdas.push(null);

  const semanas = [];
  for (let i = 0; i < celdas.length; i += 7) {
    semanas.push(celdas.slice(i, i + 7));
  }
  return semanas;
}

export default function VistaMes({ eventos }) {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth()); // 0-11
  const [diaSeleccionado, setDiaSeleccionado] = useState(null); // número de día o null
  const panelRef = useRef(null);

  // Agrupa los eventos por día del mes mostrado (clave: día del mes,
  // 1-31), ya ordenados por urgencia. Solo considera los del anio/mes
  // actual. 'fecha' es 'AAAA-MM-DD'.
  const eventosPorDia = {};
  for (const evento of ordenarPorUrgencia(eventos)) {
    const [anioFecha, mesFecha, dia] = evento.fecha.split('-').map(Number);
    if (anioFecha === anio && mesFecha - 1 === mes) {
      (eventosPorDia[dia] ||= []).push(evento);
    }
  }

  function cambiarMes(delta) {
    const nuevaFecha = new Date(anio, mes + delta, 1);
    setAnio(nuevaFecha.getFullYear());
    setMes(nuevaFecha.getMonth());
    setDiaSeleccionado(null); // el panel era de otro mes
  }

  // Al elegir un día, baja hasta el panel para que se vea sin tener
  // que scrollear a mano.
  useEffect(() => {
    if (diaSeleccionado && panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [diaSeleccionado]);

  const semanas = armarGrilla(anio, mes);
  const esHoy = (dia) =>
    dia === hoy.getDate() && mes === hoy.getMonth() && anio === hoy.getFullYear();

  // Fecha 'AAAA-MM-DD' del día seleccionado (para el título del panel)
  const fechaSeleccionada = diaSeleccionado
    ? `${anio}-${String(mes + 1).padStart(2, '0')}-${String(diaSeleccionado).padStart(2, '0')}`
    : null;
  const eventosDelDiaSeleccionado = diaSeleccionado ? eventosPorDia[diaSeleccionado] || [] : [];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">
          {NOMBRES_MES[mes]} {anio}
        </h2>
        <div className="flex gap-1">
          <button
            onClick={() => cambiarMes(-1)}
            aria-label="Mes anterior"
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <ChevronLeft size={18} strokeWidth={1.75} />
          </button>
          <button
            onClick={() => cambiarMes(1)}
            aria-label="Mes siguiente"
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <ChevronRight size={18} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-gray-100 bg-gray-100">
        {DIAS_SEMANA.map((nombreDia) => (
          <div
            key={nombreDia}
            className="bg-gray-50 px-2 py-2 text-center text-xs font-medium text-gray-500"
          >
            {nombreDia}
          </div>
        ))}

        {semanas.map((semana, i) =>
          semana.map((dia, j) => {
            const eventosDelDia = dia ? eventosPorDia[dia] || [] : [];
            const hayEventos = eventosDelDia.length > 0;
            const seleccionado = dia && dia === diaSeleccionado;

            // Contenido de la celda: número de día + figuras
            const contenido = dia && (
              <>
                <p
                  className={`text-sm ${
                    esHoy(dia) ? 'font-semibold text-white' : 'text-gray-700'
                  }`}
                >
                  {dia}
                </p>
                {hayEventos && (
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {eventosDelDia.slice(0, MAX_MARCAS).map((evento) => (
                      <MarcaEvento key={evento.clave} tipo={evento.tipo} semaforo={evento.semaforo} />
                    ))}
                    {eventosDelDia.length > MAX_MARCAS && (
                      <span
                        className={`rounded-full px-1.5 text-[10px] font-semibold leading-4 text-white ${
                          COLOR_MARCA[peorSemaforo(eventosDelDia)] || 'bg-gray-400'
                        }`}
                      >
                        +{eventosDelDia.length - MAX_MARCAS}
                      </span>
                    )}
                  </div>
                )}
              </>
            );

            const clasesBase = `min-h-20 p-2 text-left ${esHoy(dia) ? 'bg-gray-900' : 'bg-white'}`;

            // Días con vencimientos: la celda entera es un botón (blanco
            // grande para tocar). El resto, una celda común.
            return hayEventos ? (
              <button
                key={`${i}-${j}`}
                type="button"
                onClick={() => setDiaSeleccionado(seleccionado ? null : dia)}
                aria-label={`${dia} de ${NOMBRES_MES[mes]}: ${eventosDelDia.length} vencimiento(s)`}
                className={`${clasesBase} block w-full cursor-pointer ${
                  esHoy(dia) ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                } ${seleccionado ? 'ring-2 ring-inset ring-sky-500' : ''}`}
              >
                {contenido}
              </button>
            ) : (
              <div key={`${i}-${j}`} className={clasesBase}>
                {contenido}
              </div>
            );
          })
        )}
      </div>

      {/* --- Leyenda: forma = tipo, color = urgencia --- */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <MarcaEvento tipo={TIPO_PLAZO} /> {TIPOS_EVENTO[TIPO_PLAZO].corta}
        </span>
        <span className="flex items-center gap-1.5">
          <MarcaEvento tipo={TIPO_RUC} /> {TIPOS_EVENTO[TIPO_RUC].corta}
        </span>
        <span className="text-gray-300">|</span>
        {['VERDE', 'AMARILLO', 'ROJO', 'VENCIDO', 'CUMPLIDO'].map((semaforo) => (
          <span key={semaforo} className="flex items-center gap-1.5">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${COLOR_MARCA[semaforo]}`} />
            {ETIQUETA_SEMAFORO[semaforo]}
          </span>
        ))}
      </div>

      {/* --- Panel del día: todos los vencimientos del día elegido --- */}
      {diaSeleccionado && (
        <div ref={panelRef} className="mt-5 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h3 className="text-sm font-semibold text-gray-900">
              Vencimientos del {fechaCorta(fechaSeleccionada)}
              <span className="ml-2 font-normal text-gray-500">
                ({eventosDelDiaSeleccionado.length})
              </span>
            </h3>
            <button
              type="button"
              onClick={() => setDiaSeleccionado(null)}
              aria-label="Cerrar panel del día"
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>
          <ul className="max-h-96 divide-y divide-gray-100 overflow-y-auto">
            {eventosDelDiaSeleccionado.map((evento) => (
              <FilaEvento key={evento.clave} evento={evento} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}