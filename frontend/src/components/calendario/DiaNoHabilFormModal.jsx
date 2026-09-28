// ============================================================
// DiaNoHabilFormModal.jsx
// Modal para crear o editar un día no hábil (feriado, asueto
// local, feria judicial). fechaHasta es opcional: si se deja
// vacío, es un solo día (RN-23).
//
// Props:
//   inicial      registro a editar (null = alta nueva)
//   onClose      cierra el modal sin guardar
//   onGuardado   se llama con el registro que devolvió el backend
// ============================================================

import { useState } from 'react';
import api from '../../api/axios';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Input } from '../ui/Input';

// Fecha ISO completa → yyyy-mm-dd, formato que espera <input type="date">
function aInputDate(fechaIso) {
  if (!fechaIso) return '';
  return new Date(fechaIso).toISOString().slice(0, 10);
}

export default function DiaNoHabilFormModal({ inicial, onClose, onGuardado }) {
  const editando = Boolean(inicial);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    fechaDesde: aInputDate(inicial?.fechaDesde) || '',
    fechaHasta: aInputDate(inicial?.fechaHasta) || '',
    descripcion: inicial?.descripcion || '',
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
      const datos = { ...form, fechaHasta: form.fechaHasta || null };
      const respuesta = editando
        ? await api.put(`/dias-no-habiles/${inicial.id}`, datos)
        : await api.post('/dias-no-habiles', datos);
      onGuardado(respuesta.data);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar el día no hábil');
      setGuardando(false);
    }
  }

  return (
    <Modal title={editando ? 'Editar día no hábil' : 'Nuevo día no hábil'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Desde *"
              type="date"
              name="fechaDesde"
              value={form.fechaDesde}
              onChange={handleChange}
              required
            />
            <Input
              label="Hasta (opcional)"
              type="date"
              name="fechaHasta"
              value={form.fechaHasta}
              onChange={handleChange}
              min={form.fechaDesde || undefined}
            />
          </div>
          <p className="-mt-2 text-xs text-gray-400">
            Dejá "Hasta" vacío si es un solo día. Completalo para cargar un rango (ej: feria judicial).
          </p>

          <Input
            label="Descripción *"
            name="descripcion"
            value={form.descripcion}
            onChange={handleChange}
            placeholder="Ej: Feriado nacional, Asueto local Encarnación, Feria judicial de enero"
            maxLength={200}
            required
          />

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}