// ============================================================
// TipoPlazoFormModal.jsx
// Modal para crear o editar un tipo de plazo del catálogo
// (ej. "Contestación de demanda civil", 18 días hábiles). Mismo
// patrón que TipoTramiteFormModal (Módulo 1.3).
//
// Props:
//   inicial      tipo de plazo a editar (null = alta nueva)
//   onClose      cierra el modal sin guardar
//   onGuardado   se llama con el registro que devolvió el backend
// ============================================================

import { useState } from 'react';
import api from '../../api/axios';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Input, SelectInput } from '../ui/Input';
import { OPCIONES_FUERO_APLICABLE, OPCIONES_MODALIDAD_PLAZO } from '../../constants/tiposPlazo';

export default function TipoPlazoFormModal({ inicial, onClose, onGuardado }) {
  const editando = Boolean(inicial);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    nombre: inicial?.nombre || '',
    fuero: inicial?.fuero || 'TODOS',
    diasDefault: inicial?.diasDefault ?? '',
    modalidadDefault: inicial?.modalidadDefault || 'HABILES',
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
      const respuesta = editando
        ? await api.put(`/tipos-plazo/${inicial.id}`, form)
        : await api.post('/tipos-plazo', form);
      onGuardado(respuesta.data);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar el tipo de plazo');
      setGuardando(false);
    }
  }

  return (
    <Modal title={editando ? 'Editar tipo de plazo' : 'Nuevo tipo de plazo'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 px-6 py-5">
          <Input
            label="Nombre *"
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            placeholder="Ej: Contestación de demanda civil"
            maxLength={150}
            required
          />

          <SelectInput
            label="Fuero"
            name="fuero"
            value={form.fuero}
            onChange={handleChange}
            opciones={OPCIONES_FUERO_APLICABLE}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Días sugeridos *"
              type="number"
              min="1"
              name="diasDefault"
              value={form.diasDefault}
              onChange={handleChange}
              required
            />
            <SelectInput
              label="Modalidad sugerida"
              name="modalidadDefault"
              value={form.modalidadDefault}
              onChange={handleChange}
              opciones={OPCIONES_MODALIDAD_PLAZO}
            />
          </div>
          <p className="-mt-2 text-xs text-gray-400">
            Estos valores son solo una sugerencia: al cargar un plazo concreto, se pueden cambiar.
          </p>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar tipo de plazo'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}