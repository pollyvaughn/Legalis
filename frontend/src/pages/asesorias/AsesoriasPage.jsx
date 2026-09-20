// ============================================
// ASESORIASPAGE.JSX
// Pantalla principal de Asesorías & Trámites (Módulo 1.3):
// lista de vencimientos (trámites) de los clientes.
//
// Filtros y paginación se resuelven en el BACKEND (GET /api/tramites):
//   - estado: por defecto "Abiertos" (pendientes y en proceso),
//     ordenados por vencimiento: lo vencido queda arriba.
//   - cliente, trámite y búsqueda de texto.
// Clic en una fila abre el detalle (cambiar estado, ajustar fecha).
// "+ Nuevo trámite" carga un trámite ÚNICO; los periódicos los
// generan las obligaciones (tanda 2B).
// ============================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { SelectInput } from '../../components/ui/Input';
import TablaContainer from '../../components/ui/TablaContainer';
import TramiteFormModal from '../../components/asesorias/TramiteFormModal';
import TramiteDetalleModal from '../../components/asesorias/TramiteDetalleModal';
import UrgenciaBadge from '../../components/asesorias/UrgenciaBadge';
import {
  OPCIONES_ESTADO_TRAMITE,
  TONO_ESTADO_TRAMITE,
  etiquetaEstadoTramite,
} from '../../constants/tramites';
import { formatearFechaSola } from '../../utils/fechas';

// Cantidad de trámites por página
const LIMITE_POR_PAGINA = 10;

// Chips de estado: "Abiertos" (default) + cada estado + "Todos"
const CHIPS_ESTADO = [
  { value: 'abiertos', label: 'Abiertos' },
  ...OPCIONES_ESTADO_TRAMITE,
  { value: 'todos', label: 'Todos' },
];

