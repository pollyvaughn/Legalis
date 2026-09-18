// ============================================================
// ClienteFormModal.jsx
// Modal de alta de cliente (overlay sobre ClientesListPage).
// Misma lógica de ClienteCreatePage.jsx, pero como componente
// controlado: recibe onClose (cerrar sin guardar) y onCreado
// (avisar a la lista que refresque tras un POST exitoso).
// El selector de tipo decide qué campos de extensión mostrar:
// cédula si es FISICA, tipo societario si es JURIDICA.
// ============================================

import { useState } from 'react';
import { X } from 'lucide-react';
import api from '../../api/axios';

export default function ClienteFormModal({ onClose, onCreado }) {
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

      // Avisa a ClientesListPage que hay un cliente nuevo (refresca la tabla)
      // y cierra el modal. A diferencia de ClienteCreatePage, NO navega
      // al detalle: el usuario se queda en la lista.
      onCreado(respuesta.data);
    } catch (err) {
      const mensaje = err.response?.data?.error || 'No se pudo crear el cliente';
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
          <h2 className="text-lg font-semibold text-gray-900">Nuevo cliente</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        {/* --- Cuerpo del formulario --- */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 py-5">
            {/* Selector de tipo: decide qué campos de extensión mostrar debajo */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Tipo de cliente
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, tipo: 'FISICA' }))}
                  className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
                    form.tipo === 'FISICA'
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Persona física
                </button>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, tipo: 'JURIDICA' }))}
                  className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
                    form.tipo === 'JURIDICA'
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Persona jurídica
                </button>
              </div>
            </div>

            {/* Campos comunes a ambos tipos */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {form.tipo === 'FISICA' ? 'Nombre completo' : 'Razón social'}
              </label>
              <input
                type="text"
                name="nombreRazonSocial"
                value={form.nombreRazonSocial}
                onChange={handleChange}
                required
                placeholder={form.tipo === 'FISICA' ? 'Ej: Ricardo García' : 'Ej: Del Norte SRL'}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none"
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
                  placeholder="correo@ejemplo.com"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Teléfono</label>
                <input
                  type="text"
                  name="telefono"
                  value={form.telefono}
                  onChange={handleChange}
                  placeholder="(011) 15-0000-0000"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none"
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

            {/* Campos específicos de PERSONA FÍSICA */}
            {form.tipo === 'FISICA' && (
              <div className="space-y-4 border-t border-gray-100 pt-4">
                <p className="text-xs font-medium uppercase text-gray-400">
                  Datos de persona física
                </p>

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
                      required
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
                      required
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Fecha de nacimiento (opcional)
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

            {/* Campos específicos de PERSONA JURÍDICA */}
            {form.tipo === 'JURIDICA' && (
              <div className="space-y-4 border-t border-gray-100 pt-4">
                <p className="text-xs font-medium uppercase text-gray-400">
                  Datos de persona jurídica
                </p>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Tipo societario (ej: SA, SRL)
                  </label>
                  <input
                    type="text"
                    name="tipoSocietario"
                    value={form.tipoSocietario}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Fecha de constitución (opcional)
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
              {guardando ? 'Guardando...' : 'Guardar cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}