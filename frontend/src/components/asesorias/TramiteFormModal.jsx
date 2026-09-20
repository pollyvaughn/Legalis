// ============================================
// TRAMITEFORMMODAL.JSX
// Modal para cargar un trámite ÚNICO (puntual): se elige cliente,
// trámite del catálogo y se escribe la fecha límite a mano.
// (Los periódicos no se cargan uno por uno: los genera la obligación.)
//
// Props:
//   clientes / tipos  listas [{ value, label }] para los selects
//   onClose           cierra sin guardar
//   onGuardado        se llama con el trámite creado
// ============================================

import { useState } from 'react';
import api from '../../api/axios';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Input, SelectInput, Textarea } from '../ui/Input';

export default function TramiteFormModal({ clientes, tipos, onClose, onGuardado }) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    clienteId: '',
    tipoTramiteId: '',
    fechaVencimiento: '',
    descripcion: '',
  });

  // Un solo handler para todos los campos: usa el "name" de cada input
  function handleChange(evento) {
    const { name, value } = evento.target;
    setForm((formAnterior) => ({ ...formAnterior, [name]: value }));
  }

  async function handleSubmit(evento) {
    evento.preventDefault();
    setError('');
    setGuardando(true);

    try {
      const respuesta = await api.post('/tramites', form);
      onGuardado(respuesta.data); // el padre cierra el modal y refresca
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo crear el trámite');
      setGuardando(false);
    }
  }

  return (
    <Modal title="Nuevo trámite" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 px-6 py-5">
          <SelectInput
            label="Cliente *"
            name="clienteId"
            value={form.clienteId}
            onChange={handleChange}
            opciones={[{ value: '', label: 'Seleccioná un cliente' }, ...clientes]}
            required
          />

          <SelectInput
            label="Trámite *"
            name="tipoTramiteId"
            value={form.tipoTramiteId}
            onChange={handleChange}
            opciones={[{ value: '', label: 'Seleccioná un trámite' }, ...tipos]}
            required
          />
          {tipos.length === 0 && (
            <p className="-mt-2 text-xs text-gray-500">
              El catálogo está vacío. Cargá trámites primero desde «Catálogo de trámites».
            </p>
          )}

          <Input
            label="Fecha de vencimiento *"
            type="date"
            name="fechaVencimiento"
            value={form.fechaVencimiento}
            onChange={handleChange}
            required
          />

          <Textarea
            label="Descripción (opcional)"
            name="descripcion"
            value={form.descripcion}
            onChange={handleChange}
            rows={3}
            maxLength={300}
            placeholder="Ej: Inscripción de la sociedad ante la DNIT"
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