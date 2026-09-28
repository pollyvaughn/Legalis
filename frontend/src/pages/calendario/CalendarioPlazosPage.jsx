// ============================================================
// CalendarioPlazosPage.jsx
// Pantalla propia del sidebar "Calendario & Plazos" (RF6). Trae
// TODOS los plazos del estudio (pendientes + cumplidos, via
// GET /api/plazos?incluirCumplidos=true) y los muestra en dos
// vistas intercambiables: Lista (VistaLista) y Mes (VistaMes).
// Arranca en Mes por defecto.
//
// Desde el encabezado se accede a los dos catálogos que alimentan
// el cálculo de plazos: tipos de plazo y días no hábiles. Van como
// botones secundarios a la derecha (mismo patrón que Asesorías →
// "Catálogo de trámites"), para que se vean como acciones y no
// como texto suelto.
// ============================================================

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import VistaLista from './VistaLista';
import VistaMes from './VistaMes';

const VISTAS = [
  { value: 'mes', label: 'Mes' },
  { value: 'lista', label: 'Lista' },
];

// Mismas clases que Button variant="secondary" size="md". Se aplican
// directo al Link porque un <button> dentro de un <a> no es HTML válido.
const CLASE_BOTON_SECUNDARIO =
  'rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200';

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
      {/* --- Encabezado: título a la izquierda; a la derecha, los
          botones de catálogos y el toggle de vista --- */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Calendario &amp; Plazos</h1>

        <div className="flex items-center gap-2">
          <Link to="/calendario/tipos-plazo" className={CLASE_BOTON_SECUNDARIO}>
            Tipos de plazo
          </Link>
          <Link to="/calendario/dias-no-habiles" className={CLASE_BOTON_SECUNDARIO}>
            Días no hábiles
          </Link>

          {/* Toggle Mes/Lista — separado un poco de los botones con
              margen izquierdo, para que se lea como un control distinto */}
          <div className="ml-2 flex rounded-lg bg-gray-100 p-1">
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