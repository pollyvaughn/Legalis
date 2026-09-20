// ============================================
// OBLIGACIONDETALLEMODAL.JSX
// Detalle y administración de una obligación periódica:
//   - EDITAR periodicidad, mes (anuales) y observaciones. Cliente y
//     trámite no se cambian. Si cambia periodicidad o mes, se borran los
//     vencimientos futuros pendientes sin documentos y se regeneran.
//   - Ver los vencimientos que tiene.
//   - Acciones (cada una pide confirmación):
//       Generar siguiente año   completa el año en curso y el siguiente
//       Quitar vencimientos futuros   sirve para deshacer una generación
//       Dar de baja   frena la generación (definitivo)
//
// Props:
//   obligacionId  id a mostrar
//   onClose       cierra el modal
//   onCambio      avisa que hubo cambios (refresca las listas de atrás)
// ============================================

import { useEffect, useState } from 'react';
import api from '../../api/axios';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { Input, SelectInput } from '../ui/Input';
import {
  OPCIONES_PERIODICIDAD,
  MESES,
  TONO_ESTADO_TRAMITE,
  etiquetaEstadoTramite,
} from '../../constants/tramites';
import { formatearFechaSola } from '../../utils/fechas';

// Texto del botón de confirmar de cada acción
const TEXTO_CONFIRMAR = { generar: 'Generar', quitar: 'Quitar', baja: 'Dar de baja' };

