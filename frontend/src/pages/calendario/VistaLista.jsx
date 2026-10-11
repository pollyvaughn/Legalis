// ============================================================
// VistaLista.jsx
// Sub-componente de CalendarioPlazosPage: lista de vencimientos
// (plazos judiciales + vencimientos de RUC, ya normalizados, ver
// eventosCalendario.js), ordenados por urgencia: vencidos primero,
// después rojo, amarillo, verde y cumplidos al final.
//
// Cada obligación periódica genera todos sus vencimientos del año, así
// que la lista podría tener cientos de filas. Por defecto muestra los
// vencidos y los de los próximos HORIZONTE_DIAS días; un botón permite
// ver todos.
// ============================================================

import { useState } from 'react';
import FilaEvento from './FilaEvento';
import { diasHastaFecha, ordenarPorUrgencia } from './eventosCalendario';

// Hasta cuántos días hacia adelante muestra la lista por defecto
const HORIZONTE_DIAS = 60;

export default function VistaLista({ eventos }) {
  const [verTodos, setVerTodos] = useState(false);

  if (eventos.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        No hay vencimientos para mostrar.
      </div>
    );
  }

  const ordenados = ordenarPorUrgencia(eventos);
  // Vencidos (días negativos) y los que vencen dentro del horizonte
  const cercanos = ordenados.filter((evento) => diasHastaFecha(evento.fecha) <= HORIZONTE_DIAS);
  const visibles = verTodos ? ordenados : cercanos;
  const ocultos = ordenados.length - cercanos.length;

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      {visibles.length === 0 ? (
        <p className="p-8 text-center text-sm text-gray-500">
          No hay vencimientos en los próximos {HORIZONTE_DIAS} días.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {visibles.map((evento) => (
            <FilaEvento key={evento.clave} evento={evento} mostrarFecha />
          ))}
        </ul>
      )}

      {/* Botón para ver los vencimientos más lejanos (o volver a ocultarlos) */}
      {ocultos > 0 && (
        <div className="border-t border-gray-100 px-5 py-3 text-center">
          <button
            type="button"
            onClick={() => setVerTodos(!verTodos)}
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            {verTodos
              ? `Mostrar solo los próximos ${HORIZONTE_DIAS} días`
              : `Mostrar todos (${ocultos} más adelante)`}
          </button>
        </div>
      )}
    </div>
  );
}