// ============================================================
// CalendarioPlazosPage.jsx
// Pantalla propia del sidebar "Calendario & Plazos" (RF6). Junta DOS
// tipos de vencimientos en el mismo calendario:
//   - Plazos judiciales: TODOS (pendientes + cumplidos, via
//     GET /api/plazos?incluirCumplidos=true)
//   - Vencimientos de RUC: trámites abiertos de Asesorías, con su
//     semáforo (GET /api/tramites/calendario)
// y los muestra en dos vistas intercambiables: Lista (VistaLista) y
// Mes (VistaMes). Arranca en Mes por defecto.
//
// Los dos botones de filtro (círculo = plazos judiciales, cuadrado =
// RUC) prenden y apagan cada tipo, y de paso funcionan como leyenda.
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
import MarcaEvento from './MarcaEvento';
import {
  TIPO_PLAZO,
  TIPO_RUC,
  TIPOS_EVENTO,
  plazoAEvento,
  tramiteAEvento,
} from './eventosCalendario';

const VISTAS = [
  { value: 'mes', label: 'Mes' },
  { value: 'lista', label: 'Lista' },
];

// Mismas clases que Button variant="secondary" size="md". Se aplican
// directo al Link porque un <button> dentro de un <a> no es HTML válido.
const CLASE_BOTON_SECUNDARIO =
  'rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200';

// ------------------------------------------------------------
// Botón de filtro: figura del tipo + nombre + cantidad. Prendido =
// fondo blanco con borde oscuro; apagado = gris tenue.
// (Va fuera de la página para que React no lo recree en cada render.)
// ------------------------------------------------------------
function BotonFiltro({ tipo, activo, onClick, cantidad }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
        activo
          ? 'border-gray-900 bg-white text-gray-900'
          : 'border-gray-200 bg-gray-50 text-gray-400 hover:text-gray-600'
      }`}
    >
      <MarcaEvento tipo={tipo} />
      {TIPOS_EVENTO[tipo].etiqueta}
      <span className="text-xs font-normal text-gray-500">({cantidad})</span>
    </button>
  );
}

export default function CalendarioPlazosPage() {
  // Eventos ya normalizados (ver eventosCalendario.js), uno por tipo
  const [eventosPlazos, setEventosPlazos] = useState([]);
  const [eventosRuc, setEventosRuc] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errores, setErrores] = useState([]); // un mensaje por cada carga que falló
  const [vista, setVista] = useState('mes');

  // Filtros: qué tipos de vencimiento se ven (los dos prendidos al inicio)
  const [verPlazos, setVerPlazos] = useState(true);
  const [verRuc, setVerRuc] = useState(true);

  // Carga los dos orígenes a la vez. Si uno falla, el otro igual se
  // muestra y se avisa cuál no se pudo cargar.
  useEffect(() => {
    async function cargarVencimientos() {
      const [plazos, tramites] = await Promise.allSettled([
        api.get('/plazos', { params: { incluirCumplidos: true } }),
        api.get('/tramites/calendario'),
      ]);

      const fallas = [];

      if (plazos.status === 'fulfilled') {
        setEventosPlazos(plazos.value.data.map(plazoAEvento));
      } else {
        fallas.push('No se pudieron cargar los plazos judiciales');
      }

      if (tramites.status === 'fulfilled') {
        setEventosRuc(tramites.value.data.map(tramiteAEvento));
      } else {
        fallas.push('No se pudieron cargar los vencimientos de RUC');
      }

      setErrores(fallas);
      setCargando(false);
    }
    cargarVencimientos();
  }, []);

  // Eventos que se muestran según los filtros prendidos
  const eventos = [...(verPlazos ? eventosPlazos : []), ...(verRuc ? eventosRuc : [])];

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

      {/* --- Filtros por tipo de vencimiento (también son la leyenda) --- */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <BotonFiltro
          tipo={TIPO_PLAZO}
          activo={verPlazos}
          onClick={() => setVerPlazos(!verPlazos)}
          cantidad={eventosPlazos.length}
        />
        <BotonFiltro
          tipo={TIPO_RUC}
          activo={verRuc}
          onClick={() => setVerRuc(!verRuc)}
          cantidad={eventosRuc.length}
        />
      </div>

      {errores.map((mensaje) => (
        <p key={mensaje} className="mb-4 text-sm text-red-600">
          {mensaje}
        </p>
      ))}

      {cargando ? (
        <p className="text-sm text-gray-500">Cargando vencimientos...</p>
      ) : vista === 'lista' ? (
        <VistaLista eventos={eventos} />
      ) : (
        <VistaMes eventos={eventos} />
      )}
    </div>
  );
}