// ============================================================
// PlazosSeccion.jsx
// Sección de ExpedienteDetailPage: plazos judiciales del
// expediente (RF6), con semáforo calculado por el backend en
// cada respuesta (nunca se guarda, ver calendarioPlazos.js).
//
// Flujo de alta en DOS pasos (RN-20: "el sistema propone, ella
// corrige"):
//   1. Completa tipoPlazo + fechaNotificacion + dias + modalidad,
//      aprieta "Calcular" → GET /calcular (no guarda nada).
//   2. Aparece fechaVencimiento sugerida en un campo editable +
//      botón "Guardar plazo" → recién ahí hace el POST.
// Si modalidad = HORAS, no hay cálculo: se carga horaLimite
// directo y el botón "Guardar plazo" aparece de una.
// ============================================================

import { useEffect, useState } from 'react';
import api from '../../api/axios';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { Input, SelectInput, Textarea } from '../ui/Input';
import { TONO_SEMAFORO, ETIQUETA_SEMAFORO } from '../../constants/semaforoPlazos';
import { useAuth } from '../../context/AuthContext';
import {
  aInputFecha,
  formatearFechaHora,
  formatearFechaSola,
} from '../../utils/fechas';
import Modal from '../ui/Modal';
import { etiquetaTipoActuacion } from '../../constants/tiposActuacion';
import useScrollHighlight from '../../hooks/useScrollHighlight';

const OPCIONES_MODALIDAD = [
  { value: 'HABILES', label: 'Días hábiles' },
  { value: 'CORRIDOS', label: 'Días corridos' },
  { value: 'HORAS', label: 'Horas (carga manual)' },
];


