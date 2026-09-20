// ============================================================
// ExpedienteFormModal.jsx
// Modal de alta de expediente (overlay sobre ExpedientesListPage).
// El cliente se elige
// de un select con clientes ya existentes (no se puede crear
// cliente desde acá, es un flujo separado).
// A diferencia de ClienteFormModal, este SÍ navega al detalle
// tras crear (decisión: permite cargar partes procesales ahí mismo).
//
// IDENTIFICACIÓN ÚNICA: número + año + juzgado + carátula.
// El año va en un campo aparte (la numeración reinicia cada año),
// por eso el N° de expediente se carga SIN el año.
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { Input, SelectInput } from '../../components/ui/Input';
import { OPCIONES_FUERO } from '../../constants/fueros';
import { OPCIONES_ESTADO_PROCESAL } from '../../constants/estadosProcesales';

export default function ExpedienteFormModal({ onClose }) {
  const navigate = useNavigate();

  const [clientes, setClientes] = useState([]);
  const [cargandoClientes, setCargandoClientes] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Estado del formulario. anio arranca con el año actual (lo más común
  // al cargar un caso nuevo) y estadoProcesal con EN_TRAMITE (mismo
  // default que el schema de Prisma).
  const [form, setForm] = useState({
    clienteId: '',
    numeroExpediente: '',
    anio: new Date().getFullYear(),
    caratula: '',
    fuero: '',
    jurisdiccion: '',
    juzgado: '',
    secretaria: '',
    objetoJuicio: '',
    montoJuicio: '',
    unidadFiscal: '',
    estadoProcesal: 'EN_TRAMITE',
  });

  // Trae la lista de clientes para poblar el select, una sola vez al abrir el modal.
  useEffect(() => {
    async function cargarClientes() {
      try {
        const respuesta = await api.get('/clientes/opciones');
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
        // fuero es opcional en el backend: si no se eligió, mandamos null
        // en vez de '' para que Prisma no rechace un enum vacío.
        fuero: form.fuero === '' ? null : form.fuero,
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

            {/* Número y año van juntos: forman la identificación del expediente */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="N° Expediente"
                name="numeroExpediente"
                value={form.numeroExpediente}
                onChange={handleChange}
                required
                placeholder="Ej: 45892"
              />
              <Input
                label="Año"
                type="number"
                name="anio"
                value={form.anio}
                onChange={handleChange}
                required
                min="1900"
                max="2100"
              />
            </div>

            <Input
              label="Carátula"
              name="caratula"
              value={form.caratula}
              onChange={handleChange}
              required
              placeholder="Ej: García c/ Municipalidad s/ Daños"
            />

            <div className="grid grid-cols-2 gap-4">
              <SelectInput
                label="Fuero"
                name="fuero"
                value={form.fuero}
                onChange={handleChange}
                opciones={[{ value: '', label: 'Seleccionar...', disabled: true }, ...OPCIONES_FUERO]}
              />
              <Input
                label="Jurisdicción"
                name="jurisdiccion"
                value={form.jurisdiccion}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Juzgado ahora es obligatorio (parte de la identificación única) */}
              <Input
                label="Juzgado"
                name="juzgado"
                value={form.juzgado}
                onChange={handleChange}
                required
              />
              <Input
                label="Secretaría"
                name="secretaria"
                value={form.secretaria}
                onChange={handleChange}
              />
            </div>

            <SelectInput
              label="Estado procesal"
              name="estadoProcesal"
              value={form.estadoProcesal}
              onChange={handleChange}
              opciones={OPCIONES_ESTADO_PROCESAL}
            />

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