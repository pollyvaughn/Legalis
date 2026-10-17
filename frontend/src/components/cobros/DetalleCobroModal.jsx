// ============================================================
// DETALLECOBROMODAL.JSX — Módulo 4 (RF10)
// Detalle de un recibo (solo lectura): datos del pago, líneas, total,
// saldo actual del expediente / trámite y, si está anulado, cuándo,
// quién y por qué. Se abre desde el listado de la pantalla /cobros.
//
// Props:
//   cobroId   id del recibo (se pide GET /cobros/:id)
//   onClose   cerrar
//   onAnular  (opcional) (cobro) se llama al tocar "Anular recibo"; si no se
//             pasa, el botón no aparece. El padre abre AnularCobroModal.
// ============================================================

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { formatearFechaSola, formatearFechaHora } from '../../utils/fechas';
import { formatearGs } from '../../utils/moneda';
import {
  etiquetaMetodoPago,
  etiquetaLinea,
  etiquetaEstadoRecibo,
  TONO_ESTADO_RECIBO,
  origenDeCobro,
} from '../../constants/cobros';

// Un dato del encabezado: etiqueta chica arriba, valor abajo
function Dato({ etiqueta, children }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{etiqueta}</p>
      <div className="mt-0.5 text-sm text-gray-700">{children}</div>
    </div>
  );
}

export default function DetalleCobroModal({ cobroId, onClose, onAnular }) {
  const [cobro, setCobro] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true; // evita actualizar el estado si el modal ya se cerró
    async function cargar() {
      try {
        const respuesta = await api.get(`/cobros/${cobroId}`);
        if (vigente) setCobro(respuesta.data);
      } catch (err) {
        if (vigente) setError(err.response?.data?.error || 'No se pudo cargar el recibo');
      }
    }
    cargar();
    return () => {
      vigente = false;
    };
  }, [cobroId]);

  const origen = cobro ? origenDeCobro(cobro) : null;

  return (
    <Modal title={cobro ? `Recibo N° ${cobro.numero}` : 'Recibo'} onClose={onClose} size="lg">
      {!cobro && !error && <p className="px-6 py-5 text-sm text-gray-500">Cargando recibo...</p>}
      {error && <p className="px-6 py-5 text-sm text-red-600">{error}</p>}

      {cobro && (
        <>
          <div className="space-y-5 px-6 py-5">
            {/* --- Encabezado --- */}
            <div className="grid grid-cols-2 gap-4">
              <Dato etiqueta="Estado">
                <Badge tone={TONO_ESTADO_RECIBO[cobro.estado] || 'gray'}>{etiquetaEstadoRecibo(cobro.estado)}</Badge>
              </Dato>
              <Dato etiqueta="Fecha del cobro">{formatearFechaSola(cobro.fecha)}</Dato>
              <Dato etiqueta="Cliente">
                <Link to={`/clientes/${cobro.cliente.id}`} className="underline hover:text-gray-900">
                  {cobro.cliente.nombreRazonSocial}
                </Link>
              </Dato>
              <Dato etiqueta={cobro.expediente ? 'Expediente' : 'Trámite'}>
                {origen.enlace ? (
                  <Link to={origen.enlace} className="underline hover:text-gray-900">
                    {origen.texto}
                  </Link>
                ) : (
                  origen.texto
                )}
              </Dato>
              <Dato etiqueta="Método de pago">{etiquetaMetodoPago(cobro.metodoPago)}</Dato>
              <Dato etiqueta="Referencia">{cobro.referenciaPago || '—'}</Dato>
              {cobro.concepto && (
                <div className="col-span-2">
                  <Dato etiqueta="Concepto">{cobro.concepto}</Dato>
                </div>
              )}
            </div>

            {/* --- Líneas del recibo --- */}
            <div>
              <p className="mb-1 text-xs text-gray-400">Detalle</p>
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                {cobro.lineas.map((linea) => (
                  <li key={linea.id} className="flex items-center justify-between px-4 py-2 text-sm">
                    <span className="text-gray-700">{etiquetaLinea(linea.tipo)}</span>
                    <span className="font-medium text-gray-900">{formatearGs(linea.monto)}</span>
                  </li>
                ))}
                <li className="flex items-center justify-between bg-gray-50 px-4 py-2 text-sm">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-semibold text-gray-900">{formatearGs(cobro.total)}</span>
                </li>
              </ul>
            </div>

            {/* --- Saldo actual (puede ser negativo = a favor del cliente) --- */}
            <Dato etiqueta="Saldo actual del expediente / trámite">
              {cobro.saldoActual < 0
                ? `${formatearGs(Math.abs(cobro.saldoActual))} a favor del cliente`
                : formatearGs(cobro.saldoActual)}
            </Dato>

            {/* --- Anulación --- */}
            {cobro.anulacion && (
              <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                <p>
                  Anulado el {formatearFechaHora(cobro.anulacion.fecha)}
                  {cobro.anulacion.por?.nombre ? ` por ${cobro.anulacion.por.nombre}` : ''}.
                </p>
                <p className="mt-1">Motivo: {cobro.anulacion.motivo}</p>
              </div>
            )}

            <p className="text-xs text-gray-400">
              Registrado el {formatearFechaHora(cobro.creadoEn)}
              {cobro.creadoPor?.nombre ? ` por ${cobro.creadoPor.nombre}` : ''}.
            </p>
          </div>

          <Modal.Footer>
            <Button variant="secondary" onClick={onClose}>
              Cerrar
            </Button>
            {onAnular && cobro.estado === 'EMITIDO' && (
              <Button variant="danger" onClick={() => onAnular(cobro)}>
                Anular recibo
              </Button>
            )}
          </Modal.Footer>
        </>
      )}
    </Modal>
  );
}