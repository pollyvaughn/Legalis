// ============================================
// CLIENTEDETAILPAGE.JSX
// Muestra el detalle de un cliente y permite editarlo inline
// (form que aparece en la misma pantalla al clickear "Editar").
// El campo "tipo" NUNCA se muestra como editable: es una decisión
// de diseño (ver clientes.service.js) — si se cargó mal, se
// soft-deletea el cliente y se crea uno nuevo con el tipo correcto.
// ============================================

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../../api/axios';

function ClienteDetailPage() {
  const { id } = useParams();

  const [cliente, setCliente] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');

  async function cargarCliente() {
    try {
      const respuesta = await api.get(`/clientes/${id}`);
      setCliente(respuesta.data);
    } catch (err) {
      setError('No se pudo cargar el cliente');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarCliente();
  }, [id]);

  // ------------------------------------------
  // iniciarEdicion: precarga el form con los datos actuales
  // (base + extensión, según el tipo del cliente).
  // ------------------------------------------
  function iniciarEdicion() {
    setForm({
      ruc: cliente.ruc,
      nombreRazonSocial: cliente.nombreRazonSocial,
      tipoAtencion: cliente.tipoAtencion,
      email: cliente.email || '',
      telefono: cliente.telefono || '',
      direccion: cliente.direccion || '',
      // Extensión física
      cedula: cliente.personaFisica?.cedula || '',
      digitoVerificador: cliente.personaFisica?.digitoVerificador ?? '',
      fechaNacimiento: cliente.personaFisica?.fechaNacimiento?.slice(0, 10) || '',
      // Extensión jurídica
      tipoSocietario: cliente.personaJuridica?.tipoSocietario || '',
      fechaConstitucion: cliente.personaJuridica?.fechaConstitucion?.slice(0, 10) || '',
    });
    setErrorForm('');
    setEditando(true);
  }

  function handleChange(evento) {
    const { name, value } = evento.target;
    setForm((formAnterior) => ({ ...formAnterior, [name]: value }));
  }

  async function handleGuardar(evento) {
    evento.preventDefault();
    setErrorForm('');
    setGuardando(true);

    try {
      await api.put(`/clientes/${id}`, {
        ...form,
        digitoVerificador: form.digitoVerificador === '' ? null : form.digitoVerificador,
        fechaNacimiento: form.fechaNacimiento || null,
        fechaConstitucion: form.fechaConstitucion || null,
      });

      setEditando(false);
      await cargarCliente();
    } catch (err) {
      const mensaje = err.response?.data?.error || 'No se pudo guardar el cliente';
      setErrorForm(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return <p className="text-sm text-gray-500">Cargando cliente...</p>;
  }

  if (error || !cliente) {
    return <p className="text-sm text-red-600">{error || 'Cliente no encontrado'}</p>;
  }

  return (
    <div>
      <Link
        to="/clientes"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft size={16} strokeWidth={1.75} />
        Volver a clientes
      </Link>

      {/* --- Card principal: datos del cliente --- */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {cliente.nombreRazonSocial}
            </h1>
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                {cliente.tipo === 'FISICA' ? 'Persona física' : 'Persona jurídica'}
              </span>
              <span className="text-sm text-gray-500">RUC {cliente.ruc}</span>
            </div>
          </div>
          {!editando && (
            <button
              onClick={iniciarEdicion}
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Editar
            </button>
          )}
        </div>

        {!editando ? (
          // ------------------------------------------
          // VISTA DE SOLO LECTURA
          // ------------------------------------------
          <dl className="grid grid-cols-2 gap-x-8 gap-y-4 border-t border-gray-100 pt-5 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase text-gray-400">Tipo de atención</dt>
              <dd className="mt-1 text-gray-800">{cliente.tipoAtencion}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-400">Email</dt>
              <dd className="mt-1 text-gray-800">{cliente.email || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-400">Teléfono</dt>
              <dd className="mt-1 text-gray-800">{cliente.telefono || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-400">Dirección</dt>
              <dd className="mt-1 text-gray-800">{cliente.direccion || '—'}</dd>
            </div>

            {cliente.tipo === 'FISICA' && (
              <>
                <div>
                  <dt className="text-xs font-medium uppercase text-gray-400">Cédula</dt>
                  <dd className="mt-1 text-gray-800">{cliente.personaFisica?.cedula || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-gray-400">
                    Dígito verificador
                  </dt>
                  <dd className="mt-1 text-gray-800">
                    {cliente.personaFisica?.digitoVerificador ?? '—'}
                  </dd>
                </div>
              </>
            )}

            {cliente.tipo === 'JURIDICA' && (
              <div>
                <dt className="text-xs font-medium uppercase text-gray-400">Tipo societario</dt>
                <dd className="mt-1 text-gray-800">
                  {cliente.personaJuridica?.tipoSocietario || '—'}
                </dd>
              </div>
            )}
          </dl>
        ) : (
          // ------------------------------------------
          // FORM DE EDICIÓN
          // El tipo NUNCA se muestra como campo editable acá.
          // ------------------------------------------
          <form onSubmit={handleGuardar} className="space-y-4 border-t border-gray-100 pt-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {cliente.tipo === 'FISICA' ? 'Nombre completo' : 'Razón social'}
              </label>
              <input
                type="text"
                name="nombreRazonSocial"
                value={form.nombreRazonSocial}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">RUC</label>
                <input
                  type="text"
                  name="ruc"
                  value={form.ruc}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Tipo de atención
                </label>
                <select
                  name="tipoAtencion"
                  value={form.tipoAtencion}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none"
                >
                  <option value="JUDICIAL">Judicial</option>
                  <option value="EXTRAJUDICIAL">Extrajudicial</option>
                  <option value="AMBOS">Ambos</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Teléfono</label>
                <input
                  type="text"
                  name="telefono"
                  value={form.telefono}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Dirección</label>
              <input
                type="text"
                name="direccion"
                value={form.direccion}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none"
              />
            </div>

            {cliente.tipo === 'FISICA' && (
              <div className="space-y-4 border-t border-gray-100 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Cédula
                    </label>
                    <input
                      type="text"
                      name="cedula"
                      value={form.cedula}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Dígito verificador
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      name="digitoVerificador"
                      value={form.digitoVerificador}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Fecha de nacimiento
                  </label>
                  <input
                    type="date"
                    name="fechaNacimiento"
                    value={form.fechaNacimiento}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {cliente.tipo === 'JURIDICA' && (
              <div className="space-y-4 border-t border-gray-100 pt-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Tipo societario
                  </label>
                  <input
                    type="text"
                    name="tipoSocietario"
                    value={form.tipoSocietario}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Fecha de constitución
                  </label>
                  <input
                    type="date"
                    name="fechaConstitucion"
                    value={form.fechaConstitucion}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {errorForm && <p className="text-sm text-red-600">{errorForm}</p>}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={guardando}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button
                type="button"
                onClick={() => setEditando(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>

      {/* --- Expedientes de este cliente (vienen incluidos en el GET por id) --- */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Expedientes</h2>
        {cliente.expedientes.length === 0 ? (
          <p className="text-sm text-gray-500">Este cliente no tiene expedientes cargados.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {cliente.expedientes.map((exp) => (
              <li key={exp.id} className="py-3 first:pt-0 last:pb-0">
                <Link
                  to={`/expedientes/${exp.id}`}
                  className="text-sm font-medium text-gray-900 hover:underline"
                >
                  {exp.numeroExpediente}
                </Link>
                <p className="mt-0.5 text-xs text-gray-500">{exp.caratula}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default ClienteDetailPage;