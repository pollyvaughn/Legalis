// ============================================
// EXPEDIENTEDETAILPAGE.JSX
// Muestra el detalle de un expediente puntual, incluyendo sus
// partes procesales (vienen incluidas en el GET por id, ver
// expedientes.service.js del backend). El botón "Editar" alterna
// la card principal a un form inline (mismo patrón que
// ClienteDetailPage). El botón Inactivar/Reactivar hace soft-delete
// via PUT con { activo: false/true }, con confirmación previa.
// La edición de partes procesales es independiente: cada parte
// se edita inline por fila, sin relación con el form de arriba.
//
// Actuaciones y Plazos (Módulo 2) se agregan como dos secciones
// más, al final, siguiendo el mismo patrón de Partes/Documentos.
// Los plazos se cargan aparte (GET /expedientes/:id/plazos) en vez
// de venir incluidos en el GET del expediente, porque ese endpoint
// es el único que calcula el semáforo al vuelo (ver plazo.service.js).
// ============================================

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { Input, SelectInput } from '../../components/ui/Input';
import { OPCIONES_FUERO, etiquetaFuero } from '../../constants/fueros';
import { OPCIONES_ESTADO_PROCESAL, etiquetaEstadoProcesal } from '../../constants/estadosProcesales';
import { useAuth } from '../../context/AuthContext';
import DocumentosSeccion from '../../components/asesorias/DocumentosSeccion';
import ActuacionesSeccion from '../../components/expedientes/ActuacionesSeccion';
import PlazosSeccion from '../../components/expedientes/PlazosSeccion';
import PartesSeccion from '../../components/expedientes/PartesSeccion';
import LiquidacionesSeccion from '../../components/honorarios/LiquidacionesSeccion';

// Muestra el valor, o un guión si está vacío/null — evita que
// la lista de partes se vea inconsistente entre sí (ver backlog).
function conPlaceholder(valor) {
  return valor && valor.trim() !== '' ? valor : '—';
}

// Color del Badge según el estado procesal (mismos tonos que en ExpedientesListPage)
const TONO_ESTADO_PROCESAL = {
  EN_TRAMITE: 'blue',
  EN_APELACION: 'yellow',
  SUSPENDIDO: 'gray',
  ARCHIVADO: 'gray',
  CONCLUIDO: 'green',
};

