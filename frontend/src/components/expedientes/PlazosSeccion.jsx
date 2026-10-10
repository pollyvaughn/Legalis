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
//
// EDITAR / ELIMINAR (solo ABOGADO y solo plazos PENDIENTES):
//   - Editar abre un modal con el mismo flujo: si cambia un dato
//     que afecta el cálculo (tipo, notificación, días, modalidad)
//     hay que apretar "Recalcular" antes de poder guardar. La
//     fecha de vencimiento sigue siendo editable a mano (RN-20).
//   - Eliminar pide confirmación.
//   - Un plazo CUMPLIDO queda bloqueado: no muestra los botones
//     y, además, el backend lo rechaza con 400.
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

// ------------------------------------------------------------
// Helper: ISO (UTC) -> "AAAA-MM-DDTHH:mm" en hora LOCAL, que es el
// formato que usa <input type="datetime-local"> (para precargar
// horaLimite al editar un plazo en modalidad HORAS).
// ------------------------------------------------------------
function aInputFechaHora(iso) {
  if (!iso) return '';
  const fecha = new Date(iso);
  const dos = (n) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}T${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`;
}

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

  // --- Formulario de alta ---
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

  // --- Marcar cumplido ---
  const [plazoAConfirmar, setPlazoAConfirmar] = useState(null);
  const [marcandoCumplido, setMarcandoCumplido] = useState(false);
  const [errorCumplido, setErrorCumplido] = useState('');

  // --- Editar plazo (modal) ---
  const [plazoEnEdicion, setPlazoEnEdicion] = useState(null); // null = modal cerrado
  const [formEdicion, setFormEdicion] = useState(null); // campos del modal
  const [necesitaRecalcular, setNecesitaRecalcular] = useState(false);
  const [limiteGraciaEdicion, setLimiteGraciaEdicion] = useState(null);
  const [calculandoEdicion, setCalculandoEdicion] = useState(false);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState('');

  // --- Eliminar plazo (modal de confirmación) ---
  const [plazoAEliminar, setPlazoAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState('');

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

  // ============================================================
  // MARCAR CUMPLIDO
  // ============================================================
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

  // ============================================================
  // EDITAR PLAZO
  // ============================================================

  // Abre el modal precargado con los valores actuales del plazo.
  function abrirEdicion(plazo) {
    setErrorEdicion('');
    setNecesitaRecalcular(false);
    setLimiteGraciaEdicion(null);
    setPlazoEnEdicion(plazo);
    setFormEdicion({
      tipoPlazoId: String(plazo.tipoPlazoId),
      fechaNotificacion: aInputFecha(plazo.fechaNotificacion),
      diasCantidad: String(plazo.diasCantidad),
      modalidad: plazo.modalidad,
      fechaVencimiento: aInputFecha(plazo.fechaVencimiento),
      horaLimite: aInputFechaHora(plazo.horaLimite),
      observaciones: plazo.observaciones ?? '',
    });
  }

  function cerrarEdicion() {
    if (guardandoEdicion) return;
    setPlazoEnEdicion(null);
    setFormEdicion(null);
    setErrorEdicion('');
  }

  // Cambia un campo del modal. Si el campo afecta el cálculo del
  // vencimiento (esDatoDeCalculo), la fecha mostrada ya no es
  // confiable: se exige "Recalcular" antes de guardar (salvo HORAS,
  // que no tiene cálculo).
  function cambiarCampoEdicion(campo, valor, esDatoDeCalculo = false) {
    const siguiente = { ...formEdicion, [campo]: valor };
    setFormEdicion(siguiente);
    if (esDatoDeCalculo) {
      setNecesitaRecalcular(siguiente.modalidad !== 'HORAS');
      setLimiteGraciaEdicion(null);
    }
  }

  // Igual que en el alta: al elegir un tipo se precargan sus días
  // y modalidad por defecto (después se pueden cambiar a mano).
  function elegirTipoPlazoEdicion(id) {
    const tipo = tiposPlazo.find((t) => String(t.id) === String(id));
    const siguiente = {
      ...formEdicion,
      tipoPlazoId: id,
      ...(tipo
        ? { diasCantidad: String(tipo.diasDefault), modalidad: tipo.modalidadDefault }
        : {}),
    };
    setFormEdicion(siguiente);
    setNecesitaRecalcular(siguiente.modalidad !== 'HORAS');
    setLimiteGraciaEdicion(null);
  }

  // "Recalcular": pide una nueva sugerencia con los datos del modal.
  async function handleRecalcularEdicion() {
    setErrorEdicion('');
    setCalculandoEdicion(true);

    try {
      const respuesta = await api.get(`/expedientes/${expedienteId}/plazos/calcular`, {
        params: {
          fechaNotificacion: formEdicion.fechaNotificacion,
          diasCantidad: formEdicion.diasCantidad,
          modalidad: formEdicion.modalidad,
        },
      });
      setFormEdicion((f) => ({
        ...f,
        fechaVencimiento: aInputFecha(respuesta.data.fechaVencimiento),
      }));
      setLimiteGraciaEdicion(respuesta.data.limiteConGracia);
      setNecesitaRecalcular(false);
    } catch (err) {
      setErrorEdicion(err.response?.data?.error || 'No se pudo calcular el vencimiento');
    } finally {
      setCalculandoEdicion(false);
    }
  }

  // Guarda los cambios: PUT /plazos/:id. El backend devuelve el
  // plazo actualizado con su semáforo ya calculado.
  async function handleGuardarEdicion(evento) {
    evento.preventDefault();
    setErrorEdicion('');
    setGuardandoEdicion(true);

    try {
      const esHoras = formEdicion.modalidad === 'HORAS';
      const respuesta = await api.put(`/plazos/${plazoEnEdicion.id}`, {
        tipoPlazoId: formEdicion.tipoPlazoId,
        diasCantidad: formEdicion.diasCantidad,
        modalidad: formEdicion.modalidad,
        fechaNotificacion: formEdicion.fechaNotificacion,
        fechaVencimiento: esHoras ? undefined : formEdicion.fechaVencimiento,
        horaLimite: esHoras ? formEdicion.horaLimite : undefined,
        observaciones: formEdicion.observaciones,
      });

      onChange(
        plazos.map((p) => (p.id === plazoEnEdicion.id ? { ...p, ...respuesta.data } : p))
      );
      setPlazoEnEdicion(null);
      setFormEdicion(null);
    } catch (err) {
      setErrorEdicion(err.response?.data?.error || 'No se pudo guardar el plazo');
    } finally {
      setGuardandoEdicion(false);
    }
  }

  // ============================================================
  // ELIMINAR PLAZO
  // ============================================================
  function abrirConfirmacionEliminar(plazo) {
    setErrorEliminar('');
    setPlazoAEliminar(plazo);
  }

  async function confirmarEliminar() {
    if (!plazoAEliminar) return;

    setEliminando(true);
    setErrorEliminar('');

    try {
      await api.delete(`/plazos/${plazoAEliminar.id}`);
      onChange(plazos.filter((p) => p.id !== plazoAEliminar.id));
      setPlazoAEliminar(null);
    } catch (err) {
      setErrorEliminar(err.response?.data?.error || 'No se pudo eliminar el plazo');
    } finally {
      setEliminando(false);
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

  // Opciones del select del modal de edición. Si el tipo actual del
  // plazo fue inactivado, no viene en el catálogo de activos: se
  // agrega igual para que el select no muestre otro tipo por error.
  const opcionesTiposPlazoEdicion = (() => {
    const opciones = tiposPlazo.map((t) => ({ value: String(t.id), label: t.nombre }));
    if (
      plazoEnEdicion &&
      !opciones.some((o) => o.value === String(plazoEnEdicion.tipoPlazoId))
    ) {
      opciones.unshift({
        value: String(plazoEnEdicion.tipoPlazoId),
        label: `${plazoEnEdicion.tipoPlazo?.nombre ?? 'Tipo actual'} (inactivo)`,
      });
    }
    return opciones;
  })();

  // En el modal de edición: ¿se puede guardar?
  //  - HORAS: hace falta la hora límite.
  //  - Resto: hace falta la fecha de vencimiento y que no haya un
  //    cálculo pendiente (si cambió un dato, primero "Recalcular").
  const puedeGuardarEdicion =
    formEdicion &&
    formEdicion.tipoPlazoId &&
    formEdicion.fechaNotificacion &&
    (formEdicion.modalidad === 'HORAS'
      ? formEdicion.horaLimite
      : formEdicion.diasCantidad && formEdicion.fechaVencimiento && !necesitaRecalcular);

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
              <div className="flex items-start justify-between gap-3">
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
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Badge tone={TONO_SEMAFORO[plazo.semaforo] || 'gray'}>
                    {ETIQUETA_SEMAFORO[plazo.semaforo] || plazo.semaforo}
                  </Badge>
                  {/* Solo ABOGADO y solo PENDIENTES: un cumplido queda bloqueado */}
                  {esAbogado && plazo.estado === 'PENDIENTE' && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => abrirConfirmacionCumplido(plazo)}>
                        Marcar cumplido
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => abrirEdicion(plazo)}>
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => abrirConfirmacionEliminar(plazo)}>
                        Eliminar
                      </Button>
                    </>
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
        </div>
      )}

      {/* ========================================================
          MODALES
          Van FUERA del bloque {mostrarForm && ...}: antes el modal
          de "Marcar cumplido" estaba adentro y solo se veía con el
          formulario de alta abierto.
          ======================================================== */}

      {/* --- Modal: confirmar "Marcar cumplido" --- */}
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

            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              Una vez cumplido, no vas a poder editar ni eliminar este plazo
              {plazoAConfirmar.actuacionId && ' ni la actuación asociada'}.
              Esta acción no se puede deshacer desde el sistema.
            </p>

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

      {/* --- Modal: editar plazo --- */}
      {formEdicion && (
        <Modal
          title="Editar plazo"
          size="lg"
          onClose={cerrarEdicion}
          closeOnOverlay={!guardandoEdicion}
        >
          <form onSubmit={handleGuardarEdicion}>
            <div className="space-y-3 px-6 py-5">
              <p className="text-xs text-gray-500">* Campo obligatorio</p>

              <SelectInput
                label="Tipo de plazo *"
                name="edTipoPlazoId"
                value={formEdicion.tipoPlazoId}
                onChange={(e) => elegirTipoPlazoEdicion(e.target.value)}
                opciones={opcionesTiposPlazoEdicion}
                required
              />

              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Fecha de notificación *"
                  name="edFechaNotificacion"
                  type="date"
                  value={formEdicion.fechaNotificacion}
                  onChange={(e) => cambiarCampoEdicion('fechaNotificacion', e.target.value, true)}
                  required
                />
                <Input
                  label="Cantidad de días"
                  name="edDiasCantidad"
                  type="number"
                  min="1"
                  value={formEdicion.diasCantidad}
                  onChange={(e) => cambiarCampoEdicion('diasCantidad', e.target.value, true)}
                  disabled={formEdicion.modalidad === 'HORAS'}
                  required={formEdicion.modalidad !== 'HORAS'}
                />
                <SelectInput
                  label="Modalidad"
                  name="edModalidad"
                  value={formEdicion.modalidad}
                  onChange={(e) => cambiarCampoEdicion('modalidad', e.target.value, true)}
                  opciones={OPCIONES_MODALIDAD}
                />
              </div>

              {/* HORAS: carga directa. Resto: fecha editable + Recalcular */}
              {formEdicion.modalidad === 'HORAS' ? (
                <Input
                  label="Fecha y hora límite *"
                  name="edHoraLimite"
                  type="datetime-local"
                  value={formEdicion.horaLimite}
                  onChange={(e) => cambiarCampoEdicion('horaLimite', e.target.value)}
                  required
                />
              ) : (
                <div className="rounded-lg bg-gray-50 p-4">
                  <Input
                    label="Fecha de vencimiento (editable) *"
                    name="edFechaVencimiento"
                    type="date"
                    value={formEdicion.fechaVencimiento}
                    onChange={(e) => cambiarCampoEdicion('fechaVencimiento', e.target.value)}
                    required
                    className="bg-white"
                  />

                  {limiteGraciaEdicion && (
                    <p className="mt-2 text-xs text-gray-500">
                      Con plazo de gracia, hasta las {formatearFechaHora(limiteGraciaEdicion)}
                    </p>
                  )}

                  {necesitaRecalcular && (
                    <p className="mt-2 text-xs text-amber-700">
                      Cambiaste un dato que afecta el cálculo: recalculá el vencimiento
                      antes de guardar.
                    </p>
                  )}

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    onClick={handleRecalcularEdicion}
                    disabled={
                      calculandoEdicion ||
                      !formEdicion.fechaNotificacion ||
                      !formEdicion.diasCantidad
                    }
                  >
                    {calculandoEdicion ? 'Calculando...' : 'Recalcular vencimiento'}
                  </Button>
                </div>
              )}

              <Textarea
                label="Observaciones (opcional)"
                name="edObservaciones"
                value={formEdicion.observaciones}
                onChange={(e) => cambiarCampoEdicion('observaciones', e.target.value)}
                rows={2}
              />

              {errorEdicion && <p className="text-sm text-red-600">{errorEdicion}</p>}
            </div>

            <Modal.Footer>
              <Button
                type="button"
                variant="secondary"
                onClick={cerrarEdicion}
                disabled={guardandoEdicion}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={!puedeGuardarEdicion || guardandoEdicion}>
                {guardandoEdicion ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </Modal.Footer>
          </form>
        </Modal>
      )}

      {/* --- Modal: confirmar eliminación --- */}
      {plazoAEliminar && (
        <Modal
          title="Eliminar plazo"
          onClose={() => {
            if (!eliminando) setPlazoAEliminar(null);
          }}
          closeOnOverlay={!eliminando}
        >
          <div className="px-6 py-5">
            <p className="text-sm text-gray-700">
              ¿Seguro que querés eliminar el plazo{' '}
              <strong>{plazoAEliminar.tipoPlazo?.nombre ?? 'seleccionado'}</strong>
              {' '}(vence{' '}
              {plazoAEliminar.modalidad === 'HORAS'
                ? formatearFechaHora(plazoAEliminar.horaLimite)
                : formatearFechaSola(plazoAEliminar.fechaVencimiento)}
              )? Esta acción no se puede deshacer.
            </p>

            {errorEliminar && (
              <p className="mt-3 text-sm text-red-600">{errorEliminar}</p>
            )}
          </div>

          <Modal.Footer>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPlazoAEliminar(null)}
              disabled={eliminando}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={confirmarEliminar}
              disabled={eliminando}
            >
              {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}