export default function ObligacionDetalleModal({ obligacionId, onClose, onCambio }) {
  const [obligacion, setObligacion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState(''); // resultado de la última operación (verde)

  // Formulario de edición
  const [form, setForm] = useState({ periodicidad: 'MENSUAL', mesAnual: '', observaciones: '' });
  const [guardando, setGuardando] = useState(false);

  // Acción abierta: null | 'generar' | 'quitar' | 'baja'  (solo una a la vez)
  const [accion, setAccion] = useState(null);
  const [anioQuitar, setAnioQuitar] = useState('todos');
  const [procesando, setProcesando] = useState(false);

  // Guarda la obligación y sincroniza el formulario con sus datos
  function aplicar(datos) {
    setObligacion(datos);
    setForm({
      periodicidad: datos.periodicidad,
      mesAnual: datos.mesAnual ? String(datos.mesAnual) : '',
      observaciones: datos.observaciones || '',
    });
  }

  // Carga (o recarga) el detalle con sus vencimientos
  async function cargar() {
    try {
      const respuesta = await api.get(`/obligaciones/${obligacionId}`);
      aplicar(respuesta.data);
    } catch (err) {
      setError('No se pudo cargar la obligación');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, [obligacionId]);

  // Un solo handler para todos los campos: usa el "name" de cada input
  function handleChange(evento) {
    const { name, value } = evento.target;
    setForm((formAnterior) => ({ ...formAnterior, [name]: value }));
  }

  // ¿Se tocó la periodicidad o el mes? (eso regenera vencimientos)
  const cambioConfig =
    obligacion &&
    (form.periodicidad !== obligacion.periodicidad ||
      (form.periodicidad === 'ANUAL' && form.mesAnual !== String(obligacion.mesAnual || '')));

  // ¿Hay algo sin guardar?
  const hayCambios =
    obligacion && (cambioConfig || form.observaciones !== (obligacion.observaciones || ''));

  // ------------------------------------------
  // GUARDAR cambios de la obligación
  // ------------------------------------------
  async function guardar(evento) {
    evento.preventDefault();
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const cuerpo = { periodicidad: form.periodicidad, observaciones: form.observaciones };
      if (form.periodicidad === 'ANUAL') cuerpo.mesAnual = form.mesAnual; // el mes solo aplica a las anuales

      const respuesta = await api.put(`/obligaciones/${obligacionId}`, cuerpo);
      const { eliminados, generados } = respuesta.data;
      setMensaje(
        cambioConfig
          ? `Obligación actualizada. Vencimientos eliminados: ${eliminados}. Vencimientos generados: ${generados}.`
          : 'Cambios guardados.'
      );
      await cargar();
      onCambio();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron guardar los cambios');
    } finally {
      setGuardando(false);
    }
  }

  // ------------------------------------------
  // ACCIONES (generar / quitar futuros / baja), todas con confirmación previa
  // ------------------------------------------
  function abrirAccion(nombre) {
    setError('');
    setMensaje('');
    setAnioQuitar('todos');
    setAccion(nombre);
  }

  async function ejecutarAccion() {
    setProcesando(true);
    setError('');
    try {
      if (accion === 'generar') {
        const r = await api.post(`/obligaciones/${obligacionId}/generar-siguiente-anio`);
        setMensaje(
          r.data.generados > 0
            ? `Vencimientos generados: ${r.data.generados}.`
            : 'Ya estaban generados todos los vencimientos hasta el año siguiente.'
        );
      } else if (accion === 'quitar') {
        const r = await api.post(`/obligaciones/${obligacionId}/quitar-futuros`, {
          anio: anioQuitar === 'todos' ? undefined : anioQuitar,
        });
        setMensaje(`Vencimientos eliminados: ${r.data.eliminados}.`);
      } else if (accion === 'baja') {
        const r = await api.patch(`/obligaciones/${obligacionId}/inactivar`);
        setMensaje(`Obligación dada de baja. Vencimientos futuros pendientes eliminados: ${r.data.eliminados}.`);
      }
      setAccion(null);
      await cargar();
      onCambio();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo completar la acción');
    } finally {
      setProcesando(false);
    }
  }

  // Años (de este año en adelante) que tienen vencimientos: opciones de "Quitar"
  const anioActual = new Date().getFullYear();
  const aniosFuturos = obligacion
    ? [
        ...new Set(
          obligacion.tramites
            .map((t) => Number(t.periodo?.slice(0, 4)))
            .filter((anio) => anio >= anioActual)
        ),
      ].sort((a, b) => a - b)
    : [];

  return (
    <Modal title="Obligación periódica" onClose={onClose} size="lg">
      {cargando ? (
        <p className="px-6 py-10 text-center text-sm text-gray-500">Cargando obligación...</p>
      ) : !obligacion ? (
        <p className="px-6 py-10 text-center text-sm text-red-600">{error}</p>
      ) : (
        <div className="space-y-6 px-6 py-5">
          {/* --- Encabezado: trámite + cliente + estado --- */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{obligacion.tipoTramite.nombre}</h3>
              <p className="text-sm text-gray-500">
                {obligacion.cliente.nombreRazonSocial} · RUC {obligacion.cliente.ruc}
              </p>
            </div>
            <Badge tone={obligacion.activa ? 'green' : 'gray'}>
              {obligacion.activa ? 'Activa' : 'Inactiva'}
            </Badge>
          </div>

          {/* --- Resultado de la última operación --- */}
          {mensaje && <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{mensaje}</p>}

          {/* --- Edición (solo si está activa) --- */}
          {obligacion.activa ? (
            <form onSubmit={guardar} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <SelectInput
                  label="Periodicidad"
                  name="periodicidad"
                  value={form.periodicidad}
                  onChange={handleChange}
                  opciones={OPCIONES_PERIODICIDAD}
                />
                {form.periodicidad === 'ANUAL' && (
                  <SelectInput
                    label="Mes de vencimiento"
                    name="mesAnual"
                    value={form.mesAnual}
                    onChange={handleChange}
                    opciones={[{ value: '', label: 'Seleccioná el mes' }, ...MESES]}
                    required
                  />
                )}
              </div>

              <Input
                label="Observaciones"
                name="observaciones"
                value={form.observaciones}
                onChange={handleChange}
                maxLength={300}
              />

              {/* Advertencia: cambiar periodicidad o mes regenera vencimientos */}
              {cambioConfig && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Al guardar se eliminan los vencimientos futuros que sigan pendientes y sin documentos, y se
                  vuelven a generar con la nueva configuración. Lo pasado y lo que ya tuvo movimiento se
                  conserva.
                </p>
              )}

              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={!hayCambios || guardando}>
                  {guardando ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </div>
            </form>
          ) : (
            <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Esta obligación está dada de baja: no genera vencimientos y no se puede editar. Si el cliente
              retoma el servicio, creá una obligación nueva.
            </p>
          )}

          {/* --- Vencimientos de la obligación --- */}
          <div className="border-t border-gray-100 pt-5">
            <h4 className="mb-2 text-sm font-medium text-gray-700">
              Vencimientos ({obligacion.tramites.length})
            </h4>
            {obligacion.tramites.length === 0 ? (
              <p className="text-sm text-gray-500">Todavía no tiene vencimientos generados.</p>
            ) : (
              <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-100">
                <table className="w-full text-left text-sm">
                  <tbody>
                    {obligacion.tramites.map((t) => (
                      <tr key={t.id} className="border-b border-gray-100 last:border-0">
                        <td className="px-4 py-2 text-gray-900">{formatearFechaSola(t.fechaVencimiento)}</td>
                        <td className="px-4 py-2 text-xs text-gray-400">{t.periodo}</td>
                        <td className="px-4 py-2 text-right">
                          <Badge tone={TONO_ESTADO_TRAMITE[t.estado]}>{etiquetaEstadoTramite(t.estado)}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* --- Acciones (solo si está activa) --- */}
          {obligacion.activa && (
            <div className="space-y-4 border-t border-gray-100 pt-5">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" size="sm" disabled={procesando} onClick={() => abrirAccion('generar')}>
                  Generar siguiente año
                </Button>
                <Button variant="secondary" size="sm" disabled={procesando} onClick={() => abrirAccion('quitar')}>
                  Quitar vencimientos futuros
                </Button>
                <button
                  type="button"
                  onClick={() => abrirAccion('baja')}
                  className="ml-auto text-sm text-red-600 hover:underline"
                >
                  Dar de baja
                </button>
              </div>

              {/* Panel de confirmación de la acción elegida */}
              {accion && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                  {accion === 'generar' && (
                    <p>
                      Se completarán los vencimientos que falten de <strong>{anioActual}</strong> (de hoy en
                      adelante) y de <strong>{anioActual + 1}</strong>. Los que ya existen no se duplican. Si lo
                      hacés por error, podés deshacerlo con «Quitar vencimientos futuros».
                    </p>
                  )}

                  {accion === 'quitar' && (
                    <div className="space-y-3">
                      <p>
                        Se eliminan los vencimientos futuros que sigan pendientes y no tengan documentos. Se
                        conserva lo pasado y lo que ya tuvo movimiento. La obligación sigue activa y podés volver a
                        generarlos.
                      </p>
                      <div className="w-56">
                        <SelectInput
                          label="¿De qué año?"
                          name="anioQuitar"
                          value={anioQuitar}
                          onChange={(e) => setAnioQuitar(e.target.value)}
                          opciones={[
                            { value: 'todos', label: 'De todos los años' },
                            ...aniosFuturos.map((anio) => ({ value: anio, label: String(anio) })),
                          ]}
                        />
                      </div>
                    </div>
                  )}

                  {accion === 'baja' && (
                    <div className="space-y-2">
                      <p>¿Dar de baja esta obligación?</p>
                      <ul className="list-disc space-y-1 pl-5 text-gray-600">
                        <li>Se dejan de generar vencimientos nuevos.</li>
                        <li>Se eliminan los futuros que sigan pendientes y sin documentos.</li>
                        <li>Se conserva todo lo pasado y lo que ya tuvo movimiento (historial).</li>
                        <li>No se puede deshacer: si el cliente retoma el servicio, se crea una obligación nueva.</li>
                      </ul>
                    </div>
                  )}

                  <div className="mt-4 flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setAccion(null)}>
                      Cancelar
                    </Button>
                    <Button
                      variant={accion === 'baja' ? 'danger' : 'primary'}
                      size="sm"
                      onClick={ejecutarAccion}
                      disabled={procesando}
                    >
                      {procesando ? 'Procesando...' : TEXTO_CONFIRMAR[accion]}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
}