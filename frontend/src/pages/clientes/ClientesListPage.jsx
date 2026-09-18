// ============================================
// CLIENTESLISTPAGE.JSX
// Lista de clientes activos, en tabla estilo Legalis.
// Cada fila lleva al detalle de ese cliente (ClienteDetailPage,
// donde se ven los expedientes asociados completos).
// El botón "+ Nuevo cliente" abre ClienteFormModal como overlay;
// al guardar, se refresca la lista sin salir de esta página.
// ============================================

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import ClienteFormModal from './ClienteFormModal';
import Button from '../../components/ui/Button';
import TablaContainer from '../../components/ui/TablaContainer';

// Genera las iniciales para el avatar circular de cada fila, ej: "Ricardo García" -> "R"
function inicial(nombre) {
  return nombre?.trim()?.[0]?.toUpperCase() || '?';
}

function ClientesListPage() {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState(''); // filtro de texto local, no pega al backend todavía
  const [mostrarModal, setMostrarModal] = useState(false);

  // Función compartida entre la carga inicial y el refresco post-creación
  async function cargarClientes() {
    try {
      const respuesta = await api.get('/clientes');
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

  // Filtro simple por nombre/RUC/email, en memoria (client-side).
  // Nota: si la lista crece mucho, esto debería moverse a un filtro de backend (?buscar=).
  const clientesFiltrados = clientes.filter((c) => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return true;
    return (
      c.nombreRazonSocial?.toLowerCase().includes(texto) ||
      c.ruc?.toLowerCase().includes(texto) ||
      c.email?.toLowerCase().includes(texto)
    );
  });

  return (
    <div>
      {/* --- Encabezado de la página: título + acción principal --- */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Clientes</h1>
        <Button onClick={() => setMostrarModal(true)}>+ Nuevo cliente</Button>
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
              Todavía no hay clientes cargados.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs font-medium text-gray-500">
                  <th className="px-5 py-3">Nombre</th>
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3">RUC</th>
                  <th className="px-5 py-3">Email</th>
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