function AsesoriasPage() {
  const navigate = useNavigate();

  // --- Datos de la lista (vienen del backend) ---
  const [tramites, setTramites] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // --- Opciones para los selects (clientes y trámites del catálogo) ---
  const [clientes, setClientes] = useState([]);
  const [tipos, setTipos] = useState([]);

  // --- Filtros y paginación ---
  const [filtroEstado, setFiltroEstado] = useState('abiertos');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [pagina, setPagina] = useState(1);

  // Búsqueda con debounce (mismo patrón que Clientes)
  const [busquedaInput, setBusquedaInput] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // --- Modales: alta de trámite único y detalle (id del trámite abierto) ---
  const [modalNuevo, setModalNuevo] = useState(false);
  const [detalleId, setDetalleId] = useState(null);

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
  // OPCIONES de los selects: se cargan una sola vez al abrir la pantalla.
  // Los value van como texto (String) para coincidir con los <option>.
  // ------------------------------------------
  useEffect(() => {
    async function cargarOpciones() {
      try {
        const [rClientes, rTipos] = await Promise.all([
          api.get('/clientes/opciones'),
          api.get('/tipos-tramite/opciones'),
        ]);
        const listaClientes = Array.isArray(rClientes.data) ? rClientes.data : rClientes.data.datos || [];
        setClientes(
          listaClientes.map((c) => ({ value: String(c.id), label: c.nombreRazonSocial || c.nombre }))
        );
        setTipos(rTipos.data.map((t) => ({ value: String(t.id), label: t.nombre })));
      } catch (err) {
        setError('No se pudieron cargar los filtros de clientes y trámites');
      }
    }
    cargarOpciones();
  }, []);

  // ------------------------------------------
  // CARGA DE LA LISTA
  // Función común para reutilizarla al crear/editar y refrescar.
  // ------------------------------------------
  async function cargarTramites() {
    setCargando(true);
    setError('');
    try {
      const respuesta = await api.get('/tramites', {
        params: {
          estado: filtroEstado,
          clienteId: filtroCliente || undefined,
          tipoTramiteId: filtroTipo || undefined,
          busqueda: busqueda || undefined,
          pagina,
          limite: LIMITE_POR_PAGINA,
        },
      });
      // El backend devuelve { datos, total, pagina, limite, totalPaginas }
      setTramites(respuesta.data.datos);
      setTotal(respuesta.data.total);
      setTotalPaginas(respuesta.data.totalPaginas);
    } catch (err) {
      setError('No se pudieron cargar los trámites');
    } finally {
      setCargando(false);
    }
  }

  // Recarga cuando cambia cualquier filtro, la búsqueda o la página
  useEffect(() => {
    cargarTramites();
  }, [filtroEstado, filtroCliente, filtroTipo, busqueda, pagina]);

  // Cambia un filtro y vuelve a la página 1
  function cambiarFiltro(setter, valor) {
    setter(valor);
    setPagina(1);
  }

  const hayFiltros = busqueda || filtroCliente || filtroTipo || filtroEstado !== 'abiertos';

  return (
    <div>
      {/* --- Encabezado: título + acciones --- */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Asesorías &amp; Trámites</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/asesorias/catalogo')}>
            Catálogo de trámites
          </Button>
          {/* TANDA 2B: acá va el botón "+ Obligación periódica" */}
          <Button onClick={() => setModalNuevo(true)}>+ Nuevo trámite</Button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <TablaContainer
        busqueda={busquedaInput}
        onBusquedaChange={setBusquedaInput}
        placeholder="Buscar cliente, RUC, trámite..."
        cantidad={total}
        unidad="trámite"
      >
        {/* --- Filtros: chips de estado + selects de cliente y trámite --- */}
        <div className="space-y-3 border-b border-gray-100 px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {CHIPS_ESTADO.map((chip) => (
              <button
                key={chip.value}
                onClick={() => cambiarFiltro(setFiltroEstado, chip.value)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                  filtroEstado === chip.value
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="w-56">
              <SelectInput
                name="filtroCliente"
                value={filtroCliente}
                onChange={(e) => cambiarFiltro(setFiltroCliente, e.target.value)}
                opciones={[{ value: '', label: 'Todos los clientes' }, ...clientes]}
              />
            </div>
            <div className="w-56">
              <SelectInput
                name="filtroTipo"
                value={filtroTipo}
                onChange={(e) => cambiarFiltro(setFiltroTipo, e.target.value)}
                opciones={[{ value: '', label: 'Todos los trámites' }, ...tipos]}
              />
            </div>
          </div>
        </div>

        {/* --- Tabla de vencimientos --- */}
        {cargando ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">Cargando trámites...</p>
        ) : tramites.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {hayFiltros
              ? 'No hay trámites que coincidan con este filtro.'
              : 'No hay trámites abiertos.'}
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs font-medium text-gray-500">
                <th className="px-5 py-3">Vencimiento</th>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Trámite</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Docs</th>
              </tr>
            </thead>
            <tbody>
              {tramites.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setDetalleId(t.id)}
                  className="cursor-pointer border-t border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="whitespace-nowrap text-gray-900">
                        {formatearFechaSola(t.fechaVencimiento)}
                      </span>
                      <UrgenciaBadge tramite={t} />
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-900">{t.cliente.nombreRazonSocial}</td>
                  <td className="px-5 py-3">
                    <p className="text-gray-900">{t.tipoTramite.nombre}</p>
                    <p className="text-xs text-gray-400">{t.obligacionId ? 'Periódico' : 'Único'}</p>
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={TONO_ESTADO_TRAMITE[t.estado]}>{etiquetaEstadoTramite(t.estado)}</Badge>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{t._count.documentos || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TablaContainer>

      {/* --- Paginación: solo si hay más de una página --- */}
      {totalPaginas > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Página {pagina} de {totalPaginas}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
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

      {/* --- Modal de alta de trámite único --- */}
      {modalNuevo && (
        <TramiteFormModal
          clientes={clientes}
          tipos={tipos}
          onClose={() => setModalNuevo(false)}
          onGuardado={() => {
            setModalNuevo(false);
            cargarTramites(); // refresca con el trámite nuevo
          }}
        />
      )}

      {/* --- Modal de detalle --- */}
      {detalleId && (
        <TramiteDetalleModal
          tramiteId={detalleId}
          onClose={() => setDetalleId(null)}
          onCambio={cargarTramites}
        />
      )}
    </div>
  );
}

export default AsesoriasPage;