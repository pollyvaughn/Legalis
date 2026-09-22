// ============================================
// OBLIGACIONESTAB.JSX
// Pestaña "Obligaciones periódicas" de Asesorías & Trámites: lista de
// las obligaciones (cliente + trámite + periodicidad). Clic en una fila
// (o en "Administrar") abre el detalle, donde se edita la obligación y
// se ejecutan sus acciones (generar siguiente año, quitar futuros, baja).
// Sin paginación (el backend devuelve un array).
//
// Props:
//   clientes / tipos       opciones para los filtros
//   onCambioVencimientos   refresca la lista de vencimientos de la pantalla
// ============================================

import { useEffect, useState } from 'react';
import api from '../../api/axios';
import Badge from '../ui/Badge';
import { SelectInput } from '../ui/Input';
import ObligacionDetalleModal from './ObligacionDetalleModal';
import { etiquetaPeriodicidad } from '../../constants/tramites';
import { useAuth } from '../../context/AuthContext';

// Filtro de estado (el default es "activas")
const FILTROS_ESTADO = [
  { value: 'activas', label: 'Activas' },
  { value: 'inactivas', label: 'Inactivas' },
  { value: 'todas', label: 'Todas' },
];

export default function ObligacionesTab({ clientes, tipos, onCambioVencimientos }) {
  const { esAbogado } = useAuth();
  const [obligaciones, setObligaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // --- Filtros ---
  const [filtroEstado, setFiltroEstado] = useState('activas');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  // Obligación abierta en el detalle (id) o null
  const [detalleId, setDetalleId] = useState(null);

  // ------------------------------------------
  // CARGA DE LA LISTA
  // ------------------------------------------
  async function cargarObligaciones() {
    setCargando(true);
    setError('');
    try {
      const respuesta = await api.get('/obligaciones', {
        params: {
          estado: filtroEstado,
          clienteId: filtroCliente || undefined,
          tipoTramiteId: filtroTipo || undefined,
        },
      });
      setObligaciones(respuesta.data);
    } catch (err) {
      setError('No se pudieron cargar las obligaciones');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarObligaciones();
  }, [filtroEstado, filtroCliente, filtroTipo]);

  // Tras cualquier cambio en el detalle: refresca esta lista y la de vencimientos
  function manejarCambio() {
    cargarObligaciones();
    onCambioVencimientos();
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      {/* --- Filtros: chips de estado + selects de cliente y trámite --- */}
      <div className="space-y-3 border-b border-gray-100 px-5 py-4">
        <div className="flex flex-wrap gap-2">
          {FILTROS_ESTADO.map((f) => (
            <button
              key={f.value}
              onClick={() => setFiltroEstado(f.value)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                filtroEstado === f.value
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="w-56">
            <SelectInput
              name="filtroClienteOb"
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              opciones={[{ value: '', label: 'Todos los clientes' }, ...clientes]}
            />
          </div>
          <div className="w-56">
            <SelectInput
              name="filtroTipoOb"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              opciones={[{ value: '', label: 'Todos los trámites' }, ...tipos]}
            />
          </div>
        </div>
      </div>

      {error && <p className="px-5 py-3 text-sm text-red-600">{error}</p>}

      {/* --- Tabla --- */}
      {cargando ? (
        <p className="px-5 py-8 text-center text-sm text-gray-500">Cargando obligaciones...</p>
      ) : obligaciones.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-gray-500">
          {filtroCliente || filtroTipo || filtroEstado !== 'activas'
            ? 'No hay obligaciones que coincidan con este filtro.'
            : 'Todavía no hay obligaciones periódicas. Creá la primera con «+ Obligación periódica».'}
        </p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs font-medium text-gray-500">
              <th className="px-5 py-3">Cliente</th>
              <th className="px-5 py-3">Trámite</th>
              <th className="px-5 py-3">Periodicidad</th>
              <th className="px-5 py-3">Vencimientos</th>
              <th className="px-5 py-3">Estado</th>
              <th className="px-5 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {obligaciones.map((o) => (
              <tr
                key={o.id}
                onClick={() => setDetalleId(o.id)}
                className="cursor-pointer border-t border-gray-100 hover:bg-gray-50"
              >
                <td className="px-5 py-3">
                  <p className="text-gray-900">{o.cliente.nombreRazonSocial}</p>
                  <p className="text-xs text-gray-400">RUC {o.cliente.ruc}</p>
                </td>
                <td className="px-5 py-3 text-gray-900">{o.tipoTramite.nombre}</td>
                <td className="px-5 py-3 text-gray-600">{etiquetaPeriodicidad(o)}</td>
                <td className="px-5 py-3 text-gray-600">{o._count.tramites}</td>
                <td className="px-5 py-3">
                  <Badge tone={o.activa ? 'green' : 'gray'}>{o.activa ? 'Activa' : 'Inactiva'}</Badge>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className="rounded-lg px-2.5 py-1 text-sm text-gray-600">
                    {esAbogado ? 'Administrar' : 'Ver'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* --- Detalle / administración de la obligación --- */}
      {detalleId && (
        <ObligacionDetalleModal
          obligacionId={detalleId}
          onClose={() => setDetalleId(null)}
          onCambio={manejarCambio}
        />
      )}
    </div>
  );
}