export default function PlazosSeccion({
  expedienteId,
  plazos,
  onChange,
  actuaciones,
  actuacionIdParaPlazo,
  onActuacionIdParaPlazoChange,
}) {
  const { esAbogado } = useAuth();

  const [tiposPlazo, setTiposPlazo] = useState([]);
  const [cargandoTipos, setCargandoTipos] = useState(true);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [tipoPlazoId, setTipoPlazoId] = useState('');
  const [fechaNotificacion, setFechaNotificacion] = useState('');
  const [diasCantidad, setDiasCantidad] = useState('');
  const [modalidad, setModalidad] = useState('HABILES');
  const [horaLimite, setHoraLimite] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // Resultado del paso 1 (calcular). null = todavía no se calculó.
  const [sugerencia, setSugerencia] = useState(null);
  const [fechaVencimientoEditable, setFechaVencimientoEditable] = useState('');
  const [calculando, setCalculando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(''); 

  const [plazoAConfirmar, setPlazoAConfirmar] = useState(null);
  const [marcandoCumplido, setMarcandoCumplido] = useState(false);
  const [errorCumplido, setErrorCumplido] = useState('');

  const formularioFocus = useScrollHighlight(
    mostrarForm && !cargandoTipos,
    'alta-plazo'
  );

  useEffect(() => {
    const actuacionSeleccionada = actuaciones.find(
      (actuacion) => String(actuacion.id) === String(actuacionIdParaPlazo)
    );
  
    setFechaNotificacion(
      actuacionSeleccionada?.fechaNotificacion
        ? aInputFecha(actuacionSeleccionada.fechaNotificacion)
        : ''
    );
    setSugerencia(null);
  }, [actuacionIdParaPlazo, actuaciones]);

  // Trae el catálogo de tipos de plazo una sola vez, al abrir el form.
  useEffect(() => {
    async function cargarTiposPlazo() {
      try {
        const respuesta = await api.get('/tipos-plazo');
        setTiposPlazo(respuesta.data);
      } catch (err) {
        setError('No se pudieron cargar los tipos de plazo');
      } finally {
        setCargandoTipos(false);
      }
    }
    cargarTiposPlazo();
  }, []);

  // Al elegir un tipo de plazo, se precargan sus valores sugeridos
  // (diasDefault/modalidadDefault) — la abogada puede cambiarlos
  // después, son solo un punto de partida (ver nota en el schema).
  function handleElegirTipoPlazo(id) {
    setTipoPlazoId(id);
    const tipo = tiposPlazo.find((t) => String(t.id) === String(id));
    if (tipo) {
      setDiasCantidad(String(tipo.diasDefault));
      setModalidad(tipo.modalidadDefault);
    }
    // Cambiar el tipo invalida cualquier cálculo anterior.
    setSugerencia(null);
  }

  function limpiarForm() {
    setTipoPlazoId('');
    setFechaNotificacion('');
    setDiasCantidad('');
    setModalidad('HABILES');
    setHoraLimite('');
    setObservaciones('');
    setSugerencia(null);
    setFechaVencimientoEditable('');
    onActuacionIdParaPlazoChange('');
  }

  // Paso 1: pide la sugerencia sin guardar nada.
  async function handleCalcular() {
    setError('');
    setCalculando(true);

    try {
      const respuesta = await api.get(`/expedientes/${expedienteId}/plazos/calcular`, {
        params: { fechaNotificacion, diasCantidad, modalidad },
      });
      setSugerencia(respuesta.data);
      setFechaVencimientoEditable(aInputFecha(respuesta.data.fechaVencimiento));
    } catch (err) {
      const mensaje = err.response?.data?.error || 'No se pudo calcular el vencimiento';
      setError(mensaje);
    } finally {
      setCalculando(false);
    }
  }

  // Paso 2: guarda el plazo con la fecha que haya quedado en el
  // campo editable (sugerida tal cual, o corregida por la abogada).
  async function handleGuardar(evento) {
    evento.preventDefault();
    setError('');
    setGuardando(true);

    try {
      const respuesta = await api.post(`/expedientes/${expedienteId}/plazos`, {
        tipoPlazoId,
        diasCantidad,
        modalidad,
        fechaNotificacion,
        fechaVencimiento: modalidad !== 'HORAS' ? fechaVencimientoEditable : undefined,
        horaLimite: modalidad === 'HORAS' ? horaLimite : undefined,
        observaciones: observaciones || undefined,
        actuacionId: actuacionIdParaPlazo
          ? Number(actuacionIdParaPlazo)
          : undefined,
      });

      onChange([...plazos, respuesta.data]);
      limpiarForm();
      setMostrarForm(false);
    } catch (err) {
      const mensaje = err.response?.data?.error || 'No se pudo guardar el plazo';
      setError(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  function abrirConfirmacionCumplido(plazo) {
    setErrorCumplido('');
    setPlazoAConfirmar(plazo);
  }
  
  async function confirmarMarcarCumplido() {
    if (!plazoAConfirmar) return;
  
    setMarcandoCumplido(true);
    setErrorCumplido('');
  
    try {
      const respuesta = await api.patch(
        `/plazos/${plazoAConfirmar.id}/cumplido`
      );
  
      onChange(
        plazos.map((p) =>
          p.id === plazoAConfirmar.id
            ? { ...p, ...respuesta.data, semaforo: 'CUMPLIDO' }
            : p
        )
      );
  
      setPlazoAConfirmar(null);
    } catch (err) {
      setErrorCumplido(
        err.response?.data?.error || 'No se pudo marcar el plazo como cumplido'
      );
    } finally {
      setMarcandoCumplido(false);
    }
  }

  // El botón "Calcular" solo tiene sentido si hay lo mínimo cargado
  // y la modalidad no es HORAS (ahí no hay nada que calcular).
  const puedeCalcular = tipoPlazoId && fechaNotificacion && diasCantidad && modalidad !== 'HORAS';
  // Para HORAS, el botón "Guardar" aparece directo si hay horaLimite.
  const puedeGuardarHoras = modalidad === 'HORAS' && tipoPlazoId && fechaNotificacion && horaLimite;

  const opcionesTiposPlazo = tiposPlazo.length > 0
    ? [
        { value: '', label: 'Seleccionar tipo de plazo...', disabled: true },
        ...tiposPlazo.map((t) => ({ value: t.id, label: t.nombre })),
      ]
    : [{ value: '', label: 'No hay tipos de plazo cargados', disabled: true }];

  return (
    <div id="plazos-seccion" className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Plazos judiciales</h2>
        {esAbogado && !mostrarForm && (
          <Button size="sm" onClick={() => setMostrarForm(true)}>
            + Nuevo plazo
          </Button>
        )}
      </div>

      {plazos.length === 0 && !mostrarForm && (
        <p className="text-sm text-gray-500">Todavía no hay plazos cargados.</p>
      )}

      {plazos.length > 0 && (
        <ul className="mb-4 divide-y divide-gray-100">
          {plazos.map((plazo) => (
            <li key={plazo.id} className="py-3 first:pt-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {plazo.tipoPlazo?.nombre}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-600">
                    {plazo.modalidad === 'HORAS'
                      ? `Vence: ${formatearFechaHora(plazo.horaLimite)}`
                      : `Vence: ${formatearFechaSola(plazo.fechaVencimiento)}`}
                  </p>
                  {plazo.observaciones && (
                    <p className="mt-1 text-xs text-gray-400">{plazo.observaciones}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={TONO_SEMAFORO[plazo.semaforo] || 'gray'}>
                    {ETIQUETA_SEMAFORO[plazo.semaforo] || plazo.semaforo}
                  </Badge>
                  {esAbogado && plazo.estado === 'PENDIENTE' && (
                    <Button variant="ghost" size="sm" onClick={() => abrirConfirmacionCumplido(plazo)}>
                      Marcar cumplido
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {mostrarForm && (
        <div> 
          {cargandoTipos ? (
            <p className="text-sm text-gray-500">Cargando tipos de plazo...</p>
          ) : (
            <form 
              ref={formularioFocus}
              onSubmit={handleGuardar} 
              className="mt-4 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4"
            >
              <p className="text-xs text-gray-500">
                * Campo obligatorio
              </p>
              <SelectInput
                label="Tipo de plazo *"
                value={tipoPlazoId}
                onChange={(e) => handleElegirTipoPlazo(e.target.value)}
                opciones={opcionesTiposPlazo}
                required
              />

              <SelectInput
                label="Actuación que origina el plazo (opcional)"
                value={actuacionIdParaPlazo}
                onChange={(e) => onActuacionIdParaPlazoChange(e.target.value)}
                opciones={[
                  { value: '', label: 'Sin actuación asociada' },
                  ...actuaciones.map((actuacion) => ({
                    value: String(actuacion.id),
                    label: `${formatearFechaSola(actuacion.fecha)} · ${etiquetaTipoActuacion(actuacion.tipo)} · ${actuacion.descripcion}`,
                  })),
                ]}
              />

              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Fecha de notificación *"
                  type="date"
                  value={fechaNotificacion}
                  onChange={(e) => {
                    setFechaNotificacion(e.target.value);
                    setSugerencia(null);
                  }}
                  required
                />
                <Input
                  label="Cantidad de días"
                  type="number"
                  min="1"
                  value={diasCantidad}
                  onChange={(e) => {
                    setDiasCantidad(e.target.value);
                    setSugerencia(null);
                  }}
                  disabled={modalidad === 'HORAS'}
                  required={modalidad !== 'HORAS'}
                />
                <SelectInput
                  label="Modalidad"
                  value={modalidad}
                  onChange={(e) => {
                    setModalidad(e.target.value);
                    setSugerencia(null);
                  }}
                  opciones={OPCIONES_MODALIDAD}
                />
              </div>

              {/* Modalidad HORAS: carga directa, sin cálculo (RN-19) */}
              {modalidad === 'HORAS' ? (
                <Input
                  label="Fecha y hora límite *"
                  type="datetime-local"
                  value={horaLimite}
                  onChange={(e) => setHoraLimite(e.target.value)}
                  required
                />
              ) : (
                <>
                  {/* Paso 1: botón Calcular (solo si todavía no se calculó) */}
                  {!sugerencia && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleCalcular}
                      disabled={!puedeCalcular || calculando}
                    >
                      {calculando ? 'Calculando...' : 'Calcular vencimiento'}
                    </Button>
                  )}

                  {/* Paso 2: fecha sugerida, editable, + límite con gracia informativo */}
                  {sugerencia && (
                    <div className="rounded-lg bg-gray-50 p-4">
                      <Input
                        label="Fecha de vencimiento (sugerida, editable)"
                        type="date"
                        value={fechaVencimientoEditable}
                        onChange={(e) => setFechaVencimientoEditable(e.target.value)}
                        required
                        className="bg-white"
                      />
                      {sugerencia.limiteConGracia && (
                        <p className="mt-2 text-xs text-gray-500">
                          Con plazo de gracia, hasta las{' '}
                          {formatearFechaHora(sugerencia.limiteConGracia)}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              <Textarea
                label="Observaciones (opcional)"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={2}
              />

              {error && <p className="text-sm text-red-600">{error}</p>}

              {/* El botón Guardar solo aparece una vez que hay algo
                  que guardar: ya se calculó (no-HORAS) o ya se cargó
                  la hora límite (HORAS). */}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    limpiarForm();
                    setError('');
                    setMostrarForm(false);
                  }}
                >
                  Cancelar
                </Button>

                {(sugerencia || puedeGuardarHoras) && (
                  <Button type="submit" disabled={guardando}>
                    {guardando ? 'Guardando...' : 'Guardar plazo'}
                  </Button>
                )}
              </div>
            </form>
          )}
          {plazoAConfirmar && (
            <Modal
              title="Marcar plazo como cumplido"
              onClose={() => {
                if (!marcandoCumplido) setPlazoAConfirmar(null);
              }}
              closeOnOverlay={!marcandoCumplido}
            >
              <div className="px-6 py-5">
                <p className="text-sm text-gray-700">
                  ¿Confirmás marcar como cumplido el plazo{' '}
                  <strong>
                    {plazoAConfirmar.tipoPlazo?.nombre ?? 'seleccionado'}
                  </strong>
                  ?
                </p>

                {/* {plazoAConfirmar.actuacionId && ( */}
                  <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                    Una vez cumplido, no vas a poder editar ni eliminar la actuación
                    asociada. Esta acción no se puede deshacer desde el sistema.
                  </p>
                {/* )} */}

                {errorCumplido && (
                  <p className="mt-3 text-sm text-red-600">{errorCumplido}</p>
                )}
              </div>

              <Modal.Footer>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setPlazoAConfirmar(null)}
                  disabled={marcandoCumplido}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={confirmarMarcarCumplido}
                  disabled={marcandoCumplido}
                >
                  {marcandoCumplido ? 'Marcando...' : 'Sí, marcar como cumplido'}
                </Button>
              </Modal.Footer>
            </Modal>
          )}
        </div>
      )}
    </div>
  );
}