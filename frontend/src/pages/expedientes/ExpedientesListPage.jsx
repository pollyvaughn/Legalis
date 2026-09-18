// ============================================
// EXPEDIENTESLISTPAGE.JSX
// Pide la lista de expedientes al backend y la muestra en una
// tabla estilo Legalis. Por defecto solo muestra activos; el
// filtro Activos/Inactivos/Todos permite ver también los
// inactivados. La columna Estado (pill) solo se muestra en la
// vista "Todos", donde sí aporta información. Cada fila lleva al
// detalle de ese expediente. El botón "+ Nuevo expediente" abre
// ExpedienteFormModal, que al crear navega directo al detalle.
// ============================================

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import ExpedienteFormModal from './ExpedienteFormModal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import TablaContainer from '../../components/ui/TablaContainer';
import { etiquetaFuero } from '../../constants/fueros';

// Opciones del filtro de estado. "activos" es el default porque
// mantiene el comportamiento histórico del sistema.
const FILTROS_ESTADO = [
  { value: 'activos', label: 'Activos' },
  { value: 'inactivos', label: 'Inactivos' },
  { value: 'todos', label: 'Todos' },
];

function ExpedientesListPage() {
  const [expedientes, setExpedientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState(''); // filtro de texto local, no pega al backend todavía
  const [filtroEstado, setFiltroEstado] = useState('activos');
  const [mostrarModal, setMostrarModal] = useState(false);

  // ------------------------------------------
  // Trae los expedientes del backend. Siempre pide TODOS
  // (incluirInactivos=true) y el filtrado por estado se hace acá
  // en memoria, según filtroEstado — mismo criterio que Clientes:
  // evita depender de un query param nuevo para algo de bajo volumen.
  // ------------------------------------------
  async function cargarExpedientes() {
    try {
      const respuesta = await api.get('/expedientes?incluirInactivos=true');
      setExpedientes(respuesta.data);
    } catch (err) {
      setError('No se pudieron cargar los expedientes');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarExpedientes();
  }, []);

  // Aplica primero el filtro de estado, y sobre ese resultado el
  // filtro de texto (más caro, recorre varios campos).
  const expedientesPorEstado = expedientes.filter((exp) => {
    if (filtroEstado === 'activos') return exp.activo;
    if (filtroEstado === 'inactivos') return !exp.activo;
    return true; // 'todos'
  });

  const expedientesFiltrados = expedientesPorEstado.filter((exp) => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return true;
    return (
      exp.numeroExpediente?.toLowerCase().includes(texto) ||
      exp.caratula?.toLowerCase().includes(texto) ||
      exp.cliente?.nombreRazonSocial?.toLowerCase().includes(texto)
    );
  });

  // La columna Estado solo aporta información cuando se están
  // mezclando activos e inactivos en la misma vista.
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

      {cargando && <p className="text-sm text-gray-500">Cargando expedientes...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!cargando && !error && (
        <TablaContainer
          busqueda={busqueda}
          onBusquedaChange={setBusqueda}
          placeholder="Buscar N° expediente, carátula, cliente..."
          cantidad={expedientesFiltrados.length}
          unidad="expediente"
        >
          {expedientesFiltrados.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-500">
              {filtroEstado === 'activos'
                ? 'Todavía no hay expedientes activos cargados.'
                : 'No hay expedientes que coincidan con este filtro.'}
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs font-medium text-gray-500">
                  <th className="px-5 py-3">N° Expediente</th>
                  <th className="px-5 py-3">Carátula</th>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">Fuero</th>
                  {mostrarColumnaEstado && <th className="px-5 py-3">Estado</th>}
                </tr>
              </thead>
              <tbody>
                {expedientesFiltrados.map((expediente) => (
                  <tr
                    key={expediente.id}
                    className="border-t border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-5 py-3">
                      <Link
                        to={`/expedientes/${expediente.id}`}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {expediente.numeroExpediente}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{expediente.caratula}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {expediente.cliente?.nombreRazonSocial}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{etiquetaFuero(expediente.fuero)}</td>
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
      )}

      {/* --- Modal de alta de expediente (overlay) --- */}
      {mostrarModal && (
        <ExpedienteFormModal onClose={() => setMostrarModal(false)} />
      )}
    </div>
  );
}

export default ExpedientesListPage;