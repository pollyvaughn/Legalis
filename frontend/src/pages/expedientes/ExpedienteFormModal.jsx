// ============================================================
// ExpedienteFormModal.jsx
// Modal de alta de expediente (overlay sobre ExpedientesListPage).
// Misma lógica de ExpedienteCreatePage.jsx: el cliente se elige
// de un select con clientes ya existentes (no se puede crear
// cliente desde acá, es un flujo separado).
// A diferencia de ClienteFormModal, este SÍ navega al detalle
// tras crear (decisión: permite cargar partes procesales ahí mismo).
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { Input, SelectInput } from '../../components/ui/Input';

export default function ExpedienteFormModal({ onClose }) {
  const navigate = useNavigate();

  const [clientes, setClientes] = useState([]);
  const [cargandoClientes, setCargandoClientes] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    clienteId: '',
    numeroExpediente: '',
    caratula: '',
    fuero: '',
    jurisdiccion: '',
    juzgado: '',
    secretaria: '',
    objetoJuicio: '',
    montoJuicio: '',
    unidadFiscal: '',
  });

  // Trae la lista de clientes para poblar el select, una sola vez al abrir el modal.
  useEffect(() => {
    async function cargarClientes() {
      try {
        const respuesta = await api.get('/clientes');
        setClientes(respuesta.data);
      } catch (err) {
        setError('No se pudieron cargar los clientes');
      } finally {
        setCargandoClientes(false);
      }
    }

    cargarClientes();
  }, []);

  function handleChange(evento) {
    const { name, value } = evento.target;
    setForm((formAnterior) => ({ ...formAnterior, [name]: value }));
  }

  async function handleSubmit(evento) {
    evento.preventDefault();
    setError('');
    setGuardando(true);

    try {
      const respuesta = await api.post('/expedientes', {
        ...form,
        montoJuicio: form.montoJuicio === '' ? null : form.montoJuicio,
      });

      // Al crear con éxito, cierra el modal y navega directo al detalle
      // del expediente recién creado (para cargarle partes procesales ahí mismo).
      onClose();
      navigate(`/expedientes/${respuesta.data.id}`);
    } catch (err) {
      const mensaje = err.response?.data?.error || 'No se pudo crear el expediente';
      setError(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  // Opciones del select de cliente. Si todavía no hay clientes cargados,
  // se muestra un placeholder deshabilitado en vez de una lista vacía.
  const opcionesClientes = clientes.length > 0
    ? [
        { value: '', label: 'Seleccionar cliente...', disabled: true },
        ...clientes.map((c) => ({ value: c.id, label: c.nombreRazonSocial })),
      ]
    : [{ value: '', label: 'No hay clientes cargados', disabled: true }];

  return (
    <Modal title="Nuevo expediente" onClose={onClose}>
      {cargandoClientes ? (
        <p className="px-6 py-8 text-sm text-gray-500">Cargando clientes...</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 py-5">
            <div>
              <SelectInput
                label="Cliente"
                name="clienteId"
                value={form.clienteId}
                onChange={handleChange}
                required
                opciones={opcionesClientes}
              />
              {clientes.length === 0 && (
                <p className="mt-1 text-xs text-gray-400">
                  No hay clientes cargados todavía. Creá uno primero desde el módulo de clientes.
                </p>
              )}
            </div>

            <Input
              label="N° Expediente"
              name="numeroExpediente"
              value={form.numeroExpediente}
              onChange={handleChange}
              required
              placeholder="Ej: 45.892/2024"
            />

            <Input
              label="Carátula"
              name="caratula"
              value={form.caratula}
              onChange={handleChange}
              required
              placeholder="Ej: García c/ Municipalidad s/ Daños"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input label="Fuero" name="fuero" value={form.fuero} onChange={handleChange} />
              <Input
                label="Jurisdicción"
                name="jurisdiccion"
                value={form.jurisdiccion}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Juzgado" name="juzgado" value={form.juzgado} onChange={handleChange} />
              <Input
                label="Secretaría"
                name="secretaria"
                value={form.secretaria}
                onChange={handleChange}
              />
            </div>

            <Input
              label="Objeto del juicio"
              name="objetoJuicio"
              value={form.objetoJuicio}
              onChange={handleChange}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Monto del juicio"
                type="text"
                inputMode="decimal"
                name="montoJuicio"
                value={form.montoJuicio}
                onChange={handleChange}
                placeholder="0"
              />
              <Input
                label="Unidad fiscal"
                name="unidadFiscal"
                value={form.unidadFiscal}
                onChange={handleChange}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <Modal.Footer>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? 'Creando...' : 'Crear expediente'}
            </Button>
          </Modal.Footer>
        </form>
      )}
    </Modal>
  );
}