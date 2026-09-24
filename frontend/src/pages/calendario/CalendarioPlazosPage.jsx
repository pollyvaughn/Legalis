// ============================================================
// CalendarioPlazosPage.jsx
// Pantalla propia del sidebar "Calendario & Plazos" (RF6). Trae
// TODOS los plazos del estudio (pendientes + cumplidos, via
// GET /api/plazos?incluirCumplidos=true) y los muestra en dos
// vistas intercambiables: Lista (VistaLista) y Mes (VistaMes).
// Arranca en Mes por defecto.
// ============================================================

import { useEffect, useState } from 'react';
import api from '../../api/axios';
import VistaLista from './VistaLista';
import VistaMes from './VistaMes';

const VISTAS = [
  { value: 'mes', label: 'Mes' },
  { value: 'lista', label: 'Lista' },
];

export default function CalendarioPlazosPage() {
  const [plazos, setPlazos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [vista, setVista] = useState('mes');

  useEffect(() => {
    async function cargarPlazos() {
      try {
        const respuesta = await api.get('/plazos', {
          params: { incluirCumplidos: true },
        });
        setPlazos(respuesta.data);
      } catch (err) {
        setError('No se pudieron cargar los plazos');
      } finally {
        setCargando(false);
      }
    }
    cargarPlazos();
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Calendario &amp; Plazos</h1>

        {/* Toggle Lista/Mes — mismo patrón visual que el filtro
            Activos/Inactivos/Todos de ExpedientesListPage. */}
        <div className="flex rounded-lg bg-gray-100 p-1">
          {VISTAS.map((v) => (
            <button
              key={v.value}
              onClick={() => setVista(v.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                vista === v.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {cargando ? (
        <p className="text-sm text-gray-500">Cargando plazos...</p>
      ) : vista === 'lista' ? (
        <VistaLista plazos={plazos} />
      ) : (
        <VistaMes plazos={plazos} />
      )}
    </div>
  );
}