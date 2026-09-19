// ============================================
// EXPEDIENTESLISTPAGE.JSX
// Lista de expedientes con filtros y paginación, ambos resueltos
// en el BACKEND (GET /api/expedientes). El frontend solo manda los
// filtros elegidos y muestra la página que devuelve el servidor.
//
// Filtros: estado (activos/inactivos/todos), fuero, estado procesal,
// año, juzgado y búsqueda de texto (número, carátula, cliente).
// Paginación: 10 por página, con botones Anterior/Siguiente.
//
// Cada fila lleva al detalle del expediente. El botón
// "+ Nuevo expediente" abre ExpedienteFormModal, que al crear
// navega directo al detalle.
// ============================================

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import ExpedienteFormModal from './ExpedienteFormModal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import TablaContainer from '../../components/ui/TablaContainer';
import { SelectInput, Input } from '../../components/ui/Input';
import { etiquetaFuero, OPCIONES_FUERO } from '../../constants/fueros';
import {
  etiquetaEstadoProcesal,
  OPCIONES_ESTADO_PROCESAL,
} from '../../constants/estadosProcesales';

// Opciones del filtro de estado activo/inactivo. "activos" es el
// default porque mantiene el comportamiento histórico del sistema.
const FILTROS_ESTADO = [
  { value: 'activos', label: 'Activos' },
  { value: 'inactivos', label: 'Inactivos' },
  { value: 'todos', label: 'Todos' },
];

// Color del Badge según el estado procesal (usa los tonos de Badge.jsx)
const TONO_ESTADO_PROCESAL = {
  EN_TRAMITE: 'blue',
  EN_APELACION: 'yellow',
  SUSPENDIDO: 'gray',
  ARCHIVADO: 'gray',
  CONCLUIDO: 'green',
};

// Cantidad de expedientes por página
const LIMITE_POR_PAGINA = 10;

