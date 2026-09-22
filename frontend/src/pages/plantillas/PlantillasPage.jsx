// ============================================
// PLANTILLASPAGE.JSX
// Biblioteca de escritos forenses (Módulo 1.4).
// Lista a la izquierda, detalle a la derecha.
//
// Filtros y paginación se resuelven en el BACKEND (GET /api/plantillas):
//   - búsqueda de texto (título, descripción y contenido)
//   - categoría (chips), fuero y clase (selects)
// La lista NO trae el cuerpo del escrito; al hacer clic en una
// plantilla se pide el detalle completo (GET /api/plantillas/:id).
//
// Alta / edición / duplicado: PlantillaFormModal.
// Eliminación: hard-delete con modal de confirmación.
// ============================================

import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { SelectInput } from '../../components/ui/Input';
import TablaContainer from '../../components/ui/TablaContainer';
import PlantillaDetalle from '../../components/plantillas/PlantillaDetalle';
import PlantillaFormModal from '../../components/plantillas/PlantillaFormModal';
import { OPCIONES_FUERO } from '../../constants/fueros';
import {
  OPCIONES_CLASE,
  OPCIONES_CATEGORIA,
  TONO_CATEGORIA,
  etiquetaCategoria,
  etiquetaClase,
  textoFuero,
} from '../../constants/plantillas';
import { formatearFecha } from '../../utils/fechas';
import { useAuth } from '../../context/AuthContext';

// Cantidad de plantillas por página
const LIMITE_POR_PAGINA = 10;

// --- Opciones de los filtros (value '' = "sin filtro") ---
// Los chips y los selects llevan "Todas/Todos" al principio.
// El filter() del fuero es por si OPCIONES_FUERO ya trae una opción vacía.
const CHIPS_CATEGORIA = [{ value: '', label: 'Todas' }, ...OPCIONES_CATEGORIA];
const SELECT_FUERO = [
  { value: '', label: 'Todos los fueros' },
  ...OPCIONES_FUERO.filter((o) => o.value !== ''),
];
const SELECT_CLASE = [{ value: '', label: 'Todas las clases' }, ...OPCIONES_CLASE];