function ExpedienteDetailPage() {
  const { esAbogado } = useAuth();
  // useParams lee el :id de la URL (ej: /expedientes/2 → id = "2")
  const { id } = useParams();

  const [expediente, setExpediente] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Estado del form inline para EDITAR el expediente (datos principales)
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');

  // Estado del modal de confirmación para inactivar/reactivar
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [errorEstado, setErrorEstado] = useState('');

  // Plazos judiciales del expediente (Módulo 2). Se cargan aparte
  // del expediente porque este endpoint calcula el semáforo al
  // vuelo (ver PlazosSeccion / plazo.service.js).
  const [plazos, setPlazos] = useState([]);
  const [actuacionIdParaPlazo, setActuacionIdParaPlazo] = useState('');
  const [errorPlazos, setErrorPlazos] = useState('');

  // ------------------------------------------
  // Trae el expediente del backend. Pide incluirInactivos=true
  // para poder ver el detalle y reactivarlo si ya está inactivo
  // (sin esto, un expediente inactivado sería inalcanzable).
  // ------------------------------------------
  async function cargarExpediente() {
    try {
      const respuesta = await api.get(`/expedientes/${id}?incluirInactivos=true`);
      setExpediente(respuesta.data);
    } catch (err) {
      setError('No se pudo cargar el expediente');
    } finally {
      setCargando(false);
    }
  }

  async function cargarPlazos() {
  try {
    setErrorPlazos('');
    const respuesta = await api.get(`/expedientes/${id}/plazos`);
    setPlazos(respuesta.data);
  } catch (err) {
    setErrorPlazos(
      err.response?.data?.error || 'No se pudieron actualizar los plazos del expediente'
    );
  }
}

useEffect(() => {
  cargarExpediente();
}, [id]);

useEffect(() => {
  cargarPlazos();
}, [id]);

  // ------------------------------------------
  // iniciarEdicion: precarga el form con los datos actuales
  // del expediente (datos principales, no partes procesales).
  // ------------------------------------------
  function iniciarEdicion() {
    setForm({
      numeroExpediente: expediente.numeroExpediente,
      anio: expediente.anio,
      caratula: expediente.caratula,
      fuero: expediente.fuero || '',
      jurisdiccion: expediente.jurisdiccion || '',
      juzgado: expediente.juzgado || '',
      secretaria: expediente.secretaria || '',
      objetoJuicio: expediente.objetoJuicio || '',
      montoJuicio: expediente.montoJuicio ?? '',
      unidadFiscal: expediente.unidadFiscal || '',
      estadoProcesal: expediente.estadoProcesal,
    });
    setErrorForm('');
    setEditando(true);
  }

  function handleChange(evento) {
    const { name, value } = evento.target;
    setForm((formAnterior) => ({ ...formAnterior, [name]: value }));
  }

  async function handleGuardar(evento) {
    evento.preventDefault();
    setErrorForm('');
    setGuardando(true);

    try {
      await api.put(`/expedientes/${id}`, {
        ...form,
        montoJuicio: form.montoJuicio === '' ? null : form.montoJuicio,
        // fuero es opcional: si quedó vacío mandamos null (un '' no es un valor válido del enum)
        fuero: form.fuero === '' ? null : form.fuero,
      });

      setEditando(false);
      await cargarExpediente();
    } catch (err) {
      const mensaje = err.response?.data?.error || 'No se pudo guardar el expediente';
      setErrorForm(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  // ------------------------------------------
  // handleCambiarEstado: envía el toggle de activo/inactivo,
  // tras la confirmación del usuario en el modal.
  // ------------------------------------------
  async function handleCambiarEstado() {
    setErrorEstado('');
    setCambiandoEstado(true);

    try {
      await api.put(`/expedientes/${id}`, { activo: !expediente.activo });
      setMostrarConfirmacion(false);
      await cargarExpediente();
    } catch (err) {
      const mensaje = err.response?.data?.error || 'No se pudo cambiar el estado del expediente';
      setErrorEstado(mensaje);
    } finally {
      setCambiandoEstado(false);
    }
  }

  if (cargando) {
    return <p className="text-sm text-gray-500">Cargando expediente...</p>;
  }

  if (error || !expediente) {
    return <p className="text-sm text-red-600">{error || 'Expediente no encontrado'}</p>;
  }

  return (
    <div>
      <Link
        to="/expedientes"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft size={16} strokeWidth={1.75} />
        Volver a expedientes
      </Link>

      {/* --- Card principal: datos del expediente --- */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {expediente.numeroExpediente}/{expediente.anio}
            </h1>
            <p className="mt-1 text-sm text-gray-500">{expediente.caratula}</p>
            <div className="mt-2 flex gap-2">
              {/* Estado procesal (en qué etapa está el juicio) */}
              <Badge tone={TONO_ESTADO_PROCESAL[expediente.estadoProcesal] || 'gray'}>
                {etiquetaEstadoProcesal(expediente.estadoProcesal)}
              </Badge>
              {/* Activo/Inactivo (si el expediente está dado de baja en el sistema) */}
              <Badge tone={expediente.activo ? 'green' : 'gray'}>
                {expediente.activo ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </div>
          {esAbogado && !editando && (
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={iniciarEdicion}>
                Editar
              </Button>
              <Button
                variant={expediente.activo ? 'danger' : 'secondary'}
                size="sm"
                onClick={() => setMostrarConfirmacion(true)}
              >
                {expediente.activo ? 'Inactivar' : 'Reactivar'}
              </Button>
            </div>
          )}
        </div>

        {!editando ? (
          // ------------------------------------------
          // VISTA DE SOLO LECTURA
          // ------------------------------------------
          <dl className="grid grid-cols-2 gap-x-8 gap-y-4 border-t border-gray-100 pt-5 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase text-gray-400">Cliente</dt>
              <dd className="mt-1 text-gray-800">{expediente.cliente?.nombreRazonSocial}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-400">Fuero</dt>
              <dd className="mt-1 text-gray-800">{etiquetaFuero(expediente.fuero)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-400">Juzgado</dt>
              <dd className="mt-1 text-gray-800">{conPlaceholder(expediente.juzgado)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-400">Secretaría</dt>
              <dd className="mt-1 text-gray-800">{conPlaceholder(expediente.secretaria)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-400">Objeto del juicio</dt>
              <dd className="mt-1 text-gray-800">{conPlaceholder(expediente.objetoJuicio)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-400">Unidad fiscal</dt>
              <dd className="mt-1 text-gray-800">{conPlaceholder(expediente.unidadFiscal)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-400">Estado procesal</dt>
              <dd className="mt-1 text-gray-800">
                {etiquetaEstadoProcesal(expediente.estadoProcesal)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-400">Monto del juicio</dt>
              <dd className="mt-1 text-gray-800">
                {expediente.montoJuicio
                  ? Number(expediente.montoJuicio).toLocaleString('es-PY')
                  : '—'}
              </dd>
            </div>
          </dl>
        ) : (
          // ------------------------------------------
          // FORM DE EDICIÓN
          // El cliente NUNCA se muestra como campo editable acá
          // (misma decisión que en ClienteDetailPage: cambiar de
          // dueño requiere un flujo explícito, no un campo suelto).
          // ------------------------------------------
          <form onSubmit={handleGuardar} className="space-y-4 border-t border-gray-100 pt-5">
            {/* Número y año van juntos: forman la identificación del expediente */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="N° Expediente"
                name="numeroExpediente"
                value={form.numeroExpediente}
                onChange={handleChange}
                required
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
            />

            <div className="grid grid-cols-2 gap-4">
              <SelectInput
                label="Fuero"
                name="fuero"
                value={form.fuero}
                onChange={handleChange}
                opciones={[{ value: '', label: 'Sin especificar' }, ...OPCIONES_FUERO]}
              />
              <Input
                label="Jurisdicción"
                name="jurisdiccion"
                value={form.jurisdiccion}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Juzgado obligatorio: es parte de la identificación única */}
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

            {errorForm && <p className="text-sm text-red-600">{errorForm}</p>}

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setEditando(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        )}
      </div>

      <div className="mt-6">
        <PartesSeccion
          expedienteId={id}
          partes={expediente.partes}
          onRefresh={cargarExpediente}
        />
      </div>

      {/* --- Documentos recibidos del cliente para este expediente --- */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
        <DocumentosSeccion
          urlBase={`/expedientes/${id}/documentos`}
          documentos={expediente.documentosRecibidos}
          onChange={(lista) => setExpediente((e) => ({ ...e, documentosRecibidos: lista }))}
        />
      </div>

      {/* --- Actuaciones del expediente (Módulo 2) --- */}
      <div className="mt-6">
        <ActuacionesSeccion
          expedienteId={id}
          actuaciones={expediente.actuaciones || []}
          onChange={(lista) => setExpediente((e) => ({ ...e, actuaciones: lista }))}
          onIrAPlazos={(actuacionId) => {
            setActuacionIdParaPlazo(String(actuacionId));
            document.getElementById('plazos-seccion')?.scrollIntoView({ behavior: 'smooth' });
          }}
          onPlazosActualizados={cargarPlazos}
        />
      </div>

      {/* --- Plazos judiciales del expediente (Módulo 2) --- */}
      <div className="mt-6">
      {/* Aviso si falló la carga/actualización de plazos (antes se guardaba y no se mostraba) */}
      {errorPlazos && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {errorPlazos}
        </p>
      )}
      <PlazosSeccion
        expedienteId={id}
        plazos={plazos}
        onChange={setPlazos}
        actuaciones={expediente.actuaciones || []}
        actuacionIdParaPlazo={actuacionIdParaPlazo}
        onActuacionIdParaPlazoChange={setActuacionIdParaPlazo}
        fuero={expediente.fuero}
      />
      </div>

      {/* --- Honorarios del expediente (Módulo 3): solo ABOGADO --- */}
      {esAbogado && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
          <LiquidacionesSeccion urlBase={`/expedientes/${id}/liquidaciones`} />
        </div>
      )}

      {/* --- Modal de confirmación para inactivar/reactivar --- */}
      {mostrarConfirmacion && (
        <Modal
          title={expediente.activo ? 'Inactivar expediente' : 'Reactivar expediente'}
          onClose={() => setMostrarConfirmacion(false)}
        >
          <div className="px-6 py-5">
            <p className="text-sm text-gray-700">
              {expediente.activo ? (
                <>
                  ¿Seguro que querés inactivar el expediente{' '}
                  <strong>{expediente.numeroExpediente}</strong>? Su historial y partes
                  procesales se conservan.
                </>
              ) : (
                <>
                  ¿Querés reactivar el expediente <strong>{expediente.numeroExpediente}</strong>?
                  Va a volver a aparecer como expediente activo.
                </>
              )}
            </p>
            {errorEstado && <p className="mt-3 text-sm text-red-600">{errorEstado}</p>}
          </div>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setMostrarConfirmacion(false)}
              disabled={cambiandoEstado}
            >
              Cancelar
            </Button>
            <Button
              variant={expediente.activo ? 'danger' : 'primary'}
              onClick={handleCambiarEstado}
              disabled={cambiandoEstado}
            >
              {cambiandoEstado
                ? 'Guardando...'
                : expediente.activo
                ? 'Sí, inactivar'
                : 'Sí, reactivar'}
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}

export default ExpedienteDetailPage;