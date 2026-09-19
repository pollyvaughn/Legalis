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
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { Input, SelectInput } from '../../components/ui/Input';

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
    representanteLegal: '', // NUEVO: quien representa a la empresa (opcional)
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
        representanteLegal: form.representanteLegal || undefined, // NUEVO
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
    <Modal title="Nuevo cliente" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 px-6 py-5">
          {/* Selector de tipo: decide qué campos de extensión mostrar debajo.
              Se mantiene como botones custom (no <Button>) porque acá
              el estado "seleccionado" pinta distinto que un botón normal. */}
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
          <Input
            label={form.tipo === 'FISICA' ? 'Nombre completo' : 'Razón social'}
            name="nombreRazonSocial"
            value={form.nombreRazonSocial}
            onChange={handleChange}
            required
            placeholder={form.tipo === 'FISICA' ? 'Ej: Ricardo García' : 'Ej: Del Norte SRL'}
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
              placeholder="correo@ejemplo.com"
            />
            <Input
              label="Teléfono"
              name="telefono"
              value={form.telefono}
              onChange={handleChange}
              placeholder="(011) 15-0000-0000"
            />
          </div>

          <Input
            label="Dirección"
            name="direccion"
            value={form.direccion}
            onChange={handleChange}
          />

          {/* Campos específicos de PERSONA FÍSICA */}
          {form.tipo === 'FISICA' && (
            <div className="space-y-4 border-t border-gray-100 pt-4">
              <p className="text-xs font-medium uppercase text-gray-400">
                Datos de persona física
              </p>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Cédula"
                  name="cedula"
                  value={form.cedula}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Dígito verificador"
                  type="text"
                  inputMode="numeric"
                  name="digitoVerificador"
                  value={form.digitoVerificador}
                  onChange={handleChange}
                  required
                />
              </div>

              <Input
                label="Fecha de nacimiento (opcional)"
                type="date"
                name="fechaNacimiento"
                value={form.fechaNacimiento}
                onChange={handleChange}
              />
            </div>
          )}

          {/* Campos específicos de PERSONA JURÍDICA */}
          {form.tipo === 'JURIDICA' && (
            <div className="space-y-4 border-t border-gray-100 pt-4">
              <p className="text-xs font-medium uppercase text-gray-400">
                Datos de persona jurídica
              </p>

              <Input
                label="Tipo societario (ej: SA, SRL)"
                name="tipoSocietario"
                value={form.tipoSocietario}
                onChange={handleChange}
                required
              />

              <Input
                label="Fecha de constitución (opcional)"
                type="date"
                name="fechaConstitucion"
                value={form.fechaConstitucion}
                onChange={handleChange}
              />

              {/* NUEVO: quien representa a la empresa en general (no es una parte procesal) */}
              <Input
                label="Representante legal (opcional)"
                name="representanteLegal"
                value={form.representanteLegal}
                onChange={handleChange}
                placeholder="Ej: Carlos Benítez"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar cliente'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}