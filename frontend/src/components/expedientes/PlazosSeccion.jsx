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

const OPCIONES_MODALIDAD = [
  { value: 'HABILES', label: 'Días hábiles' },
  { value: 'CORRIDOS', label: 'Días corridos' },
  { value: 'HORAS', label: 'Horas (carga manual)' },
];


export default function PlazosSeccion({ expedienteId, plazos, onChange }) {
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

  async function handleMarcarCumplido(plazoId) {
    try {
      const respuesta = await api.patch(`/plazos/${plazoId}/cumplido`);
      onChange(plazos.map((p) => (p.id === plazoId ? respuesta.data : p)));
    } catch (err) {
      setError('No se pudo marcar el plazo como cumplido');
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
                    <Button variant="ghost" size="sm" onClick={() => handleMarcarCumplido(plazo.id)}>
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
        <div className="space-y-3 border-t border-gray-100 pt-4">
          {cargandoTipos ? (
            <p className="text-sm text-gray-500">Cargando tipos de plazo...</p>
          ) : (
            <form onSubmit={handleGuardar} className="space-y-3">
              <SelectInput
                label="Tipo de plazo"
                value={tipoPlazoId}
                onChange={(e) => handleElegirTipoPlazo(e.target.value)}
                opciones={opcionesTiposPlazo}
                required
              />

              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Fecha de notificación"
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
                  label="Fecha y hora límite"
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
              {(sugerencia || puedeGuardarHoras) && (
                <div className="flex gap-2">
                  <Button type="submit" disabled={guardando}>
                    {guardando ? 'Guardando...' : 'Guardar plazo'}
                  </Button>
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
                </div>
              )}
              {!sugerencia && !puedeGuardarHoras && (
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
              )}
            </form>
          )}
        </div>
      )}
    </div>
  );
}