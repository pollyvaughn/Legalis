// ============================================================
// ExpedienteFormModal.jsx
// Modal de alta de expediente (overlay sobre ExpedientesListPage).
// Misma lógica de ExpedienteCreatePage.jsx: el cliente se elige
// de un select con clientes ya existentes (no se puede crear
// cliente desde acá, es un flujo separado).
// A diferencia de ClienteFormModal, este SÍ navega al detalle
// tras crear (decisión: permite cargar partes procesales ahí mismo).
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import api from '../../api/axios';

export default function ExpedienteFormModal({ onClose }) {
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

  // Trae la lista de clientes para poblar el select, una sola vez al abrir el modal.
  useEffect(() => {
    async function cargarClientes() {
      try {
        const respuesta = await api.get('/clientes');
        setClientes(respuesta.data);
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

      // Al crear con éxito, cierra el modal y navega directo al detalle
      // del expediente recién creado (para cargarle partes procesales ahí mismo).
      onClose();
      navigate(`/expedientes/${respuesta.data.id}`);
    } catch (err) {
      const mensaje = err.response?.data?.error || 'No se pudo crear el expediente';
      setError(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  return (
    // --- Fondo oscuro semitransparente, clic afuera cierra el modal ---
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      {/* stopPropagation: evita que un clic DENTRO del modal lo cierre */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl"
      >
        {/* --- Header del modal --- */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Nuevo expediente</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        {/* --- Cuerpo del formulario --- */}
        {cargandoClientes ? (
          <p className="px-6 py-8 text-sm text-gray-500">Cargando clientes...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Cliente</label>
                <select
                  name="clienteId"
                  value={form.clienteId}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none"
                >
                  <option value="" disabled>Seleccionar cliente...</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombreRazonSocial}
                    </option>
                  ))}
                </select>
                {clientes.length === 0 && (
                  <p className="mt-1 text-xs text-gray-400">
                    No hay clientes cargados todavía. Creá uno primero desde el módulo de clientes.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  N° Expediente
                </label>
                <input
                  type="text"
                  name="numeroExpediente"
                  value={form.numeroExpediente}
                  onChange={handleChange}
                  required
                  placeholder="Ej: 45.892/2024"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Carátula</label>
                <input
                  type="text"
                  name="caratula"
                  value={form.caratula}
                  onChange={handleChange}
                  required
                  placeholder="Ej: García c/ Municipalidad s/ Daños"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Fuero</label>
                  <input
                    type="text"
                    name="fuero"
                    value={form.fuero}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Jurisdicción
                  </label>
                  <input
                    type="text"
                    name="jurisdiccion"
                    value={form.jurisdiccion}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Juzgado</label>
                  <input
                    type="text"
                    name="juzgado"
                    value={form.juzgado}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Secretaría
                  </label>
                  <input
                    type="text"
                    name="secretaria"
                    value={form.secretaria}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Objeto del juicio
                </label>
                <input
                  type="text"
                  name="objetoJuicio"
                  value={form.objetoJuicio}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Monto del juicio
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    name="montoJuicio"
                    value={form.montoJuicio}
                    onChange={handleChange}
                    placeholder="0"
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Unidad fiscal
                  </label>
                  <input
                    type="text"
                    name="unidadFiscal"
                    value={form.unidadFiscal}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            {/* --- Footer del modal --- */}
            <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {guardando ? 'Creando...' : 'Crear expediente'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}