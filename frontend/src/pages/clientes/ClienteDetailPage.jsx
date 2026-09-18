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
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Input, SelectInput } from '../../components/ui/Input';

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
              <Badge tone="gray">
                {cliente.tipo === 'FISICA' ? 'Persona física' : 'Persona jurídica'}
              </Badge>
              <span className="text-sm text-gray-500">RUC {cliente.ruc}</span>
            </div>
          </div>
          {!editando && (
            <Button variant="secondary" size="sm" onClick={iniciarEdicion}>
              Editar
            </Button>
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
            <Input
              label={cliente.tipo === 'FISICA' ? 'Nombre completo' : 'Razón social'}
              name="nombreRazonSocial"
              value={form.nombreRazonSocial}
              onChange={handleChange}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input label="RUC" name="ruc" value={form.ruc} onChange={handleChange} required />
              <SelectInput
                label="Tipo de atención"
                name="tipoAtencion"
                value={form.tipoAtencion}
                onChange={handleChange}
                opciones={[
                  { value: 'JUDICIAL', label: 'Judicial' },
                  { value: 'EXTRAJUDICIAL', label: 'Extrajudicial' },
                  { value: 'AMBOS', label: 'Ambos' },
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
              />
              <Input
                label="Teléfono"
                name="telefono"
                value={form.telefono}
                onChange={handleChange}
              />
            </div>

            <Input
              label="Dirección"
              name="direccion"
              value={form.direccion}
              onChange={handleChange}
            />

            {cliente.tipo === 'FISICA' && (
              <div className="space-y-4 border-t border-gray-100 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Cédula"
                    name="cedula"
                    value={form.cedula}
                    onChange={handleChange}
                  />
                  <Input
                    label="Dígito verificador"
                    type="text"
                    inputMode="numeric"
                    name="digitoVerificador"
                    value={form.digitoVerificador}
                    onChange={handleChange}
                  />
                </div>
                <Input
                  label="Fecha de nacimiento"
                  type="date"
                  name="fechaNacimiento"
                  value={form.fechaNacimiento}
                  onChange={handleChange}
                />
              </div>
            )}

            {cliente.tipo === 'JURIDICA' && (
              <div className="space-y-4 border-t border-gray-100 pt-4">
                <Input
                  label="Tipo societario"
                  name="tipoSocietario"
                  value={form.tipoSocietario}
                  onChange={handleChange}
                />
                <Input
                  label="Fecha de constitución"
                  type="date"
                  name="fechaConstitucion"
                  value={form.fechaConstitucion}
                  onChange={handleChange}
                />
              </div>
            )}

            {errorForm && <p className="text-sm text-red-600">{errorForm}</p>}

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setEditando(false)}>
                Cancelar
              </Button>
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