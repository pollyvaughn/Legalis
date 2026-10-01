// ============================================================
// AUDITORIA PAGE
// Pantalla de consulta exclusiva del ABOGADO (RNF 11.6).
// Lista paginada con filtros por entidad, acción y rango de
// fechas. SOLO LECTURA: no hay editar/eliminar a propósito.
// ============================================================
import { useEffect, useState } from 'react';
import TablaContainer from '../../components/ui/TablaContainer';
import { SelectInput, Input } from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { listarAuditoria, listarEntidadesAuditoria } from '../../services/auditoria.service';
import { ETIQUETA_ACCION, TONO_ACCION } from '../../constants/auditoria';

// Opciones fijas de acción (espejo del enum AccionAuditoria de Prisma)
const OPCIONES_ACCION = [
  { value: '', label: 'Todas las acciones' },
  ...Object.entries(ETIQUETA_ACCION).map(([value, label]) => ({ value, label })),
];

export default function AuditoriaPage() {
  // Filtros de servidor: entidad, acción y rango de fechas
  const [entidad, setEntidad] = useState('');
  const [accion, setAccion] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  // Búsqueda de texto libre, en cliente, sobre el "detalle" de la
  // página ya cargada (mismo rol que "busqueda" en TablaContainer
  // en las otras pantallas: filtra lo que ya está en pantalla)
  const [busqueda, setBusqueda] = useState('');

  const [opcionesEntidad, setOpcionesEntidad] = useState([{ value: '', label: 'Todas las entidades' }]);
  const [resultado, setResultado] = useState({ datos: [], total: 0, pagina: 1, totalPaginas: 1 });
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Carga el listado de entidades UNA sola vez, al montar
  useEffect(() => {
    listarEntidadesAuditoria()
      .then((lista) => {
        setOpcionesEntidad([
          { value: '', label: 'Todas las entidades' },
          ...lista.map((e) => ({ value: e, label: e })),
        ]);
      })
      .catch(() => {}); // si falla, el filtro queda solo con "Todas"
  }, []);

  // Recarga la tabla cada vez que cambia un filtro de servidor o la página
  useEffect(() => {
    setCargando(true);
    setError(null);

    listarAuditoria({ entidad, accion, desde, hasta, pagina })
      .then(setResultado)
      .catch(() => setError('No se pudo cargar la auditoría'))
      .finally(() => setCargando(false));
  }, [entidad, accion, desde, hasta, pagina]);

  // Cambiar cualquier filtro de servidor vuelve a la página 1
  const cambiarFiltro = (setter) => (valor) => {
    setter(valor);
    setPagina(1);
  };

  // Filtro de texto libre en cliente: solo sobre el detalle de la
  // página ya traída (la paginación real sigue siendo del servidor)
  const filasVisibles = resultado.datos.filter((fila) =>
    (fila.detalle ?? '').toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Auditoría del sistema</h1>
        <p className="text-sm text-gray-500">
          Historial de altas, ediciones, inactivaciones y bajas registradas en el sistema.
        </p>
      </div>

      {/* Filtros de servidor */}
      <div className="flex flex-wrap gap-3">
        <SelectInput
          label="Entidad"
          name="entidad"
          opciones={opcionesEntidad}
          value={entidad}
          onChange={(e) => cambiarFiltro(setEntidad)(e.target.value)}
        />
        <SelectInput
          label="Acción"
          name="accion"
          opciones={OPCIONES_ACCION}
          value={accion}
          onChange={(e) => cambiarFiltro(setAccion)(e.target.value)}
        />
        <Input
          label="Desde"
          name="desde"
          type="date"
          value={desde}
          onChange={(e) => cambiarFiltro(setDesde)(e.target.value)}
        />
        <Input
          label="Hasta"
          name="hasta"
          type="date"
          value={hasta}
          onChange={(e) => cambiarFiltro(setHasta)(e.target.value)}
        />
      </div>

      <TablaContainer
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        placeholder="Buscar en el detalle..."
        cantidad={filasVisibles.length}
        unidad="registro"
      >
        {cargando ? (
          <p className="px-5 py-6 text-sm text-gray-500">Cargando auditoría...</p>
        ) : error ? (
          <p className="px-5 py-6 text-sm text-red-600">{error}</p>
        ) : filasVisibles.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-500">No hay registros que coincidan.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="px-5 py-2">Fecha</th>
                <th className="px-5 py-2">Usuario</th>
                <th className="px-5 py-2">Acción</th>
                <th className="px-5 py-2">Entidad</th>
                <th className="px-5 py-2">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {filasVisibles.map((fila) => (
                <tr key={fila.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-2 whitespace-nowrap text-gray-600">
                    {new Date(fila.fecha).toLocaleString('es-PY')}
                  </td>
                  <td className="px-5 py-2 text-gray-700">{fila.usuario?.nombre ?? '—'}</td>
                  <td className="px-5 py-2">
                    <Badge tone={TONO_ACCION[fila.accion] ?? 'gray'}>
                      {ETIQUETA_ACCION[fila.accion] ?? fila.accion}
                    </Badge>
                  </td>
                  <td className="px-5 py-2 text-gray-700">{fila.entidad}</td>
                  <td className="px-5 py-2 text-gray-600">{fila.detalle ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TablaContainer>

      {/* Paginación (de servidor: usa resultado.total, no filasVisibles) */}
      {resultado.totalPaginas > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Página {resultado.pagina} de {resultado.totalPaginas} ({resultado.total} registros en total)
          </span>
          <div className="flex gap-2">
            <button
              disabled={pagina <= 1}
              onClick={() => setPagina((p) => p - 1)}
              className="rounded border border-gray-200 px-3 py-1 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              disabled={pagina >= resultado.totalPaginas}
              onClick={() => setPagina((p) => p + 1)}
              className="rounded border border-gray-200 px-3 py-1 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}