function ExpedientesListPage() {
  // --- Datos que devuelve el backend ---
  const [expedientes, setExpedientes] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);

  // --- Estado de la pantalla ---
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);

  // --- Filtros y paginación ---
  const [pagina, setPagina] = useState(1);
  const [filtroEstado, setFiltroEstado] = useState('activos');
  const [filtroFuero, setFiltroFuero] = useState('');
  const [filtroEstadoProcesal, setFiltroEstadoProcesal] = useState('');
  const [filtroAnio, setFiltroAnio] = useState('');

  // Búsqueda y juzgado: cada uno tiene DOS estados.
  // El "input" cambia con cada tecla; el "debounced" se actualiza
  // recién 400 ms después de que el usuario deja de escribir, y ese
  // es el que dispara la petición al backend.
  const [busquedaInput, setBusquedaInput] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [juzgadoInput, setJuzgadoInput] = useState('');
  const [juzgado, setJuzgado] = useState('');

  // ------------------------------------------
  // DEBOUNCE de búsqueda y juzgado.
  // Cada vez que el usuario tipea, se programa la actualización del
  // valor "real" a 400 ms. Si tipea de nuevo antes de que pase, el
  // return del efecto cancela el timer anterior. Al aplicarse un
  // cambio, se vuelve a la página 1.
  // ------------------------------------------
  useEffect(() => {
    const timer = setTimeout(() => {
      setBusqueda(busquedaInput);
      setJuzgado(juzgadoInput);
      setPagina(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [busquedaInput, juzgadoInput]);

  // ------------------------------------------
  // CARGA DE EXPEDIENTES
  // Se ejecuta al montar y cada vez que cambia algún filtro o la
  // página. Solo manda al backend los filtros que tienen valor.
  // ------------------------------------------
  useEffect(() => {
    async function cargarExpedientes() {
      setCargando(true);
      setError('');
      try {
        // params: axios arma el query string y omite lo undefined
        const respuesta = await api.get('/expedientes', {
          params: {
            estado: filtroEstado,
            fuero: filtroFuero || undefined,
            estadoProcesal: filtroEstadoProcesal || undefined,
            anio: filtroAnio || undefined,
            juzgado: juzgado || undefined,
            busqueda: busqueda || undefined,
            pagina,
            limite: LIMITE_POR_PAGINA,
          },
        });
        // El backend devuelve { datos, total, pagina, limite, totalPaginas }
        setExpedientes(respuesta.data.datos);
        setTotal(respuesta.data.total);
        setTotalPaginas(respuesta.data.totalPaginas);
      } catch (err) {
        setError('No se pudieron cargar los expedientes');
      } finally {
        setCargando(false);
      }
    }

    cargarExpedientes();
  }, [filtroEstado, filtroFuero, filtroEstadoProcesal, filtroAnio, juzgado, busqueda, pagina]);

  // Helper: cambia un filtro y vuelve a la página 1.
  // Sin esto, filtrar estando en la página 3 podría dejarte en una
  // página que ya no existe con los nuevos resultados.
  function cambiarFiltro(setter) {
    return (valor) => {
      setter(valor);
      setPagina(1);
    };
  }

  // Hay algún filtro aplicado (sirve para el mensaje de "sin resultados")
  const hayFiltros =
    filtroFuero || filtroEstadoProcesal || filtroAnio || juzgado || busqueda;

  // La columna Estado (activo/inactivo) solo aporta información cuando
  // se mezclan activos e inactivos en la misma vista.
  const mostrarColumnaEstado = filtroEstado === 'todos';

  return (
    <div>
      {/* --- Encabezado de la página: título + acción principal --- */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Expedientes</h1>
        <Button onClick={() => setMostrarModal(true)}>+ Nuevo expediente</Button>
      </div>

      {/* --- Filtro de estado: Activos / Inactivos / Todos --- */}
      <div className="mb-4 flex gap-2">
        {FILTROS_ESTADO.map((filtro) => (
          <button
            key={filtro.value}
            onClick={() => cambiarFiltro(setFiltroEstado)(filtro.value)}
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

      {/* --- Filtros: fuero, estado procesal, año y juzgado --- */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <SelectInput
          label="Fuero"
          value={filtroFuero}
          onChange={(e) => cambiarFiltro(setFiltroFuero)(e.target.value)}
          opciones={[{ value: '', label: 'Todos' }, ...OPCIONES_FUERO]}
        />
        <SelectInput
          label="Estado procesal"
          value={filtroEstadoProcesal}
          onChange={(e) => cambiarFiltro(setFiltroEstadoProcesal)(e.target.value)}
          opciones={[{ value: '', label: 'Todos' }, ...OPCIONES_ESTADO_PROCESAL]}
        />
        <Input
          label="Año"
          type="number"
          value={filtroAnio}
          onChange={(e) => cambiarFiltro(setFiltroAnio)(e.target.value)}
          placeholder="Ej: 2024"
        />
        <Input
          label="Juzgado"
          value={juzgadoInput}
          onChange={(e) => setJuzgadoInput(e.target.value)}
          placeholder="Buscar juzgado..."
        />
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <TablaContainer
        busqueda={busquedaInput}
        onBusquedaChange={setBusquedaInput}
        placeholder="Buscar N° expediente, carátula, cliente..."
        cantidad={total}
        unidad="expediente"
      >
        {cargando ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">Cargando expedientes...</p>
        ) : expedientes.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {hayFiltros || filtroEstado !== 'activos'
              ? 'No hay expedientes que coincidan con estos filtros.'
              : 'Todavía no hay expedientes activos cargados.'}
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs font-medium text-gray-500">
                <th className="px-5 py-3">N° / Año</th>
                <th className="px-5 py-3">Carátula</th>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Juzgado</th>
                <th className="px-5 py-3">Fuero</th>
                <th className="px-5 py-3">Estado procesal</th>
                {mostrarColumnaEstado && <th className="px-5 py-3">Estado</th>}
              </tr>
            </thead>
            <tbody>
              {expedientes.map((expediente) => (
                <tr
                  key={expediente.id}
                  className="border-t border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-5 py-3">
                    <Link
                      to={`/expedientes/${expediente.id}`}
                      className="font-medium text-gray-900 hover:underline"
                    >
                      {expediente.numeroExpediente}/{expediente.anio}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{expediente.caratula}</td>
                  <td className="px-5 py-3 text-gray-600">
                    {expediente.cliente?.nombreRazonSocial}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{expediente.juzgado}</td>
                  <td className="px-5 py-3 text-gray-600">{etiquetaFuero(expediente.fuero)}</td>
                  <td className="px-5 py-3">
                    <Badge tone={TONO_ESTADO_PROCESAL[expediente.estadoProcesal] || 'gray'}>
                      {etiquetaEstadoProcesal(expediente.estadoProcesal)}
                    </Badge>
                  </td>
                  {mostrarColumnaEstado && (
                    <td className="px-5 py-3">
                      <Badge tone={expediente.activo ? 'green' : 'gray'}>
                        {expediente.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TablaContainer>

      {/* --- Paginación: solo se muestra si hay más de una página --- */}
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

      {/* --- Modal de alta de expediente (overlay) --- */}
      {mostrarModal && (
        <ExpedienteFormModal onClose={() => setMostrarModal(false)} />
      )}
    </div>
  );
}

export default ExpedientesListPage;