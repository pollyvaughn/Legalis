// ============================================
// CLIENTESLISTPAGE.JSX
// Lista de clientes, en tabla estilo Legalis. Por defecto solo
// muestra activos (mismo comportamiento de siempre); el filtro
// Activos/Inactivos/Todos permite ver también los inactivados.
// La columna Estado (pill) solo se muestra en la vista "Todos",
// donde sí aporta información (en Activos/Inactivos sería
// redundante, ya que todas las filas dirían lo mismo).
// Cada fila lleva al detalle de ese cliente. El botón
// "+ Nuevo cliente" abre ClienteFormModal como overlay; al
// guardar, se refresca la lista sin salir de esta página.
// ============================================

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import ClienteFormModal from './ClienteFormModal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import TablaContainer from '../../components/ui/TablaContainer';

// Genera las iniciales para el avatar circular de cada fila, ej: "Ricardo García" -> "R"
function inicial(nombre) {
  return nombre?.trim()?.[0]?.toUpperCase() || '?';
}

// Opciones del filtro de estado. "activos" es el default porque
// mantiene el comportamiento histórico del sistema.
const FILTROS_ESTADO = [
  { value: 'activos', label: 'Activos' },
  { value: 'inactivos', label: 'Inactivos' },
  { value: 'todos', label: 'Todos' },
];

function ClientesListPage() {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState(''); // filtro de texto local, no pega al backend todavía
  const [filtroEstado, setFiltroEstado] = useState('activos');
  const [mostrarModal, setMostrarModal] = useState(false);

  // ------------------------------------------
  // Trae los clientes del backend. Siempre pide TODOS
  // (incluirInactivos=true) y el filtrado por estado se hace acá
  // en memoria, según filtroEstado — evita depender de un query
  // param nuevo en el backend para algo que hoy es bajo volumen.
  // ------------------------------------------
  async function cargarClientes() {
    try {
      const respuesta = await api.get('/clientes?incluirInactivos=true');
      setClientes(respuesta.data);
    } catch (err) {
      setError('No se pudieron cargar los clientes');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarClientes();
  }, []);

  // Aplica primero el filtro de estado, y sobre ese resultado el
  // filtro de texto — en ese orden, porque el de texto es más caro
  // (recorre varios campos) y conviene aplicarlo sobre menos filas.
  const clientesPorEstado = clientes.filter((c) => {
    if (filtroEstado === 'activos') return c.activo;
    if (filtroEstado === 'inactivos') return !c.activo;
    return true; // 'todos'
  });

  const clientesFiltrados = clientesPorEstado.filter((c) => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return true;
    return (
      c.nombreRazonSocial?.toLowerCase().includes(texto) ||
      c.ruc?.toLowerCase().includes(texto) ||
      c.email?.toLowerCase().includes(texto)
    );
  });

  // La columna Estado solo aporta información cuando se están
  // mezclando activos e inactivos en la misma vista.
  const mostrarColumnaEstado = filtroEstado === 'todos';

  return (
    <div>
      {/* --- Encabezado de la página: título + acción principal --- */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Clientes</h1>
        <Button onClick={() => setMostrarModal(true)}>+ Nuevo cliente</Button>
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

      {cargando && <p className="text-sm text-gray-500">Cargando clientes...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!cargando && !error && (
        <TablaContainer
          busqueda={busqueda}
          onBusquedaChange={setBusqueda}
          placeholder="Buscar cliente, email, RUC..."
          cantidad={clientesFiltrados.length}
          unidad="cliente"
        >
          {clientesFiltrados.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-500">
              {filtroEstado === 'activos'
                ? 'Todavía no hay clientes activos cargados.'
                : 'No hay clientes que coincidan con este filtro.'}
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs font-medium text-gray-500">
                  <th className="px-5 py-3">Nombre</th>
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3">RUC</th>
                  <th className="px-5 py-3">Email</th>
                  {mostrarColumnaEstado && <th className="px-5 py-3">Estado</th>}
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados.map((cliente) => (
                  <tr
                    key={cliente.id}
                    className="border-t border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-5 py-3">
                      <Link
                        to={`/clientes/${cliente.id}`}
                        className="flex items-center gap-3 font-medium text-gray-900"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                          {inicial(cliente.nombreRazonSocial)}
                        </span>
                        {cliente.nombreRazonSocial}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {cliente.tipo === 'FISICA' ? 'Persona física' : 'Persona jurídica'}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{cliente.ruc}</td>
                    <td className="px-5 py-3 text-gray-600">{cliente.email || '—'}</td>
                    {mostrarColumnaEstado && (
                      <td className="px-5 py-3">
                        <Badge tone={cliente.activo ? 'green' : 'gray'}>
                          {cliente.activo ? 'Activo' : 'Inactivo'}
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

      {/* --- Modal de alta de cliente (overlay) --- */}
      {mostrarModal && (
        <ClienteFormModal
          onClose={() => setMostrarModal(false)}
          onCreado={() => {
            setMostrarModal(false);
            cargarClientes();
          }}
        />
      )}
    </div>
  );
}

export default ClientesListPage;