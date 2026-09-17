// ============================================
// EXPEDIENTESLISTPAGE.JSX
// Pide la lista de expedientes activos al backend y la muestra
// en una tabla. Cada fila lleva al detalle de ese expediente.
// ============================================

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

function ExpedientesListPage() {
  const [expedientes, setExpedientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const { usuario, logout } = useAuth();

  // ------------------------------------------
  // useEffect con array vacío [] al final: se ejecuta UNA sola
  // vez, cuando el componente termina de montarse en pantalla.
  // Es el equivalente a "cuando cargue la página, hacé esto".
  // ------------------------------------------
  useEffect(() => {
    async function cargarExpedientes() {
      try {
        const respuesta = await api.get('/expedientes');
        setExpedientes(respuesta.data);
      } catch (err) {
        setError('No se pudieron cargar los expedientes');
      } finally {
        setCargando(false);
      }
    }

    cargarExpedientes();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Encabezado */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Expedientes</h1>
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
        <span className="text-gray-800 font-medium">Expedientes</span>
        <Link to="/clientes" className="text-blue-600 hover:underline">
          Clientes
        </Link>
      </div>

      {/* Botón de nuevo expediente */}
      <div className="mb-4">
        <Link
          to="/expedientes/nuevo"
          className="inline-block bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-700 transition"
        >
          + Nuevo expediente
        </Link>
      </div>

      {/* Estado: cargando */}
      {cargando && (
        <p className="text-gray-500 text-sm">Cargando expedientes...</p>
      )}

      {/* Estado: error */}
      {error && (
        <p className="text-red-600 text-sm">{error}</p>
      )}

      {/* Estado: sin expedientes */}
      {!cargando && !error && expedientes.length === 0 && (
        <p className="text-gray-500 text-sm">
          Todavía no hay expedientes cargados.
        </p>
      )}

      {/* Estado: tabla con datos */}
      {!cargando && !error && expedientes.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">N° Expediente</th>
                <th className="px-4 py-3">Carátula</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Fuero</th>
              </tr>
            </thead>
            <tbody>
              {expedientes.map((expediente) => (
                <tr
                  key={expediente.id}
                  className="border-t border-gray-100 hover:bg-gray-50"
                >
                  {/* Toda la fila es clickeable hacia el detalle */}
                  <td className="px-4 py-3">
                    <Link
                      to={`/expedientes/${expediente.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {expediente.numeroExpediente}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{expediente.caratula}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {expediente.cliente?.nombreRazonSocial}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{expediente.fuero}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ExpedientesListPage;