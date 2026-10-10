// ============================================================
// ActuacionesSeccion.jsx
// Sección de ExpedienteDetailPage: historial cronológico de
// actuaciones del expediente (RF5) + form inline para cargar,
// editar y eliminar.
//
// EDITAR: form inline por fila (mismo patrón que Partes
// Procesales), con los 4 campos editables. Si la actuación ya
// tiene plazos asociados y se cambia fecha/fechaNotificacion, el
// backend recalcula el vencimiento de cada plazo PENDIENTE (o
// bloquea si hay alguno CUMPLIDO) — ver regla acordada 05/10/2026.
// La respuesta puede traer `plazosRecalculados`: se muestra un
// aviso puntual con cuántos se ajustaron.
//
// ELIMINAR: antes de confirmar, se consulta
// GET /actuaciones/:id/impacto-eliminacion — si hay un plazo
// cumplido, se bloquea con el motivo; si no, se muestra cuántos
// plazos PENDIENTE se van a borrar en cascada junto con la
// actuación, y recién ahí se pide la confirmación final.
// ============================================================

import { useState } from 'react';
import api from '../../api/axios';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import { Input, SelectInput, Textarea } from '../ui/Input';
import { OPCIONES_TIPO_ACTUACION, etiquetaTipoActuacion } from '../../constants/tiposActuacion';
import { useAuth } from '../../context/AuthContext';
import { aInputFecha, formatearFechaSola, hoyInput } from '../../utils/fechas';
import useScrollHighlight from '../../hooks/useScrollHighlight';


