// ============================================================
// ActuacionesSeccion.jsx
// Sección de ExpedienteDetailPage: historial cronológico de
// actuaciones del expediente (RF5) + form inline para cargar una
// nueva. Mismo patrón visual que la sección de Partes procesales
// (lista + botón "+ Agregar" que despliega un form inline, sin modal).
//
// Recibe la lista de actuaciones como prop (ya vienen incluidas
// en el GET del expediente) y notifica al padre cuando cambian,
// igual que DocumentosSeccion.
// ============================================================

import { useState } from 'react';
import api from '../../api/axios';
import Button from '../ui/Button';
import { Input, SelectInput, Textarea } from '../ui/Input';
import { OPCIONES_TIPO_ACTUACION, etiquetaTipoActuacion } from '../../constants/tiposActuacion';
import { useAuth } from '../../context/AuthContext';

// Fecha ISO (2026-09-22) → formato legible corto (22 sep 2026)
function formatearFecha(fechaIso) {
  if (!fechaIso) return null;
  return new Date(fechaIso).toLocaleDateString('es-PY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function ActuacionesSeccion({ expedienteId, actuaciones, onChange }) {
  const { esAbogado } = useAuth();

  const [mostrarForm, setMostrarForm] = useState(false);
  const [tipo, setTipo] = useState(OPCIONES_TIPO_ACTUACION[0].value);
  const [fecha, setFecha] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaNotificacion, setFechaNotificacion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Fecha de hoy en formato yyyy-mm-dd, para el atributo 'max' de
  // los inputs de fecha — el calendario nativo no deja elegir un
  // día posterior, así se evita el 400 del backend antes de que
  // llegue a mandarse el pedido.
  const hoyComoInputDate = new Date().toISOString().slice(0, 10);

  // Sugerencia momentánea tras guardar una actuación CON fecha de
  // notificación: recuerda armar el plazo correspondiente. Es solo
  // un aviso puntual (no persiste al recargar ni queda pegado a la
  // actuación en la lista) — se cierra sola al tocar cualquier otra
  // cosa de la sección.
  const [sugerenciaPlazo, setSugerenciaPlazo] = useState(false);

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
                // Solo cierra el aviso; el alta del plazo se hace
                // manualmente en la sección de Plazos, más abajo.
                setSugerenciaPlazo(false);
                document.getElementById('plazos-seccion')?.scrollIntoView({ behavior: 'smooth' });
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

      {actuaciones.length === 0 && !mostrarForm && (
        <p className="text-sm text-gray-500">Todavía no hay actuaciones registradas.</p>
      )}

      {actuaciones.length > 0 && (
        <ul className="mb-4 divide-y divide-gray-100">
          {actuaciones.map((actuacion) => (
            <li key={actuacion.id} className="py-3 first:pt-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {formatearFecha(actuacion.fecha)} · {etiquetaTipoActuacion(actuacion.tipo)}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-600">{actuacion.descripcion}</p>
                  {actuacion.fechaNotificacion && (
                    <p className="mt-1 text-xs text-gray-400">
                      Notificada el {formatearFecha(actuacion.fechaNotificacion)}
                      {actuacion.parteProcesal && ` · ${actuacion.parteProcesal.nombre}`}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Form inline para registrar una actuación nueva.
          No incluye edición/eliminación acá: si hace falta corregir
          o borrar una actuación ya cargada, se maneja aparte (no
          forma parte de este alcance inicial). */}
      {mostrarForm && (
        <form onSubmit={handleAgregar} className="space-y-3 border-t border-gray-100 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <SelectInput
              label="Tipo de actuación"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              opciones={OPCIONES_TIPO_ACTUACION}
            />
            <Input
              label="Fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              max={hoyComoInputDate}
              required
            />
          </div>

          <Textarea
            label="Descripción"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            required
            rows={2}
            placeholder="Ej: Resolución que corre traslado de la demanda"
          />

          <Input
            label="Fecha de notificación (opcional)"
            type="date"
            value={fechaNotificacion}
            onChange={(e) => setFechaNotificacion(e.target.value)}
            max={hoyComoInputDate}
          />
          <p className="-mt-2 text-xs text-gray-400">
            Completá esto si la actuación da origen a un plazo procesal.
          </p>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <Button type="submit" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar actuación'}
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
        </form>
      )}
    </div>
  );
}