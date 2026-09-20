// ============================================
// OBLIGACIONFORMMODAL.JSX
// Alta de una obligación periódica: "a este cliente le presento este
// trámite todos los meses / todos los años". Al guardar, el backend
// genera los vencimientos del año en curso (de hoy en adelante) según
// la terminación del RUC del cliente.
//
// Props:
//   clientes / tipos  listas [{ value, label }] para los selects
//   onClose           cierra sin guardar
//   onGuardado        se llama con { obligacion, generados }
// ============================================

import { useState } from 'react';
import api from '../../api/axios';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Input, SelectInput } from '../ui/Input';
import { OPCIONES_PERIODICIDAD, MESES } from '../../constants/tramites';

export default function ObligacionFormModal({ clientes, tipos, onClose, onGuardado }) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    clienteId: '',
    tipoTramiteId: '',
    periodicidad: 'MENSUAL',
    mesAnual: '',
    observaciones: '',
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
      const respuesta = await api.post('/obligaciones', {
        clienteId: form.clienteId,
        tipoTramiteId: form.tipoTramiteId,
        periodicidad: form.periodicidad,
        // El mes solo aplica a las anuales
        mesAnual: form.periodicidad === 'ANUAL' ? form.mesAnual : undefined,
        observaciones: form.observaciones,
      });
      onGuardado(respuesta.data); // { obligacion, generados }
    } catch (err) {
      // Ej: cliente sin RUC / RUC con formato inválido / ya existe una activa
      setError(err.response?.data?.error || 'No se pudo crear la obligación');
      setGuardando(false);
    }
  }

  return (
    <Modal title="Nueva obligación periódica" onClose={onClose}>
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

          <SelectInput
            label="Periodicidad *"
            name="periodicidad"
            value={form.periodicidad}
            onChange={handleChange}
            opciones={OPCIONES_PERIODICIDAD}
          />

          {form.periodicidad === 'ANUAL' && (
            <SelectInput
              label="Mes de vencimiento *"
              name="mesAnual"
              value={form.mesAnual}
              onChange={handleChange}
              opciones={[{ value: '', label: 'Seleccioná el mes' }, ...MESES]}
              required
            />
          )}

          <Input
            label="Observaciones (opcional)"
            name="observaciones"
            value={form.observaciones}
            onChange={handleChange}
            maxLength={300}
          />

          {/* Explicación de lo que va a pasar al guardar */}
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
            {form.periodicidad === 'MENSUAL'
              ? 'Vence todos los meses, el día que corresponde a la terminación del RUC del cliente (si cae en fin de semana, pasa al lunes). '
              : 'Vence una vez al año, en el mes elegido, el día que corresponde a la terminación del RUC del cliente. '}
            Al guardar se generan los vencimientos de este año, de hoy en adelante.
          </p>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Crear obligación'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}