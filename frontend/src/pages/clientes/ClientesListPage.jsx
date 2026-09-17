// ============================================
// CLIENTESLISTPAGE.JSX
// Lista de clientes activos, en tabla. Cada fila lleva al
// detalle de ese cliente. Mismo patrón que ExpedientesListPage.
// ============================================

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

function ClientesListPage() {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const { usuario, logout } = useAuth();

  useEffect(() => {
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

    cargarClientes();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Clientes</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {usuario?.nombre} ({usuario?.rol})
          </span>
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-gray-800 underline"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Navegación simple entre módulos, mientras no hay un layout con sidebar */}
      <div className="mb-4 flex gap-4 text-sm">
        <Link to="/expedientes" className="text-blue-600 hover:underline">
          Expedientes
        </Link>
        <span className="text-gray-800 font-medium">Clientes</span>
      </div>

      <div className="mb-4">
        <Link
          to="/clientes/nuevo"
          className="inline-block bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-700 transition"
        >
          + Nuevo cliente
        </Link>
      </div>

      {cargando && <p className="text-gray-500 text-sm">Cargando clientes...</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}

      {!cargando && !error && clientes.length === 0 && (
        <p className="text-gray-500 text-sm">Todavía no hay clientes cargados.</p>
      )}

      {!cargando && !error && clientes.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Nombre / Razón social</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">RUC</th>
                <th className="px-4 py-3">Email</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((cliente) => (
                <tr key={cliente.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/clientes/${cliente.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {cliente.nombreRazonSocial}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {cliente.tipo === 'FISICA' ? 'Física' : 'Jurídica'}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{cliente.ruc}</td>
                  <td className="px-4 py-3 text-gray-700">{cliente.email || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ClientesListPage;