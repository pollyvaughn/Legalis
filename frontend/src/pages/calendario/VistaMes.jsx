// ============================================================
// VistaMes.jsx
// Sub-componente de CalendarioPlazosPage: grilla mensual hecha a
// mano (sin librería de calendario — el sistema no necesita drag,
// vista semanal/diaria interactiva ni superposición de eventos,
// solo ver qué días tienen vencimientos y entrar al detalle).
//
// Recibe TODOS los plazos (de cualquier mes) y el mes/año a
// mostrar; agrupa internamente por día. Flechas < > cambian de mes.
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TONO_SEMAFORO } from '../../constants/semaforoPlazos';

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Colores del puntito según semáforo — mismo mapeo que Badge, pero
// como fondo sólido (bg-*-500) porque acá es un punto chico, no
// una pastilla con texto adentro.
const COLOR_PUNTO = {
  VERDE: 'bg-green-500',
  AMARILLO: 'bg-yellow-500',
  ROJO: 'bg-orange-500',
  VENCIDO: 'bg-red-500',
  CUMPLIDO: 'bg-gray-400',
};

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

export default function VistaMes({ plazos }) {
  const navigate = useNavigate();
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth()); // 0-11

  // Agrupa los plazos por día del mes actual (clave: día del mes,
  // 1-31). Solo considera los que caen en el anio/mes mostrados.
  const plazosPorDia = {};
  for (const plazo of plazos) {
    const fecha = plazo.fechaVencimiento || plazo.horaLimite;
    if (!fecha) continue;
    const fechaDate = new Date(fecha);
    if (fechaDate.getFullYear() === anio && fechaDate.getMonth() === mes) {
      const dia = fechaDate.getDate();
      (plazosPorDia[dia] ||= []).push(plazo);
    }
  }

  function cambiarMes(delta) {
    const nuevaFecha = new Date(anio, mes + delta, 1);
    setAnio(nuevaFecha.getFullYear());
    setMes(nuevaFecha.getMonth());
  }

  const semanas = armarGrilla(anio, mes);
  const esHoy = (dia) =>
    dia === hoy.getDate() && mes === hoy.getMonth() && anio === hoy.getFullYear();

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">
          {NOMBRES_MES[mes]} {anio}
        </h2>
        <div className="flex gap-1">
          <button
            onClick={() => cambiarMes(-1)}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <ChevronLeft size={18} strokeWidth={1.75} />
          </button>
          <button
            onClick={() => cambiarMes(1)}
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
            const plazosDelDia = dia ? plazosPorDia[dia] || [] : [];
            return (
              <div
                key={`${i}-${j}`}
                className={`min-h-20 bg-white p-2 ${dia && esHoy(dia) ? 'bg-gray-900' : ''}`}
              >
                {dia && (
                  <>
                    <p
                      className={`text-sm ${
                        esHoy(dia) ? 'font-semibold text-white' : 'text-gray-700'
                      }`}
                    >
                      {dia}
                    </p>
                    {plazosDelDia.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {plazosDelDia.map((plazo) => (
                          <button
                            key={plazo.id}
                            title={`${plazo.tipoPlazo?.nombre} · ${plazo.expediente?.caratula}`}
                            onClick={() => navigate(`/expedientes/${plazo.expediente.id}`)}
                            className={`h-2 w-2 rounded-full ${COLOR_PUNTO[plazo.semaforo] || 'bg-gray-400'}`}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}