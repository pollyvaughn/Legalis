// ============================================
// CLIENTEASESORIASSECCION.JSX
// Sección "Asesorías y trámites" del detalle de un cliente (Módulo 1.3).
// Muestra:
//   - sus próximos vencimientos ABIERTOS (pendientes y en proceso):
//     un clic abre el detalle del trámite, el mismo de Asesorías
//   - sus obligaciones periódicas activas
// Es de solo lectura: las obligaciones se administran desde
// Asesorías & Trámites.
//
// Props:
//   clienteId      id del cliente
//   mostrarEnlace  si es true muestra el enlace a Asesorías filtrado por este
//                  cliente (solo tiene sentido para clientes activos)
// ============================================

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import Badge from '../ui/Badge';
import TramiteDetalleModal from './TramiteDetalleModal';
import UrgenciaBadge from './UrgenciaBadge';
import {
  TONO_ESTADO_TRAMITE,
  etiquetaEstadoTramite,
  etiquetaPeriodicidad,
} from '../../constants/tramites';
import { formatearFechaSola } from '../../utils/fechas';

// Cuántos vencimientos se muestran en la ficha del cliente
const LIMITE_VENCIMIENTOS = 5;

export default function ClienteAsesoriasSeccion({ clienteId, mostrarEnlace }) {
  const [vencimientos, setVencimientos] = useState([]);
  const [totalAbiertos, setTotalAbiertos] = useState(0);
  const [obligaciones, setObligaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Trámite abierto en el detalle (id) o null
  const [detalleId, setDetalleId] = useState(null);

  // ------------------------------------------
  // CARGA: vencimientos abiertos + obligaciones activas del cliente
  // (dos pedidos en paralelo). No pone "cargando" al recargar tras un
  // cambio, para que la lista no parpadee.
  // ------------------------------------------
  async function cargar() {
    setError('');
    try {
      const [rTramites, rObligaciones] = await Promise.all([
        api.get('/tramites', {
          params: { clienteId, estado: 'abiertos', limite: LIMITE_VENCIMIENTOS },
        }),
        api.get('/obligaciones', { params: { clienteId, estado: 'activas' } }),
      ]);
      setVencimientos(rTramites.data.datos);
      setTotalAbiertos(rTramites.data.total);
      setObligaciones(rObligaciones.data);
    } catch (err) {
      setError('No se pudieron cargar los trámites del cliente');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, [clienteId]);

  return (
    <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
      {/* --- Título + enlace a la pantalla completa --- */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Asesorías y trámites</h2>
        {mostrarEnlace && (
          <Link
            to={`/asesorias?clienteId=${clienteId}`}
            className="text-sm text-gray-500 hover:text-gray-800 hover:underline"
          >
            Ver en Asesorías &amp; Trámites
          </Link>
        )}
      </div>

      {cargando ? (
        <p className="text-sm text-gray-500">Cargando trámites...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <div className="space-y-6">
          {/* ========== Vencimientos abiertos ========== */}
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase text-gray-400">
              Vencimientos abiertos ({totalAbiertos})
            </h3>
            {vencimientos.length === 0 ? (
              <p className="text-sm text-gray-500">Este cliente no tiene vencimientos abiertos.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {vencimientos.map((t) => (
                  <li
                    key={t.id}
                    onClick={() => setDetalleId(t.id)}
                    className="flex cursor-pointer items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:bg-gray-50"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {formatearFechaSola(t.fechaVencimiento)}
                        </span>
                        <UrgenciaBadge tramite={t} />
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {t.tipoTramite.nombre} · {t.obligacionId ? 'Periódico' : 'Único'}
                      </p>
                    </div>
                    <Badge tone={TONO_ESTADO_TRAMITE[t.estado]}>{etiquetaEstadoTramite(t.estado)}</Badge>
                  </li>
                ))}
              </ul>
            )}
            {/* Si hay más de los que se muestran, se avisa cuántos faltan */}
            {totalAbiertos > vencimientos.length && (
              <p className="mt-3 text-xs text-gray-500">
                Se muestran los {vencimientos.length} más próximos de {totalAbiertos}.
              </p>
            )}
          </div>

          {/* ========== Obligaciones periódicas activas ========== */}
          <div className="border-t border-gray-100 pt-5">
            <h3 className="mb-2 text-xs font-medium uppercase text-gray-400">
              Obligaciones periódicas activas ({obligaciones.length})
            </h3>
            {obligaciones.length === 0 ? (
              <p className="text-sm text-gray-500">Este cliente no tiene obligaciones periódicas activas.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {obligaciones.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="text-sm text-gray-900">{o.tipoTramite.nombre}</span>
                    <span className="text-sm text-gray-500">{etiquetaPeriodicidad(o)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* --- Detalle del trámite (el mismo modal de Asesorías) --- */}
      {detalleId && (
        <TramiteDetalleModal
          tramiteId={detalleId}
          onClose={() => setDetalleId(null)}
          onCambio={cargar} // refresca la sección tras cualquier cambio
        />
      )}
    </div>
  );
}