export default function ActuacionesSeccion({
  expedienteId,
  actuaciones,
  onChange,
  onIrAPlazos,
  onPlazosActualizados,
}) {
  const { esAbogado } = useAuth();

  const hoyComoInputDate = hoyInput();

  // --- Alta ---
  const [mostrarForm, setMostrarForm] = useState(false);
  const [tipo, setTipo] = useState(OPCIONES_TIPO_ACTUACION[0].value);
  const [fecha, setFecha] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaNotificacion, setFechaNotificacion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const [sugerenciaPlazo, setSugerenciaPlazo] = useState(false);
  const [actuacionPlazoSugerida, setActuacionPlazoSugerida] = useState(null);

  // --- Edición inline por fila ---
  // actuacionEnEdicionId: id de la fila en edición (null = ninguna)
  const [actuacionEnEdicionId, setActuacionEnEdicionId] = useState(null);
  const [tipoEdit, setTipoEdit] = useState(OPCIONES_TIPO_ACTUACION[0].value);
  const [fechaEdit, setFechaEdit] = useState('');
  const [descripcionEdit, setDescripcionEdit] = useState('');
  const [fechaNotificacionEdit, setFechaNotificacionEdit] = useState('');
  const [guardandoEdit, setGuardandoEdit] = useState(false);
  const [errorEdit, setErrorEdit] = useState('');

  const altaActuacionFocus = useScrollHighlight(mostrarForm, 'alta-actuacion');

  const edicionActuacionFocus = useScrollHighlight(
    actuacionEnEdicionId !== null,
    actuacionEnEdicionId
  );

  // Aviso puntual tras editar: cuántos plazos se recalcularon.
  // Es momentáneo, igual criterio que sugerenciaPlazo — no persiste.
  const [avisoRecalculo, setAvisoRecalculo] = useState(null); // null | { cantidad }

  // --- Eliminación: consulta de impacto + confirmación ---
  // impacto: null = modal cerrado. Si no es null, es el objeto que
  // devuelve GET .../impacto-eliminacion, más el id de la actuación
  // que se está por eliminar.
  const [impacto, setImpacto] = useState(null); // { actuacionId, puedeEliminar, motivo, plazosPendientes, plazosCumplidos }
  const [cargandoImpacto, setCargandoImpacto] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState('');

  function limpiarForm() {
    setTipo(OPCIONES_TIPO_ACTUACION[0].value);
    setFecha('');
    setDescripcion('');
    setFechaNotificacion('');
  }

  async function handleAgregar(evento) {
    evento.preventDefault();
    setError('');
    setGuardando(true);

    try {
      const respuesta = await api.post(`/expedientes/${expedienteId}/actuaciones`, {
        tipo,
        fecha,
        descripcion,
        fechaNotificacion: fechaNotificacion || undefined,
      });

      // La lista viene ordenada por fecha descendente desde el
      // backend — insertamos al principio para reflejar eso sin
      // tener que volver a pedir todo el listado.
      onChange([respuesta.data, ...actuaciones]);

      // Si esta actuación tiene fecha de notificación, sugerimos
      // crear el plazo correspondiente (RN-20: todo plazo nace de
      // una notificación) — sin importar el tipo de actuación.
      setActuacionPlazoSugerida(respuesta.data.id);
      setSugerenciaPlazo(Boolean(respuesta.data.fechaNotificacion));

      limpiarForm();
      setMostrarForm(false);
    } catch (err) {
      const mensaje = err.response?.data?.error || 'No se pudo registrar la actuación';
      setError(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  // ------------------------------------------------------------
  // Precarga el form de edición con los datos actuales de la fila.
  // ------------------------------------------------------------
  function iniciarEdicion(actuacion) {
    setActuacionEnEdicionId(actuacion.id);
    setTipoEdit(actuacion.tipo);
    setFechaEdit(aInputFecha(actuacion.fecha));
    setDescripcionEdit(actuacion.descripcion);
    setFechaNotificacionEdit(aInputFecha(actuacion.fechaNotificacion));
    setErrorEdit('');
  }

  function cancelarEdicion() {
    setActuacionEnEdicionId(null);
  }

  async function handleGuardarEdicion(evento) {
    evento.preventDefault();
    setErrorEdit('');
    setGuardandoEdit(true);
  
    try {
      const respuesta = await api.put(`/actuaciones/${actuacionEnEdicionId}`, {
        tipo: tipoEdit,
        fecha: fechaEdit,
        descripcion: descripcionEdit,
        fechaNotificacion: fechaNotificacionEdit || undefined,
      });
  
      const { plazosRecalculados, ...actuacionActualizada } = respuesta.data;
  
      onChange(
        actuaciones.map((a) =>
          a.id === actuacionEnEdicionId ? { ...a, ...actuacionActualizada } : a
        )
      );
      setActuacionEnEdicionId(null);
  
      if (plazosRecalculados?.length > 0) {
        setAvisoRecalculo({ cantidad: plazosRecalculados.length });
        await onPlazosActualizados?.();
      }
    } catch (err) {
      const mensaje = err.response?.data?.error || 'No se pudo guardar la edición';
      setErrorEdit(mensaje);
    } finally {
      setGuardandoEdit(false);
    }
  }

  // ------------------------------------------------------------
  // Paso 1 de eliminar: consulta el impacto antes de pedir
  // confirmación. No borra nada todavía.
  // ------------------------------------------------------------
  async function abrirConfirmacionEliminar(actuacion) {
    setErrorEliminar('');
    setCargandoImpacto(true);
    setImpacto({ actuacionId: actuacion.id }); // abre el modal ya, con estado de carga

    try {
      const respuesta = await api.get(`/actuaciones/${actuacion.id}/impacto-eliminacion`);
      setImpacto({ actuacionId: actuacion.id, ...respuesta.data });
    } catch (err) {
      setErrorEliminar(err.response?.data?.error || 'No se pudo consultar el impacto de la eliminación');
    } finally {
      setCargandoImpacto(false);
    }
  }

  // ------------------------------------------------------------
  // Paso 2 de eliminar: confirmado desde el modal (solo se llega
  // acá si impacto.puedeEliminar === true).
  // ------------------------------------------------------------
  async function confirmarEliminar() {
    setEliminando(true);
    setErrorEliminar('');

    try {
      await api.delete(`/actuaciones/${impacto.actuacionId}`);
      onChange(actuaciones.filter((a) => a.id !== impacto.actuacionId));
      await onPlazosActualizados?.();
      setImpacto(null);
    } catch (err) {
      setErrorEliminar(err.response?.data?.error || 'No se pudo eliminar la actuación');
    } finally {
      setEliminando(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Actuaciones</h2>
        {esAbogado && !mostrarForm && (
          <Button size="sm" onClick={() => setMostrarForm(true)}>
            + Registrar actuación
          </Button>
        )}
      </div>

      {sugerenciaPlazo && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3">
          <p className="text-sm text-blue-700">
            Esta actuación tiene fecha de notificación — ¿querés cargar el plazo correspondiente?
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setSugerenciaPlazo(false);
                onIrAPlazos?.(actuacionPlazoSugerida);
              }}
            >
              Ir a Plazos
            </Button>
            <button
              type="button"
              onClick={() => setSugerenciaPlazo(false)}
              className="text-sm text-blue-400 hover:text-blue-600"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {avisoRecalculo && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-700">
            Se recalculó el vencimiento de {avisoRecalculo.cantidad}{' '}
            {avisoRecalculo.cantidad === 1 ? 'plazo' : 'plazos'} asociado
            {avisoRecalculo.cantidad === 1 ? '' : 's'} a esta actuación. Revisalo en la sección de
            Plazos.
          </p>
          <button
            type="button"
            onClick={() => setAvisoRecalculo(null)}
            className="text-sm text-amber-500 hover:text-amber-700"
          >
            Cerrar
          </button>
        </div>
      )}

      {actuaciones.length === 0 && !mostrarForm && (
        <p className="text-sm text-gray-500">Todavía no hay actuaciones registradas.</p>
      )}

      {actuaciones.length > 0 && (
        <ul className="mb-4 divide-y divide-gray-100">
          {actuaciones.map((actuacion) =>
            actuacionEnEdicionId === actuacion.id ? (
              <li key={actuacion.id} className="py-3 first:pt-0">
                <form
                  ref={edicionActuacionFocus}
                  onSubmit={handleGuardarEdicion}
                  className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <SelectInput
                      label="Tipo de actuación"
                      value={tipoEdit}
                      onChange={(e) => setTipoEdit(e.target.value)}
                      opciones={OPCIONES_TIPO_ACTUACION}
                    />
                    <Input
                      label="Fecha"
                      type="date"
                      value={fechaEdit}
                      onChange={(e) => setFechaEdit(e.target.value)}
                      max={hoyComoInputDate}
                      required
                    />
                  </div>

                  <Textarea
                    label="Descripción"
                    value={descripcionEdit}
                    onChange={(e) => setDescripcionEdit(e.target.value)}
                    required
                    rows={2}
                  />

                  <Input
                    label="Fecha de notificación (opcional)"
                    type="date"
                    lang="es-PY"
                    value={fechaNotificacionEdit}
                    onChange={(e) => setFechaNotificacionEdit(e.target.value)}
                    max={hoyComoInputDate}
                  />
                  <p className="-mt-2 text-xs text-gray-400">
                    Si esta actuación ya tiene plazos pendientes, cambiar la fecha recalcula su
                    vencimiento. Si tiene algún plazo cumplido, el cambio queda bloqueado.
                  </p>

                  {errorEdit && (
                    <p
                      role="alert"
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                    >
                      {errorEdit}
                    </p>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={cancelarEdicion}>
                      Cancelar
                    </Button>
                    <Button type="submit" size="sm" disabled={guardandoEdit}>
                      {guardandoEdit ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                  </div>
                </form>
              </li>
            ) : (
              <li key={actuacion.id} className="py-3 first:pt-0">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatearFechaSola(actuacion.fecha)} · {etiquetaTipoActuacion(actuacion.tipo)}
                    </p>
                    <p className="mt-0.5 text-sm text-gray-600">{actuacion.descripcion}</p>
                    {actuacion.fechaNotificacion && (
                      <p className="mt-1 text-xs text-gray-400">
                        Notificada el {formatearFechaSola(actuacion.fechaNotificacion)}
                        {actuacion.parteProcesal && ` · ${actuacion.parteProcesal.nombre}`}
                      </p>
                    )}
                  </div>
                  {esAbogado && (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => iniciarEdicion(actuacion)}>
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => abrirConfirmacionEliminar(actuacion)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            )
          )}
        </ul>
      )}

      {/* Form inline para registrar una actuación nueva */}
      {mostrarForm && (
        <form
          ref={altaActuacionFocus}
          onSubmit={handleAgregar}
          className="mt-4 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4"
        >
          <p className="text-xs text-gray-500">
            * Campo obligatorio
          </p>
          <div className="grid grid-cols-2 gap-4">
          <SelectInput
            label="Tipo de actuación *"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            opciones={OPCIONES_TIPO_ACTUACION}
            required
          />
            <Input
              label="Fecha *"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              max={hoyComoInputDate}
              required
            />
          </div>

          <Textarea
            label="Descripción *"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            required
            rows={2}
            placeholder="Ej: Resolución que corre traslado de la demanda"
          />

          <Input
            label="Fecha de notificación (opcional)"
            type="date"
            lang="es-PY"
            value={fechaNotificacion}
            onChange={(e) => setFechaNotificacion(e.target.value)}
            max={hoyComoInputDate}
          />
          <p className="-mt-2 text-xs text-gray-400">
            Completá esto si la actuación da origen a un plazo procesal.
          </p>

          {error && <p className="text-sm text-red-600">{error}</p>}

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
            <Button type="submit" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Registrar'}
            </Button>
          </div>
        </form>
      )}

      {/* --- Modal de impacto / confirmación de eliminación ---
          Tres estados posibles:
            1. cargandoImpacto: todavía no sabemos si se puede eliminar.
            2. impacto.puedeEliminar === false: bloqueado (hay un plazo cumplido).
            3. impacto.puedeEliminar === true: confirmar, mostrando los
               plazos PENDIENTE que se borran en cascada (si hay alguno). */}
      {impacto && (
        <Modal title="Eliminar actuación" onClose={() => setImpacto(null)}>
          <div className="px-6 py-5">
            {cargandoImpacto ? (
              <p className="text-sm text-gray-500">Revisando si tiene plazos asociados...</p>
            ) : impacto.puedeEliminar === false ? (
              <p className="text-sm text-gray-700">{impacto.motivo}</p>
            ) : (
              <>
                <p className="text-sm text-gray-700">
                  ¿Seguro que querés eliminar esta actuación? Esta acción no se puede deshacer.
                </p>
                {impacto.plazosPendientes?.length > 0 && (
                  <div className="mt-3 rounded-lg bg-amber-50 p-3">
                    <p className="text-sm font-medium text-amber-800">
                      Se eliminarán también: {impacto.plazosPendientes.length} plazo(s)
                      {impacto.plazosPendientes.lengtxFRh === 1 ? '' : 's'} pendiente(s)
                      {impacto.plazosPendientes.length === 1 ? '' : 's'}:
                    </p>
                    <ul className="mt-2 space-y-1">
                      {impacto.plazosPendientes.map((p) => (
                        <li key={p.id} className="flex items-center gap-2 text-sm text-amber-700">
                          <Badge tone="yellow">Pendiente</Badge>
                          {p.tipoPlazo}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
            {errorEliminar && <p className="mt-3 text-sm text-red-600">{errorEliminar}</p>}
          </div>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setImpacto(null)} disabled={eliminando}>
              {impacto.puedeEliminar === false ? 'Cerrar' : 'Cancelar'}
            </Button>
            {impacto.puedeEliminar && (
              <Button variant="danger" onClick={confirmarEliminar} disabled={eliminando || cargandoImpacto}>
                {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
              </Button>
            )}
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}