function PlantillasPage() {
  const { esAbogado } = useAuth();
  // =====================================================
  // ESTADOS (todos van DENTRO del componente, arriba de todo)
  // =====================================================

  // --- Datos de la lista (vienen del backend) ---
  const [plantillas, setPlantillas] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // --- Filtros y paginación ---
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroFuero, setFiltroFuero] = useState('');
  const [filtroClase, setFiltroClase] = useState('');
  const [pagina, setPagina] = useState(1);

  // Búsqueda con debounce (mismo patrón que Clientes):
  // "input" cambia con cada tecla; "busqueda" se actualiza 400 ms
  // después de dejar de escribir y es la que dispara el pedido.
  const [busquedaInput, setBusquedaInput] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // --- Detalle de la plantilla seleccionada ---
  const [seleccionadaId, setSeleccionadaId] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState('');

  // --- Modal de formulario: null = cerrado, o { modo, inicial } ---
  const [modal, setModal] = useState(null);

  // --- Confirmación de eliminación ---
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState('');

  // ------------------------------------------
  // DEBOUNCE de la búsqueda (vuelve a página 1 al aplicarse)
  // ------------------------------------------
  useEffect(() => {
    const timer = setTimeout(() => {
      setBusqueda(busquedaInput);
      setPagina(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [busquedaInput]);

  // ------------------------------------------
  // CARGA DE LA LISTA
  // Función común (no dentro del useEffect) para poder reutilizarla
  // al crear/editar/eliminar y refrescar la lista.
  // ------------------------------------------
  async function cargarPlantillas() {
    setCargando(true);
    setError('');
    try {
      // axios omite los params que valen undefined
      const respuesta = await api.get('/plantillas', {
        params: {
          categoria: filtroCategoria || undefined,
          fuero: filtroFuero || undefined,
          clase: filtroClase || undefined,
          busqueda: busqueda || undefined,
          pagina,
          limite: LIMITE_POR_PAGINA,
        },
      });
      // El backend devuelve { datos, total, pagina, limite, totalPaginas }
      setPlantillas(respuesta.data.datos);
      setTotal(respuesta.data.total);
      setTotalPaginas(respuesta.data.totalPaginas);
    } catch (err) {
      setError('No se pudieron cargar las plantillas');
    } finally {
      setCargando(false);
    }
  }

  // Recarga cuando cambia cualquier filtro, la búsqueda o la página
  useEffect(() => {
    cargarPlantillas();
  }, [filtroCategoria, filtroFuero, filtroClase, busqueda, pagina]);

  // ------------------------------------------
  // CARGA DEL DETALLE al seleccionar una plantilla
  // "cancelado" evita que una respuesta lenta pise a una más nueva
  // (si hacés clic en A y enseguida en B, solo vale la respuesta de B).
  // ------------------------------------------
  useEffect(() => {
    if (!seleccionadaId) {
      setDetalle(null);
      return;
    }
    let cancelado = false;

    async function cargarDetalle() {
      setCargandoDetalle(true);
      setErrorDetalle('');
      try {
        const respuesta = await api.get(`/plantillas/${seleccionadaId}`);
        if (!cancelado) setDetalle(respuesta.data);
      } catch (err) {
        if (!cancelado) setErrorDetalle('No se pudo cargar la plantilla');
      } finally {
        if (!cancelado) setCargandoDetalle(false);
      }
    }

    cargarDetalle();
    return () => {
      cancelado = true;
    };
  }, [seleccionadaId]);

  // ------------------------------------------
  // Cambia un filtro y vuelve a la página 1
  // (si estabas en la página 3 y filtrás, esa página puede no existir)
  // ------------------------------------------
  function cambiarFiltro(setter, valor) {
    setter(valor);
    setPagina(1);
  }

  // ------------------------------------------
  // Abrir el modal en cada modo
  // "detalle" ya tiene el cuerpo completo, así que se precarga sin pedir nada más.
  // ------------------------------------------
  function abrirEditar() {
    setModal({ modo: 'editar', inicial: detalle });
  }

  function abrirDuplicar() {
    setModal({
      modo: 'duplicar',
      // slice(0, 200) respeta el límite del título aunque "Copia de" lo alargue
      inicial: { ...detalle, titulo: `Copia de ${detalle.titulo}`.slice(0, 200) },
    });
  }

  // ------------------------------------------
  // Al guardar (crear / editar / duplicar)
  // ------------------------------------------
  function manejarGuardado(guardada) {
    const eraEdicion = modal.modo === 'editar';
    setModal(null);

    if (eraEdicion) {
      setDetalle(guardada); // el PUT devuelve la plantilla completa, no hace falta pedirla de nuevo
      cargarPlantillas(); // el orden puede cambiar (se ordena por última edición)
    } else {
      setSeleccionadaId(guardada.id); // abre la nueva en el panel derecho
      // La nueva queda primera de la lista: volvemos a página 1 para verla
      if (pagina !== 1) setPagina(1);
      else cargarPlantillas();
    }
  }

  // ------------------------------------------
  // Eliminar (hard-delete, con confirmación previa)
  // ------------------------------------------
  function abrirEliminar() {
    setErrorEliminar('');
    setConfirmandoEliminar(true);
  }

  async function confirmarEliminar() {
    setEliminando(true);
    setErrorEliminar('');
    try {
      await api.delete(`/plantillas/${seleccionadaId}`);
      setConfirmandoEliminar(false);
      setSeleccionadaId(null); // cierra el panel de detalle
      // Si borramos la única plantilla de la última página, retrocedemos una página
      if (plantillas.length === 1 && pagina > 1) setPagina(pagina - 1);
      else cargarPlantillas();
    } catch (err) {
      setErrorEliminar(err.response?.data?.error || 'No se pudo eliminar la plantilla');
    } finally {
      setEliminando(false);
    }
  }

  const hayFiltros = busqueda || filtroCategoria || filtroFuero || filtroClase;

  // =====================================================
  // RENDER (el return va SIEMPRE al final del componente)
  // =====================================================
  return (
    <div>
      {/* --- Encabezado: título + acción principal --- */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Escritos forenses</h1>
        {esAbogado && (
          <Button onClick={() => setModal({ modo: 'crear', inicial: null })}>
            + Nueva plantilla
          </Button>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {/* --- Dos columnas (12 en total). Sin selección la lista ocupa
          7 y el placeholder 5; con selección, la lista pasa a 5 y el
          detalle a 7 (como en el Figma). --- */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* ========== COLUMNA IZQUIERDA: lista ========== */}
        <div className={seleccionadaId ? 'lg:col-span-5' : 'lg:col-span-7'}>
          <TablaContainer
            busqueda={busquedaInput}
            onBusquedaChange={setBusquedaInput}
            placeholder="Buscar plantilla..."
            cantidad={total}
            unidad="plantilla"
          >
            {/* --- Filtros: chips de categoría + selects de fuero y clase --- */}
            <div className="space-y-3 border-b border-gray-100 px-5 py-4">
              <div className="flex flex-wrap gap-2">
                {CHIPS_CATEGORIA.map((chip) => (
                  <button
                    key={chip.value}
                    onClick={() => cambiarFiltro(setFiltroCategoria, chip.value)}
                    className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                      filtroCategoria === chip.value
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="w-48">
                  <SelectInput
                    name="filtroFuero"
                    value={filtroFuero}
                    onChange={(e) => cambiarFiltro(setFiltroFuero, e.target.value)}
                    opciones={SELECT_FUERO}
                  />
                </div>
                <div className="w-48">
                  <SelectInput
                    name="filtroClase"
                    value={filtroClase}
                    onChange={(e) => cambiarFiltro(setFiltroClase, e.target.value)}
                    opciones={SELECT_CLASE}
                  />
                </div>
              </div>
            </div>

            {/* --- Lista de plantillas --- */}
            {cargando ? (
              <p className="px-5 py-8 text-center text-sm text-gray-500">Cargando plantillas...</p>
            ) : plantillas.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-500">
                {hayFiltros
                  ? 'No hay plantillas que coincidan con este filtro.'
                  : 'Todavía no hay escritos cargados en la biblioteca.'}
              </p>
            ) : (
              plantillas.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSeleccionadaId(p.id)}
                  className={`w-full border-t border-gray-100 px-5 py-4 text-left transition hover:bg-gray-50 ${
                    seleccionadaId === p.id ? 'bg-gray-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium text-gray-900">{p.titulo}</span>
                    <span className="shrink-0">
                      <Badge tone={TONO_CATEGORIA[p.categoria]}>
                        {etiquetaCategoria(p.categoria)}
                      </Badge>
                    </span>
                  </div>
                  {p.descripcion && (
                    <p className="mt-1 text-sm text-gray-500">{p.descripcion}</p>
                  )}
                  <p className="mt-2 text-xs text-gray-400">
                    {textoFuero(p.fuero)} · {etiquetaClase(p.clase)} · Editado{' '}
                    {formatearFecha(p.actualizadoEn)}
                  </p>
                </button>
              ))
            )}
          </TablaContainer>

          {/* --- Paginación: solo si hay más de una página --- */}
          {totalPaginas > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Página {pagina} de {totalPaginas}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagina <= 1}
                  onClick={() => setPagina((p) => p - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagina >= totalPaginas}
                  onClick={() => setPagina((p) => p + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ========== COLUMNA DERECHA: detalle o placeholder ========== */}
        <div className={seleccionadaId ? 'lg:col-span-7' : 'lg:col-span-5'}>
          {!seleccionadaId ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-20 text-gray-400">
              <FileText size={40} strokeWidth={1.5} />
              <p className="mt-3 text-sm">Seleccioná una plantilla para verla</p>
            </div>
          ) : errorDetalle ? (
            <p className="text-sm text-red-600">{errorDetalle}</p>
          ) : (
            <PlantillaDetalle
              plantilla={detalle}
              cargando={cargandoDetalle}
              soloLectura={!esAbogado}
              onCerrar={() => setSeleccionadaId(null)}
              onEditar={abrirEditar}
              onDuplicar={abrirDuplicar}
              onEliminar={abrirEliminar}
            />
          )}
        </div>
      </div>

      {/* --- Modal de crear / editar / duplicar --- */}
      {modal && (
        <PlantillaFormModal
          modo={modal.modo}
          inicial={modal.inicial}
          onClose={() => setModal(null)}
          onGuardado={manejarGuardado}
        />
      )}

      {/* --- Confirmación de eliminación --- */}
      {confirmandoEliminar && (
        <Modal title="Eliminar plantilla" onClose={() => setConfirmandoEliminar(false)}>
          <div className="px-6 py-5">
            <p className="text-sm text-gray-700">
              ¿Eliminar <strong>{detalle?.titulo}</strong>? Esta acción no se puede deshacer.
            </p>
            {errorEliminar && <p className="mt-3 text-sm text-red-600">{errorEliminar}</p>}
          </div>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setConfirmandoEliminar(false)}>
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

export default PlantillasPage;