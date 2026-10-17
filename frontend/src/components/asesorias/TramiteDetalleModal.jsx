// ============================================
// TRAMITEDETALLEMODAL.JSX
// Detalle de un trámite/vencimiento. Un solo formulario permite
// cambiar ESTADO, FECHA y DESCRIPCIÓN, y todo se guarda junto con
// "Guardar cambios". Además permite eliminar (solo trámites únicos
// sin documentos).
//
// Props:
//   tramiteId  id a mostrar
//   onClose    cierra el modal
//   onCambio   avisa a la lista que refresque tras un cambio
// ============================================

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import UrgenciaBadge from './UrgenciaBadge';
import { OPCIONES_ESTADO_TRAMITE } from '../../constants/tramites';
import { formatearFechaSola, aInputFecha } from '../../utils/fechas';
import DocumentosSeccion from './DocumentosSeccion';
import LiquidacionesSeccion from '../honorarios/LiquidacionesSeccion';
import GastosSeccion from '../honorarios/GastosSeccion';
import CuentaCorrienteSeccion from '../honorarios/CuentaCorrienteSeccion';
import CobrosSeccion from '../cobros/CobrosSeccion';
import { useAuth } from '../../context/AuthContext';

// Un dato del encabezado: etiqueta chica arriba, valor abajo
function Dato({ etiqueta, children }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{etiqueta}</p>
      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-gray-700">{children}</div>
    </div>
  );
}

