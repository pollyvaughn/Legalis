// ============================================
// CATALOGODIASNOHABILESPAGE.JSX
// Catálogo de días no hábiles (Módulo 2, RN-23): feriados
// nacionales, asuetos locales y feria judicial, todo en una sola
// tabla. Los cargados acá son los que el cálculo de plazos en días
// hábiles saltea (ver calendarioPlazos.js).
//
// A diferencia de los otros catálogos, NO tiene estado
// activo/inactivo: si se cargó mal, se edita o se elimina directo,
// porque ningún registro apunta a un día no hábil puntual (los
// plazos ya calculados guardaron su resultado, no una referencia).
// La lista es corta (unas pocas decenas por año), así que se
// muestra completa, sin paginación.
// ============================================

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import TablaContainer from '../../components/ui/TablaContainer';
import DiaNoHabilFormModal from '../../components/calendario/DiaNoHabilFormModal';
import { useAuth } from '../../context/AuthContext';

// Clases de los botones de texto de cada fila (mismas que los otros catálogos)
const CLASE_ACCION = 'rounded-lg px-2.5 py-1 text-sm text-gray-600 transition hover:bg-gray-100';
const CLASE_ACCION_PELIGRO = 'rounded-lg px-2.5 py-1 text-sm text-red-600 transition hover:bg-red-50';

function formatearFecha(fechaIso) {
  return new Date(fechaIso).toLocaleDateString('es-PY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function CatalogoDiasNoHabilesPage() {
  const { esAbogado } = useAuth();

  // --- Datos de la lista ---
  const [dias, setDias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // La búsqueda filtra en memoria (el backend devuelve la lista
  // completa): es corta, no vale la pena sumarle filtros al endpoint.
  const [busqueda, setBusqueda] = useState('');

  // --- Modal de formulario: null = cerrado, o { inicial } (inicial null = alta) ---
  const [modal, setModal] = useState(null);

  // --- Confirmación de eliminar: null o el registro a eliminar ---
  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState('');

  async function cargarDias() {
    setCargando(true);
    setError('');
    try {
      const respuesta = await api.get('/dias-no-habiles');
      setDias(respuesta.data);
    } catch (err) {
      setError('No se pudo cargar el catálogo de días no hábiles');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarDias();
  }, []);

  async function confirmarEliminar() {
    setEliminando(true);
    setErrorEliminar('');
    try {
      await api.delete(`/dias-no-habiles/${aEliminar.id}`);
      setAEliminar(null);
      cargarDias();
    } catch (err) {
      setErrorEliminar(err.response?.data?.error || 'No se pudo eliminar el día no hábil');
    } finally {
      setEliminando(false);
    }
  }

  // Filtro en memoria por descripción
  const diasFiltrados = busqueda
    ? dias.filter((d) => d.descripcion.toLowerCase().includes(busqueda.toLowerCase()))
    : dias;

  return (
    <div>
      {/* --- Encabezado: volver + título + acción principal --- */}
      <div className="mb-6">
        <Link
          to="/calendario"
          className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={14} strokeWidth={1.75} />
          Calendario &amp; Plazos
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Días no hábiles</h1>
            <p className="mt-1 text-sm text-gray-500">
              Feriados, asuetos y feria judicial. El cálculo de plazos en días hábiles los saltea.
              Los asuetos locales se cargan acá a mano.
            </p>
          </div>
          {esAbogado && <Button onClick={() => setModal({ inicial: null })}>+ Nuevo día no hábil</Button>}
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <TablaContainer
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        placeholder="Buscar por descripción..."
        cantidad={diasFiltrados.length}
        unidad="día"
      >
        {cargando ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">Cargando catálogo...</p>
        ) : diasFiltrados.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {busqueda
              ? 'No hay días no hábiles que coincidan con la búsqueda.'
              : esAbogado
                ? 'Todavía no hay días no hábiles cargados. Cargá el primero con «+ Nuevo día no hábil».'
                : 'Todavía no hay días no hábiles cargados.'}
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs font-medium text-gray-500">
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Descripción</th>
                {esAbogado && <th className="px-5 py-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {diasFiltrados.map((d) => (
                <tr key={d.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {/* Rango si hay fechaHasta distinta; día único si no */}
                    {d.fechaHasta && d.fechaHasta !== d.fechaDesde
                      ? `${formatearFecha(d.fechaDesde)} → ${formatearFecha(d.fechaHasta)}`
                      : formatearFecha(d.fechaDesde)}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{d.descripcion}</td>
                  {esAbogado && (
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setModal({ inicial: d })} className={CLASE_ACCION}>
                          Editar
                        </button>
                        <button
                          onClick={() => {
                            setErrorEliminar('');
                            setAEliminar(d);
                          }}
                          className={CLASE_ACCION_PELIGRO}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TablaContainer>

      {/* --- Modal de alta / edición --- */}
      {modal && (
        <DiaNoHabilFormModal
          inicial={modal.inicial}
          onClose={() => setModal(null)}
          onGuardado={() => {
            setModal(null);
            cargarDias();
          }}
        />
      )}

      {/* --- Confirmación de eliminar --- */}
      {aEliminar && (
        <Modal title="Eliminar día no hábil" onClose={() => setAEliminar(null)}>
          <div className="px-6 py-5">
            <p className="text-sm text-gray-700">
              ¿Eliminar <strong>{aEliminar.descripcion}</strong>? Los plazos que ya se calcularon no
              cambian, pero los cálculos nuevos van a contar ese día como hábil. Esta acción no se
              puede deshacer.
            </p>
            {errorEliminar && <p className="mt-3 text-sm text-red-600">{errorEliminar}</p>}
          </div>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setAEliminar(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmarEliminar} disabled={eliminando}>
              {eliminando ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}

export default CatalogoDiasNoHabilesPage;