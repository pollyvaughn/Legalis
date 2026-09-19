// ============================================
// TIPOTRAMITEFORMMODAL.JSX
// Modal para crear o editar un trámite del catálogo.
//
// Props:
//   inicial      trámite a editar (null = alta nueva)
//   onClose      cierra el modal sin guardar
//   onGuardado   se llama con el trámite que devolvió el backend
// ============================================

import { useState } from 'react';
import api from '../../api/axios';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Input, Textarea } from '../ui/Input';

export default function TipoTramiteFormModal({ inicial, onClose, onGuardado }) {
  const editando = Boolean(inicial);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Si se edita, se precarga; descripcion puede venir null y el input necesita ''
  const [form, setForm] = useState({
    nombre: inicial?.nombre || '',
    descripcion: inicial?.descripcion || '',
  });

  // Un solo handler para todos los campos: usa el "name" de cada input
  function handleChange(evento) {
    const { name, value } = evento.target;
    setForm((formAnterior) => ({ ...formAnterior, [name]: value }));
  }

  // PUT si edita, POST si crea
  async function handleSubmit(evento) {
    evento.preventDefault();
    setError('');
    setGuardando(true);

    try {
      const respuesta = editando
        ? await api.put(`/tipos-tramite/${inicial.id}`, form)
        : await api.post('/tipos-tramite', form);
      // El padre cierra el modal y refresca la lista
      onGuardado(respuesta.data);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar el trámite');
      setGuardando(false);
    }
  }

  return (
    <Modal title={editando ? 'Editar trámite' : 'Nuevo trámite'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 px-6 py-5">
          <Input
            label="Nombre *"
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            placeholder="Ej: IVA general, Inscripción en el RUC"
            maxLength={120}
            required
          />

          <Textarea
            label="Descripción (opcional)"
            name="descripcion"
            value={form.descripcion}
            onChange={handleChange}
            rows={3}
            maxLength={300}
            placeholder="Ej: Declaración mensual del IVA"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar trámite'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}