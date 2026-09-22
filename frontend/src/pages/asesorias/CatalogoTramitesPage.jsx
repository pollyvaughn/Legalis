// ============================================
// CATALOGOTRAMITESPAGE.JSX
// Catálogo de trámites (Módulo 1.3): los trámites que ofrece el
// estudio ("IVA general", "Inscripción en el RUC"...). Se cargan una
// sola vez y después se asignan a cada cliente.
//
// Filtro de estado (activos/inactivos/todos) y búsqueda de texto,
// ambos resueltos en el BACKEND (GET /api/tipos-tramite, que devuelve
// un array simple, sin paginación).
//
// Reglas que refleja la pantalla:
//  - Inactivar se bloquea si hay obligaciones periódicas activas.
//  - Eliminar solo es posible si el trámite nunca se usó.
// ============================================

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import TablaContainer from '../../components/ui/TablaContainer';
import TipoTramiteFormModal from '../../components/asesorias/TipoTramiteFormModal';
import { useAuth } from '../../context/AuthContext';

// Opciones del filtro de estado ("activos" es el default)
const FILTROS_ESTADO = [
  { value: 'activos', label: 'Activos' },
  { value: 'inactivos', label: 'Inactivos' },
  { value: 'todos', label: 'Todos' },
];

// Clases de los botones de texto de cada fila
const CLASE_ACCION = 'rounded-lg px-2.5 py-1 text-sm text-gray-600 transition hover:bg-gray-100';
const CLASE_ACCION_PELIGRO = 'rounded-lg px-2.5 py-1 text-sm text-red-600 transition hover:bg-red-50';

