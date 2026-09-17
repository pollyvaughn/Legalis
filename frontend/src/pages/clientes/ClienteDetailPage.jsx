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
    return <div className="p-8 text-gray-500 text-sm">Cargando cliente...</div>;
  }

  if (error || !cliente) {
    return <div className="p-8 text-red-600 text-sm">{error || 'Cliente no encontrado'}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <Link to="/clientes" className="text-sm text-blue-600 hover:underline">
        ← Volver a clientes
      </Link>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mt-4 mb-6 max-w-2xl">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">
              {cliente.nombreRazonSocial}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {cliente.tipo === 'FISICA' ? 'Persona Física' : 'Persona Jurídica'} · RUC {cliente.ruc}
            </p>
          </div>
          {!editando && (
            <button
              onClick={iniciarEdicion}
              className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-200 transition"
            >
              Editar
            </button>
          )}
        </div>

        {!editando ? (
          // ------------------------------------------
          // VISTA DE SOLO LECTURA
          // ------------------------------------------
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <dt className="text-gray-400">Tipo de atención</dt>
              <dd className="text-gray-700">{cliente.tipoAtencion}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Email</dt>
              <dd className="text-gray-700">{cliente.email || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Teléfono</dt>
              <dd className="text-gray-700">{cliente.telefono || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Dirección</dt>
              <dd className="text-gray-700">{cliente.direccion || '—'}</dd>
            </div>

            {cliente.tipo === 'FISICA' && (
              <>
                <div>
                  <dt className="text-gray-400">Cédula</dt>
                  <dd className="text-gray-700">{cliente.personaFisica?.cedula || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Dígito verificador</dt>
                  <dd className="text-gray-700">{cliente.personaFisica?.digitoVerificador ?? '—'}</dd>
                </div>
              </>
            )}

            {cliente.tipo === 'JURIDICA' && (
              <div>
                <dt className="text-gray-400">Tipo societario</dt>
                <dd className="text-gray-700">{cliente.personaJuridica?.tipoSocietario || '—'}</dd>
              </div>
            )}
          </dl>
        ) : (
          // ------------------------------------------
          // FORM DE EDICIÓN
          // El tipo NUNCA se muestra como campo editable acá.
          // ------------------------------------------
          <form onSubmit={handleGuardar} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {cliente.tipo === 'FISICA' ? 'Nombre completo' : 'Razón social'}
              </label>
              <input
                type="text"
                name="nombreRazonSocial"
                value={form.nombreRazonSocial}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RUC</label>
              <input
                type="text"
                name="ruc"
                value={form.ruc}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de atención
              </label>
              <select
                name="tipoAtencion"
                value={form.tipoAtencion}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="JUDICIAL">Judicial</option>
                <option value="EXTRAJUDICIAL">Extrajudicial</option>
                <option value="AMBOS">Ambos</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  type="text"
                  name="telefono"
                  value={form.telefono}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input
                type="text"
                name="direccion"
                value={form.direccion}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {cliente.tipo === 'FISICA' && (
              <div className="border-t border-gray-100 pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cédula</label>
                    <input
                      type="text"
                      name="cedula"
                      value={form.cedula}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dígito verificador
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      name="digitoVerificador"
                      value={form.digitoVerificador}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de nacimiento
                  </label>
                  <input
                    type="date"
                    name="fechaNacimiento"
                    value={form.fechaNacimiento}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {cliente.tipo === 'JURIDICA' && (
              <div className="border-t border-gray-100 pt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo societario
                  </label>
                  <input
                    type="text"
                    name="tipoSocietario"
                    value={form.tipoSocietario}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de constitución
                  </label>
                  <input
                    type="date"
                    name="fechaConstitucion"
                    value={form.fechaConstitucion}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {errorForm && <p className="text-sm text-red-600">{errorForm}</p>}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={guardando}
                className="bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-700 transition disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button
                type="button"
                onClick={() => setEditando(false)}
                className="text-sm text-gray-500 hover:text-gray-800 px-4 py-2"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Expedientes de este cliente (vienen incluidos en el GET por id) */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Expedientes</h2>
        {cliente.expedientes.length === 0 ? (
          <p className="text-gray-500 text-sm">Este cliente no tiene expedientes cargados.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {cliente.expedientes.map((exp) => (
              <li key={exp.id} className="py-2">
                <Link
                  to={`/expedientes/${exp.id}`}
                  className="text-sm text-blue-600 hover:underline font-medium"
                >
                  {exp.numeroExpediente}
                </Link>
                <p className="text-xs text-gray-500">{exp.caratula}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default ClienteDetailPage;