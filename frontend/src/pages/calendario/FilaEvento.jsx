// ============================================================
// FilaEvento.jsx
// Una fila de la lista de vencimientos. La usan dos lugares:
//   - VistaLista (con el bloque de fecha a la izquierda)
//   - el panel de "vencimientos del día" de VistaMes (sin ese bloque,
//     porque el panel ya dice de qué día es)
// Al hacer clic lleva al detalle (expediente o trámite de Asesorías).
// ============================================================

import { useNavigate } from 'react-router-dom';
import Badge from '../../components/ui/Badge';
import { TONO_SEMAFORO, ETIQUETA_SEMAFORO } from '../../constants/semaforoPlazos';
import MarcaEvento from './MarcaEvento';
import { TIPOS_EVENTO, partesFecha } from './eventosCalendario';

export default function FilaEvento({ evento, mostrarFecha = false }) {
  const navigate = useNavigate();
  const { dia, mes } = partesFecha(evento.fecha);

  return (
    <li
      onClick={() => evento.ruta && navigate(evento.ruta)}
      className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50"
    >
      <div className="flex min-w-0 items-center gap-4">
        {/* Fecha destacada (solo en la Lista) */}
        {mostrarFecha && (
          <div className="w-14 shrink-0 text-center">
            <p className="text-lg font-semibold leading-tight text-gray-900">{dia}</p>
            <p className="text-xs uppercase text-gray-400">{mes}</p>
          </div>
        )}

        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium text-gray-900">
            <MarcaEvento tipo={evento.tipo} semaforo={evento.semaforo} />
            <span className="truncate">{evento.titulo}</span>
            {evento.hora && (
              <span className="shrink-0 text-xs font-normal text-gray-500">{evento.hora} hs</span>
            )}
          </p>
          <p className="mt-0.5 truncate text-xs text-gray-500">
            {TIPOS_EVENTO[evento.tipo].corta} · {evento.detalle}
          </p>
        </div>
      </div>

      <Badge tone={TONO_SEMAFORO[evento.semaforo] || 'gray'}>
        {ETIQUETA_SEMAFORO[evento.semaforo] || evento.semaforo}
      </Badge>
    </li>
  );
}