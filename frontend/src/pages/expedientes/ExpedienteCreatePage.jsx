// ============================================
// EXPEDIENTECREATEPAGE.JSX
// Formulario de alta de un expediente nuevo. El cliente se
// elige de un select con los clientes ya existentes — no se
// puede crear un cliente desde acá (decisión ya tomada: son
// flujos separados, ver el módulo de clientes para altas).
// ============================================

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';

function ExpedienteCreatePage() {
  const navigate = useNavigate();

  const [clientes, setClientes] = useState([]);
  const [cargandoClientes, setCargandoClientes] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    clienteId: '',
    numeroExpediente: '',
    caratula: '',
    fuero: '',
    jurisdiccion: '',
    juzgado: '',
    secretaria: '',
    objetoJuicio: '',
    montoJuicio: '',
    unidadFiscal: '',
  });

  // ------------------------------------------
  // Trae la lista de clientes para poblar el select. Se pide
  // una sola vez al entrar a la pantalla.
  // ------------------------------------------
  useEffect(() => {
    async function cargarClientes() {
      try {
        const respuesta = await api.get('/clientes');
        setClientes(respuesta.data);
      // eslint-disable-next-line no-unused-vars
      } catch (err) {
        setError('No se pudieron cargar los clientes');
      } finally {
        setCargandoClientes(false);
      }
    }

    cargarClientes();
  }, []);

  function handleChange(evento) {
    const { name, value } = evento.target;
    setForm((formAnterior) => ({ ...formAnterior, [name]: value }));
  }

  async function handleSubmit(evento) {
    evento.preventDefault();
    setError('');
    setGuardando(true);

    try {
      const respuesta = await api.post('/expedientes', {
        ...form,
        montoJuicio: form.montoJuicio === '' ? null : form.montoJuicio,
      });

      // Al crear con éxito, va directo al detalle del expediente
      // recién creado (para poder cargarle partes procesales ahí mismo)
      navigate(`/expedientes/${respuesta.data.id}`);
    } catch (err) {
      const mensaje = err.response?.data?.error || 'No se pudo crear el expediente';
      setError(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <Link to="/expedientes" className="text-sm text-blue-600 hover:underline">
        ← Volver a expedientes
      </Link>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mt-4 max-w-2xl">
        <h1 className="text-xl font-semibold text-gray-800 mb-6">Nuevo expediente</h1>

        {cargandoClientes ? (
          <p className="text-gray-500 text-sm">Cargando clientes...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cliente
              </label>
              <select
                name="clienteId"
                value={form.clienteId}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>Seleccionar cliente...</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombreRazonSocial}
                  </option>
                ))}
              </select>
              {clientes.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  No hay clientes cargados todavía. Creá uno primero desde el módulo de clientes.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                N° Expediente
              </label>
              <input
                type="text"
                name="numeroExpediente"
                value={form.numeroExpediente}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Carátula
              </label>
              <input
                type="text"
                name="caratula"
                value={form.caratula}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fuero
                </label>
                <input
                  type="text"
                  name="fuero"
                  value={form.fuero}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jurisdicción
                </label>
                <input
                  type="text"
                  name="jurisdiccion"
                  value={form.jurisdiccion}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Juzgado
                </label>
                <input
                  type="text"
                  name="juzgado"
                  value={form.juzgado}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Secretaría
                </label>
                <input
                  type="text"
                  name="secretaria"
                  value={form.secretaria}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Objeto del juicio
              </label>
              <input
                type="text"
                name="objetoJuicio"
                value={form.objetoJuicio}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto del juicio
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  name="montoJuicio"
                  value={form.montoJuicio}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unidad fiscal
                </label>
                <input
                  type="text"
                  name="unidadFiscal"
                  value={form.unidadFiscal}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={guardando}
                className="bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-700 transition disabled:opacity-50"
              >
                {guardando ? 'Creando...' : 'Crear expediente'}
              </button>
              <Link
                to="/expedientes"
                className="text-sm text-gray-500 hover:text-gray-800 px-4 py-2"
              >
                Cancelar
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ExpedienteCreatePage;