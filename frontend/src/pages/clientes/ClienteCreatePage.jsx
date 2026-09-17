// ============================================
// CLIENTECREATEPAGE.JSX
// Formulario de alta de cliente. El selector de tipo (arriba)
// decide qué campos de la extensión mostrar debajo: cédula si
// es FISICA, tipo societario si es JURIDICA. Los campos base
// (nombre, ruc, email, etc.) son comunes a ambos tipos.
// ============================================

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';

function ClienteCreatePage() {
  const navigate = useNavigate();

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    tipo: 'FISICA',
    ruc: '',
    nombreRazonSocial: '',
    tipoAtencion: 'JUDICIAL',
    email: '',
    telefono: '',
    direccion: '',
    // Extensión física
    cedula: '',
    digitoVerificador: '',
    fechaNacimiento: '',
    // Extensión jurídica
    tipoSocietario: '',
    fechaConstitucion: '',
  });

  function handleChange(evento) {
    const { name, value } = evento.target;
    setForm((formAnterior) => ({ ...formAnterior, [name]: value }));
  }

  async function handleSubmit(evento) {
    evento.preventDefault();
    setError('');
    setGuardando(true);

    try {
      const respuesta = await api.post('/clientes', {
        ...form,
        digitoVerificador: form.digitoVerificador === '' ? undefined : form.digitoVerificador,
        fechaNacimiento: form.fechaNacimiento || undefined,
        fechaConstitucion: form.fechaConstitucion || undefined,
      });

      navigate(`/clientes/${respuesta.data.id}`);
    } catch (err) {
      const mensaje = err.response?.data?.error || 'No se pudo crear el cliente';
      setError(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <Link to="/clientes" className="text-sm text-blue-600 hover:underline">
        ← Volver a clientes
      </Link>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mt-4 max-w-2xl">
        <h1 className="text-xl font-semibold text-gray-800 mb-6">Nuevo cliente</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selector de tipo: decide qué campos de extensión mostrar debajo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de cliente
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, tipo: 'FISICA' }))}
                className={`flex-1 py-2 rounded-md text-sm font-medium border transition ${
                  form.tipo === 'FISICA'
                    ? 'bg-gray-800 text-white border-gray-800'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Persona Física
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, tipo: 'JURIDICA' }))}
                className={`flex-1 py-2 rounded-md text-sm font-medium border transition ${
                  form.tipo === 'JURIDICA'
                    ? 'bg-gray-800 text-white border-gray-800'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Persona Jurídica
              </button>
            </div>
          </div>

          {/* Campos comunes a ambos tipos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {form.tipo === 'FISICA' ? 'Nombre completo' : 'Razón social'}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              RUC
            </label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dirección
            </label>
            <input
              type="text"
              name="direccion"
              value={form.direccion}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Campos específicos de PERSONA FÍSICA */}
          {form.tipo === 'FISICA' && (
            <div className="border-t border-gray-100 pt-4 space-y-4">
              <p className="text-xs font-medium text-gray-400 uppercase">
                Datos de persona física
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cédula
                  </label>
                  <input
                    type="text"
                    name="cedula"
                    value={form.cedula}
                    onChange={handleChange}
                    required
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
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de nacimiento (opcional)
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

          {/* Campos específicos de PERSONA JURÍDICA */}
          {form.tipo === 'JURIDICA' && (
            <div className="border-t border-gray-100 pt-4 space-y-4">
              <p className="text-xs font-medium text-gray-400 uppercase">
                Datos de persona jurídica
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo societario (ej: SA, SRL)
                </label>
                <input
                  type="text"
                  name="tipoSocietario"
                  value={form.tipoSocietario}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de constitución (opcional)
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

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={guardando}
              className="bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-700 transition disabled:opacity-50"
            >
              {guardando ? 'Creando...' : 'Crear cliente'}
            </button>
            <Link
              to="/clientes"
              className="text-sm text-gray-500 hover:text-gray-800 px-4 py-2"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ClienteCreatePage;