export default function TramiteDetalleModal({ tramiteId, onClose, onCambio }) {
  const { esAbogado } = useAuth();
  const [tramite, setTramite] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Formulario de edición: estado, fecha y descripción (se guardan juntos)
  const [form, setForm] = useState({ estado: '', fechaVencimiento: '', descripcion: '' });
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false); // true 2,5 s después de guardar

  // Eliminar: confirmación en dos pasos, dentro del mismo modal
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);

  // Sube cada vez que cambian honorarios, gastos o cobros, para refrescar la cuenta corriente (Módulos 3 y 4)
  const [versionCuenta, setVersionCuenta] = useState(0);
  const avisarCambioCuenta = () => setVersionCuenta((v) => v + 1);

  // Sube cada vez que se registra o anula un cobro (Módulo 4). Se usa como "key" de las listas
  // de liquidaciones y gastos: al cambiar se vuelven a cargar y muestran su estado actualizado
  // (Pendiente / Cobrado parcialmente / Cobrado), que el backend recalcula con cada cobro.
  const [versionCobros, setVersionCobros] = useState(0);
  const avisarCambioCobros = () => {
    setVersionCuenta((v) => v + 1); // la cuenta corriente también cambia
    setVersionCobros((v) => v + 1);
  };

  // Guarda el trámite y sincroniza el formulario con sus datos
  function aplicar(datos) {
    setTramite(datos);
    setForm({
      estado: datos.estado,
      fechaVencimiento: aInputFecha(datos.fechaVencimiento),
      descripcion: datos.descripcion || '',
    });
  }

  // Carga el detalle completo al abrir
  useEffect(() => {
    async function cargar() {
      try {
        const respuesta = await api.get(`/tramites/${tramiteId}`);
        aplicar(respuesta.data);
      } catch (err) {
        setError('No se pudo cargar el trámite');
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, [tramiteId]);

  // Un solo handler para los campos de texto y fecha: usa el "name" de cada input
  function handleChange(evento) {
    const { name, value } = evento.target;
    setForm((formAnterior) => ({ ...formAnterior, [name]: value }));
  }

  // ------------------------------------------
  // GUARDAR (estado + fecha + descripción, todo junto)
  // El PUT devuelve el trámite SIN documentos ni obligación; por eso se
  // mezcla con el anterior ({...tramite, ...nuevo}) para no perderlos.
  // ------------------------------------------
  async function handleSubmit(evento) {
    evento.preventDefault();
    setGuardando(true);
    setError('');
    try {
      const respuesta = await api.put(`/tramites/${tramiteId}`, form);
      aplicar({ ...tramite, ...respuesta.data });
      onCambio(); // refresca la lista de atrás
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar los cambios');
    } finally {
      setGuardando(false);
    }
  }

  // ------------------------------------------
  // ELIMINAR (definitivo)
  // ------------------------------------------
  async function eliminar() {
    setGuardando(true);
    setError('');
    try {
      await api.delete(`/tramites/${tramiteId}`);
      onCambio();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo eliminar el trámite');
      setConfirmandoEliminar(false);
      setGuardando(false);
    }
  }

  // ¿Hay cambios sin guardar? Se compara el formulario con lo que hay guardado.
  const hayCambios =
    tramite &&
    (form.estado !== tramite.estado ||
      form.fechaVencimiento !== aInputFecha(tramite.fechaVencimiento) ||
      form.descripcion !== (tramite.descripcion || ''));

  // Solo los únicos sin documentos se pueden eliminar (misma regla que el backend)
  const puedeEliminar = tramite && !tramite.obligacionId && tramite.documentos.length === 0;

  return (
    <Modal title="Detalle del trámite" onClose={onClose} size="lg">
      {cargando ? (
        <p className="px-6 py-10 text-center text-sm text-gray-500">Cargando trámite...</p>
      ) : !tramite ? (
        <p className="px-6 py-10 text-center text-sm text-red-600">{error}</p>
      ) : (
        <div className="space-y-6 px-6 py-5">
          {/* --- Encabezado: trámite + cliente --- */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{tramite.tipoTramite.nombre}</h3>
            <Link
              to={`/clientes/${tramite.cliente.id}`}
              className="text-sm text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline"
            >
              {tramite.cliente.nombreRazonSocial}
            </Link>
          </div>

          {/* --- Ficha de datos (lo que hay GUARDADO) --- */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Dato etiqueta="Vencimiento">
              <span>{formatearFechaSola(tramite.fechaVencimiento)}</span>
              <UrgenciaBadge tramite={tramite} />
            </Dato>
            <Dato etiqueta="Origen">
              {tramite.obligacion
                ? `Periódico ${tramite.obligacion.periodicidad === 'MENSUAL' ? 'mensual' : 'anual'}`
                : 'Único'}
            </Dato>
            <Dato etiqueta="Período">{tramite.periodo || '—'}</Dato>
            <Dato etiqueta="Documentos">{tramite.documentos.length}</Dato>
          </div>

          {/* --- Formulario de edición: estado + fecha + descripción --- */}
          <form onSubmit={handleSubmit} className="space-y-4 border-t border-gray-100 pt-5">
            {/* Estado: los botones solo eligen; se guarda con "Guardar cambios" */}
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">Estado</p>
              <div className="flex flex-wrap gap-2">
                {OPCIONES_ESTADO_TRAMITE.map((op) => (
                  <button
                    key={op.value}
                    type="button"
                    disabled={guardando || !esAbogado}
                    onClick={() => setForm((f) => ({ ...f, estado: op.value }))}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
                      form.estado === op.value
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Fecha de vencimiento"
              type="date"
              name="fechaVencimiento"
              value={form.fechaVencimiento}
              onChange={handleChange}
              required
              disabled={!esAbogado}
            />
            {tramite.obligacion && (
              <p className="-mt-2 text-xs text-gray-500">
                La fecha se calculó según el RUC. Si cae en feriado, ajustala acá.
              </p>
            )}

            <Textarea
              label="Descripción"
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              rows={3}
              maxLength={300}
              disabled={!esAbogado}
            />

            {/* Aviso de estado + botón de guardar */}
            {esAbogado && (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm">
                  {hayCambios ? (
                    <span className="text-amber-600">Tenés cambios sin guardar</span>
                  ) : guardado ? (
                    <span className="text-green-600">Cambios guardados ✓</span>
                  ) : null}
                </p>
                <Button type="submit" size="sm" disabled={!hayCambios || guardando}>
                  {guardando ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </div>
            )}
          </form>

        {/* --- Documentos recibidos (fuera del formulario de arriba: no se anidan <form>) ---
        Al cambiar la lista se actualiza el trámite (cuenta y regla de eliminar)
        y se avisa a la pantalla de atrás para que refresque la columna "Docs". */}
          <DocumentosSeccion
            urlBase={`/tramites/${tramiteId}/documentos`}
            documentos={tramite.documentos}
            onChange={(lista) => {
              setTramite((t) => ({ ...t, documentos: lista }));
              onCambio();
            }}
          />

          {/* --- Cuenta corriente, honorarios y gastos del trámite (Módulo 3): solo ABOGADO --- */}
          {esAbogado && (
            <div className="border-t border-gray-100 pt-5">
              <CuentaCorrienteSeccion urlBase={`/tramites/${tramiteId}/cuenta-corriente`} refrescar={versionCuenta} />
            </div>
          )}
          {esAbogado && (
            <div className="border-t border-gray-100 pt-5">
              <LiquidacionesSeccion
                key={versionCobros}
                urlBase={`/tramites/${tramiteId}/liquidaciones`}
                onChange={avisarCambioCuenta}
              />
            </div>
          )}
          {esAbogado && (
            <div className="border-t border-gray-100 pt-5">
              <GastosSeccion key={versionCobros} urlBase={`/tramites/${tramiteId}/gastos`} onChange={avisarCambioCuenta} />
            </div>
          )}
          {/* --- Cobros y recibos del trámite (Módulo 4): solo ABOGADO --- */}
          {esAbogado && (
            <div className="border-t border-gray-100 pt-5">
              <CobrosSeccion
                urlBase={`/tramites/${tramiteId}/cobros`}
                urlCuenta={`/tramites/${tramiteId}/cuenta-corriente`}
                onChange={avisarCambioCobros}
                refrescar={versionCuenta}
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* --- Eliminar: solo únicos sin documentos --- */}
          {esAbogado && puedeEliminar && (
            <div className="border-t border-gray-100 pt-5">
              {confirmandoEliminar ? (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-gray-700">¿Eliminar este trámite? No se puede deshacer.</p>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setConfirmandoEliminar(false)}>
                      Cancelar
                    </Button>
                    <Button variant="danger" size="sm" onClick={eliminar} disabled={guardando || !esAbogado}>
                      Sí, eliminar
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmandoEliminar(true)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Eliminar trámite
                </button>
              )}
            </div>
          )}
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