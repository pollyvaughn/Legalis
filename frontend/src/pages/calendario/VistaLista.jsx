// ============================================================
// VistaLista.jsx
// Sub-componente de CalendarioPlazosPage: lista plana de todos
// los plazos (pendientes y cumplidos), ordenados por urgencia
// (el mismo orden que ya devuelve el backend). Click en una fila
// navega al detalle del expediente correspondiente.
// ============================================================

import { useNavigate } from 'react-router-dom';
import Badge from '../../components/ui/Badge';
import { TONO_SEMAFORO, ETIQUETA_SEMAFORO } from '../../constants/semaforoPlazos';
import { formatearFechaHora, formatearFechaSola } from '../../utils/fechas';

function partesFechaLista(plazo) {
  const esFechaSinHora = Boolean(plazo.fechaVencimiento);
  const fecha = esFechaSinHora
    ? new Date(`${plazo.fechaVencimiento.slice(0, 10)}T00:00:00.000Z`)
    : new Date(plazo.horaLimite);

  const opciones = esFechaSinHora ? { timeZone: 'UTC' } : {};

  return {
    dia: new Intl.DateTimeFormat('es-PY', {
      ...opciones,
      day: '2-digit',
    }).format(fecha),
    mes: new Intl.DateTimeFormat('es-PY', {
      ...opciones,
      month: 'short',
    })
      .format(fecha)
      .replace(/\./g, '')
      .toLocaleUpperCase('es-PY'),
  };
}

export default function VistaLista({ plazos }) {
  const navigate = useNavigate();

  if (plazos.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        No hay plazos cargados todavía.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <ul className="divide-y divide-gray-100">
        {plazos.map((plazo) => {
          const { dia, mes } = partesFechaLista(plazo);
          return (
            <li
              key={plazo.id}
              onClick={() => navigate(`/expedientes/${plazo.expediente.id}`)}
              className="flex cursor-pointer items-center justify-between px-5 py-4 hover:bg-gray-50"
            >
              <div className="flex items-center gap-4">
                {/* Fecha destacada, mismo patrón visual que el Figma de referencia */}
                <div className="w-14 shrink-0 text-center">
                  <p className="text-lg font-semibold leading-tight text-gray-900">
                    {dia}
                  </p>
                  <p className="text-xs uppercase text-gray-400">
                    {mes}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{plazo.tipoPlazo?.nombre}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {plazo.expediente?.caratula} · Exp. {plazo.expediente?.numeroExpediente}
                  </p>
                </div>
              </div>
              <Badge tone={TONO_SEMAFORO[plazo.semaforo] || 'gray'}>
                {ETIQUETA_SEMAFORO[plazo.semaforo] || plazo.semaforo}
              </Badge>
            </li>
          );
        })}
      </ul>
    </div>
  );
}