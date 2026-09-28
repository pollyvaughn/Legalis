// ============================================
// CATALOGOTIPOSPLAZOPAGE.JSX
// Catálogo de tipos de plazo (Módulo 2): los plazos procesales
// habituales ("Contestación de demanda civil", 18 días hábiles...).
// Se cargan una sola vez y después se eligen al crear un plazo
// dentro de un expediente. Mismo patrón que CatalogoTramitesPage.
//
// Filtro de estado (activos/inactivos/todos) y búsqueda de texto,
// resueltos en el BACKEND (GET /api/tipos-plazo, array simple).
//
// Reglas que refleja la pantalla:
//  - Inactivar no tiene bloqueo: un tipo inactivo deja de aparecer
//    al crear plazos nuevos, pero los plazos ya creados no cambian.
//  - Eliminar solo es posible si el tipo nunca se usó en un plazo.
// ============================================

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import TablaContainer from '../../components/ui/TablaContainer';
import TipoPlazoFormModal from '../../components/calendario/TipoPlazoFormModal';
import { etiquetaFueroAplicable, etiquetaModalidadPlazo } from '../../constants/tiposPlazo';
import { useAuth } from '../../context/AuthContext';

// Opciones del filtro de estado ("activos" es el default)
const FILTROS_ESTADO = [
  { value: 'activos', label: 'Activos' },
  { value: 'inactivos', label: 'Inactivos' },
  { value: 'todos', label: 'Todos' },
];

// Clases de los botones de texto de cada fila (mismas que CatalogoTramitesPage)
const CLASE_ACCION = 'rounded-lg px-2.5 py-1 text-sm text-gray-600 transition hover:bg-gray-100';
const CLASE_ACCION_PELIGRO = 'rounded-lg px-2.5 py-1 text-sm text-red-600 transition hover:bg-red-50';

function CatalogoTiposPlazoPage() {
  const { esAbogado } = useAuth();

  // --- Datos de la lista ---
  const [tipos, setTipos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // --- Filtros ---
  const [filtroEstado, setFiltroEstado] = useState('activos');

  // Búsqueda con debounce (mismo patrón que el resto de listas)
  const [busquedaInput, setBusquedaInput] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // --- Modal de formulario: null = cerrado, o { inicial } (inicial null = alta) ---
  const [modal, setModal] = useState(null);

  // --- Confirmación de inactivar/eliminar: null o { tipo: 'inactivar' | 'eliminar', item } ---
  const [accion, setAccion] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [errorAccion, setErrorAccion] = useState('');

  // DEBOUNCE de la búsqueda (400 ms después de dejar de escribir)
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
      const respuesta = await api.get('/tipos-plazo', {
        params: { estado: filtroEstado, busqueda: busqueda || undefined },
      });
      setTipos(respuesta.data);
    } catch (err) {
      setError('No se pudo cargar el catálogo de tipos de plazo');
    } finally {
      setCargando(false);
    }
  }

  // Recarga cuando cambia el filtro de estado o la búsqueda (ya con debounce)
  useEffect(() => {
    cargarTipos();
  }, [filtroEstado, busqueda]);

  // ------------------------------------------
  // REACTIVAR (directo, sin confirmación: es reversible y sin riesgo).
  // Usa PATCH /:id/activo, la ruta específica que armamos para esto.
  // ------------------------------------------
  async function reactivar(item) {
    setError('');
    try {
      await api.patch(`/tipos-plazo/${item.id}/activo`, { activo: true });
      cargarTipos();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo reactivar el tipo de plazo');
    }
  }

  // ------------------------------------------
  // CONFIRMAR inactivar / eliminar
  // El backend puede rechazar el borrado (400) si el tipo ya tiene
  // plazos asociados; el mensaje se muestra dentro del modal.
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
        await api.patch(`/tipos-plazo/${accion.item.id}/activo`, { activo: false });
      } else {
        await api.delete(`/tipos-plazo/${accion.item.id}`);
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
          to="/calendario"
          className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={14} strokeWidth={1.75} />
          Calendario &amp; Plazos
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Catálogo de tipos de plazo</h1>
            <p className="mt-1 text-sm text-gray-500">
              Los plazos procesales habituales. Se cargan una sola vez y después se eligen al crear un
              plazo dentro de un expediente.
            </p>
          </div>
          {esAbogado && <Button onClick={() => setModal({ inicial: null })}>+ Nuevo tipo de plazo</Button>}
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
        placeholder="Buscar tipo de plazo..."
        cantidad={tipos.length}
        unidad="tipo"
      >
        {cargando ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">Cargando catálogo...</p>
        ) : tipos.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {busqueda || filtroEstado !== 'activos'
              ? 'No hay tipos de plazo que coincidan con este filtro.'
              : esAbogado
                ? 'Todavía no hay tipos de plazo. Cargá el primero con «+ Nuevo tipo de plazo».'
                : 'Todavía no hay tipos de plazo en el catálogo.'}
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs font-medium text-gray-500">
                <th className="px-5 py-3">Tipo de plazo</th>
                <th className="px-5 py-3">Fuero</th>
                <th className="px-5 py-3">Sugerido</th>
                <th className="px-5 py-3">Plazos creados</th>
                {mostrarColumnaEstado && <th className="px-5 py-3">Estado</th>}
                {esAbogado && <th className="px-5 py-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {tipos.map((t) => {
                // Sin uso = nunca se creó un plazo con este tipo: solo así se puede eliminar
                const sinUso = t._count.plazos === 0;
                return (
                  <tr key={t.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{t.nombre}</td>
                    <td className="px-5 py-3 text-gray-600">{etiquetaFueroAplicable(t.fuero)}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {t.diasDefault} · {etiquetaModalidadPlazo(t.modalidadDefault)}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{t._count.plazos}</td>
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
        <TipoPlazoFormModal
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
          title={accion.tipo === 'inactivar' ? 'Inactivar tipo de plazo' : 'Eliminar tipo de plazo'}
          onClose={() => setAccion(null)}
        >
          <div className="px-6 py-5">
            <p className="text-sm text-gray-700">
              {accion.tipo === 'inactivar' ? (
                <>
                  ¿Inactivar <strong>{accion.item.nombre}</strong>? Dejará de aparecer al crear plazos
                  nuevos, pero los plazos ya creados no cambian. Podés reactivarlo cuando quieras.
                </>
              ) : (
                <>
                  ¿Eliminar <strong>{accion.item.nombre}</strong> del catálogo? Solo es posible porque
                  nunca se usó. Esta acción no se puede deshacer.
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

export default CatalogoTiposPlazoPage;