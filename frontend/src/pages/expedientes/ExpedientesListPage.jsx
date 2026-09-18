// ============================================
// EXPEDIENTESLISTPAGE.JSX
// Pide la lista de expedientes activos al backend y la muestra
// en una tabla estilo Legalis. Cada fila lleva al detalle de
// ese expediente. El botón "+ Nuevo expediente" abre
// ExpedienteFormModal, que al crear navega directo al detalle.
// ============================================

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import api from '../../api/axios';
import ExpedienteFormModal from './ExpedienteFormModal';

function ExpedientesListPage() {
  const [expedientes, setExpedientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState(''); // filtro de texto local, no pega al backend todavía
  const [mostrarModal, setMostrarModal] = useState(false);

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

  // Filtro simple por número, carátula o cliente, en memoria (client-side).
  const expedientesFiltrados = expedientes.filter((exp) => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return true;
    return (
      exp.numeroExpediente?.toLowerCase().includes(texto) ||
      exp.caratula?.toLowerCase().includes(texto) ||
      exp.cliente?.nombreRazonSocial?.toLowerCase().includes(texto)
    );
  });

  return (
    <div>
      {/* --- Encabezado de la página: título + acción principal --- */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Expedientes</h1>
        <button
          onClick={() => setMostrarModal(true)}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          + Nuevo expediente
        </button>
      </div>

      {cargando && <p className="text-sm text-gray-500">Cargando expedientes...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!cargando && !error && (
        <div className="rounded-xl border border-gray-200 bg-white">
          {/* --- Barra de búsqueda + contador --- */}
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="relative w-80">
              <Search
                size={16}
                strokeWidth={1.75}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar N° expediente, carátula, cliente..."
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none"
              />
            </div>
            <span className="text-sm text-gray-500">
              {expedientesFiltrados.length} expediente{expedientesFiltrados.length !== 1 && 's'}
            </span>
          </div>

          {expedientesFiltrados.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-500">
              Todavía no hay expedientes cargados.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs font-medium text-gray-500">
                  <th className="px-5 py-3">N° Expediente</th>
                  <th className="px-5 py-3">Carátula</th>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">Fuero</th>
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
                    <td className="px-5 py-3 text-gray-600">{expediente.fuero || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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