function CatalogoTramitesPage() {
  const { esAbogado } = useAuth();
  // --- Datos de la lista ---
  const [tipos, setTipos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // --- Filtros ---
  const [filtroEstado, setFiltroEstado] = useState('activos');

  // Búsqueda con debounce (mismo patrón que Clientes)
  const [busquedaInput, setBusquedaInput] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // --- Modal de formulario: null = cerrado, o { inicial } (inicial null = alta) ---
  const [modal, setModal] = useState(null);

  // --- Confirmación de inactivar/eliminar: null o { tipo: 'inactivar' | 'eliminar', item } ---
  const [accion, setAccion] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [errorAccion, setErrorAccion] = useState('');

  // ------------------------------------------
  // DEBOUNCE de la búsqueda (400 ms después de dejar de escribir)
  // ------------------------------------------
  useEffect(() => {
    const timer = setTimeout(() => setBusqueda(busquedaInput), 400);
    return () => clearTimeout(timer);
  }, [busquedaInput]);

  // ------------------------------------------
  // CARGA DE LA LISTA
  // Función común para reutilizarla tras crear/editar/inactivar/eliminar.
  // ------------------------------------------
  async function cargarTipos() {
    setCargando(true);
    setError('');
    try {
      const respuesta = await api.get('/tipos-tramite', {
        params: { estado: filtroEstado, busqueda: busqueda || undefined },
      });
      setTipos(respuesta.data);
    } catch (err) {
      setError('No se pudo cargar el catálogo de trámites');
    } finally {
      setCargando(false);
    }
  }

  // Recarga cuando cambia el filtro de estado o la búsqueda (ya con debounce)
  useEffect(() => {
    cargarTipos();
  }, [filtroEstado, busqueda]);

  // ------------------------------------------
  // REACTIVAR (directo, sin confirmación: es reversible y sin riesgo)
  // ------------------------------------------
  async function reactivar(item) {
    setError('');
    try {
      await api.put(`/tipos-tramite/${item.id}`, { activo: true });
      cargarTipos();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo reactivar el trámite');
    }
  }

  // ------------------------------------------
  // CONFIRMAR inactivar / eliminar
  // El backend puede rechazar con 409 (ej: hay obligaciones activas);
  // el mensaje se muestra dentro del modal de confirmación.
  // ------------------------------------------
  function abrirAccion(tipo, item) {
    setErrorAccion('');
    setAccion({ tipo, item });
  }

  async function confirmarAccion() {
    setProcesando(true);
    setErrorAccion('');
    try {
      if (accion.tipo === 'inactivar') {
        await api.put(`/tipos-tramite/${accion.item.id}`, { activo: false });
      } else {
        await api.delete(`/tipos-tramite/${accion.item.id}`);
      }
      setAccion(null);
      cargarTipos();
    } catch (err) {
      setErrorAccion(err.response?.data?.error || 'No se pudo completar la acción');
    } finally {
      setProcesando(false);
    }
  }

  // La columna Estado solo aporta información cuando se mezclan activos e inactivos
  const mostrarColumnaEstado = filtroEstado === 'todos';

  return (
    <div>
      {/* --- Encabezado: volver + título + acción principal --- */}
      <div className="mb-6">
        <Link
          to="/asesorias"
          className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={14} strokeWidth={1.75} />
          Asesorías &amp; Trámites
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Catálogo de trámites</h1>
            <p className="mt-1 text-sm text-gray-500">
              Los trámites que ofrecés a tus clientes. Se cargan una sola vez y después se asignan a cada cliente.
            </p>
          </div>
          {esAbogado && <Button onClick={() => setModal({ inicial: null })}>+ Nuevo trámite</Button>}
        </div>
      </div>

      {/* --- Filtro de estado: Activos / Inactivos / Todos --- */}
      <div className="mb-4 flex gap-2">
        {FILTROS_ESTADO.map((filtro) => (
          <button
            key={filtro.value}
            onClick={() => setFiltroEstado(filtro.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              filtroEstado === filtro.value
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {filtro.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <TablaContainer
        busqueda={busquedaInput}
        onBusquedaChange={setBusquedaInput}
        placeholder="Buscar trámite..."
        cantidad={tipos.length}
        unidad="trámite"
      >
        {cargando ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">Cargando catálogo...</p>
        ) : tipos.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {busqueda || filtroEstado !== 'activos'
              ? 'No hay trámites que coincidan con este filtro.'
              : esAbogado
                ? 'Todavía no hay trámites en el catálogo. Cargá el primero con «+ Nuevo trámite».'
                : 'Todavía no hay trámites en el catálogo.'}
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs font-medium text-gray-500">
                <th className="px-5 py-3">Trámite</th>
                <th className="px-5 py-3">Obligaciones</th>
                <th className="px-5 py-3">Vencimientos</th>
                {mostrarColumnaEstado && <th className="px-5 py-3">Estado</th>}
                {esAbogado && <th className="px-5 py-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {tipos.map((t) => {
                // Sin uso = nunca tuvo obligaciones ni vencimientos: solo así se puede eliminar
                const sinUso = t._count.obligaciones + t._count.tramites === 0;
                return (
                  <tr key={t.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{t.nombre}</p>
                      {t.descripcion && (
                        <p className="mt-0.5 text-xs text-gray-500">{t.descripcion}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{t._count.obligaciones}</td>
                    <td className="px-5 py-3 text-gray-600">{t._count.tramites}</td>
                    {mostrarColumnaEstado && (
                      <td className="px-5 py-3">
                        <Badge tone={t.activo ? 'green' : 'gray'}>
                          {t.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                    )}
                    {esAbogado && (
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setModal({ inicial: t })} className={CLASE_ACCION}>
                            Editar
                          </button>
                          {t.activo ? (
                            <button onClick={() => abrirAccion('inactivar', t)} className={CLASE_ACCION}>
                              Inactivar
                            </button>
                          ) : (
                            <button onClick={() => reactivar(t)} className={CLASE_ACCION}>
                              Reactivar
                            </button>
                          )}
                          {sinUso && (
                            <button onClick={() => abrirAccion('eliminar', t)} className={CLASE_ACCION_PELIGRO}>
                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </TablaContainer>

      {/* --- Modal de alta / edición --- */}
      {modal && (
        <TipoTramiteFormModal
          inicial={modal.inicial}
          onClose={() => setModal(null)}
          onGuardado={() => {
            setModal(null);
            cargarTipos(); // refresca la lista con el cambio
          }}
        />
      )}

      {/* --- Confirmación de inactivar / eliminar --- */}
      {accion && (
        <Modal
          title={accion.tipo === 'inactivar' ? 'Inactivar trámite' : 'Eliminar trámite'}
          onClose={() => setAccion(null)}
        >
          <div className="px-6 py-5">
            <p className="text-sm text-gray-700">
              {accion.tipo === 'inactivar' ? (
                <>
                  ¿Inactivar <strong>{accion.item.nombre}</strong>? Dejará de aparecer al asignar trámites
                  nuevos, pero se conserva todo su historial. Podés reactivarlo cuando quieras.
                </>
              ) : (
                <>
                  ¿Eliminar <strong>{accion.item.nombre}</strong> del catálogo? Solo es posible porque nunca se
                  usó. Esta acción no se puede deshacer.
                </>
              )}
            </p>
            {errorAccion && <p className="mt-3 text-sm text-red-600">{errorAccion}</p>}
          </div>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setAccion(null)}>
              Cancelar
            </Button>
            <Button
              variant={accion.tipo === 'eliminar' ? 'danger' : 'primary'}
              onClick={confirmarAccion}
              disabled={procesando}
            >
              {procesando
                ? 'Procesando...'
                : accion.tipo === 'inactivar'
                  ? 'Inactivar'
                  : 'Eliminar'}
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}

export default CatalogoTramitesPage;