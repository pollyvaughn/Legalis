// ============================================================
// COBROSPAGE.JSX — Módulo 4 (RF10)
// Pantalla "Cobros & Facturación" (/cobros): listado de todos los
// recibos del estudio, con filtros y paginación del servidor
// (GET /api/cobros), detalle de cada recibo y anulación.
//
// Los cobros NO se registran acá: se registran desde el expediente
// o el trámite correspondiente (así queda atado a un solo caso, RN-31).
// Más adelante (4.3 y 4.4) se suman el recibo en PDF y la pre-factura.
//
// Filtros de servidor: estado, cliente, concepto (tipo de línea),
// desde y hasta. La búsqueda de texto filtra solo la página ya cargada
// (igual que en la pantalla de auditoría).
// Solo ABOGADO: la ruta se protege en App.jsx y el backend responde
// 403 al asistente.
// ============================================================

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import TablaContainer from '../../components/ui/TablaContainer';
import { Input, SelectInput } from '../../components/ui/Input';
import DetalleCobroModal from '../../components/cobros/DetalleCobroModal';
import AnularCobroModal from '../../components/cobros/AnularCobroModal';
import { formatearFechaSola } from '../../utils/fechas';
import { formatearGs } from '../../utils/moneda';
import {
  OPCIONES_ESTADO_RECIBO,
  OPCIONES_TIPO_LINEA,
  TONO_ESTADO_RECIBO,
  etiquetaEstadoRecibo,
  etiquetaMetodoPago,
  origenDeCobro,
} from '../../constants/cobros';

const LIMITE_POR_PAGINA = 20;

// Quita tildes y pasa a minúscula, para que "gomez" encuentre "Gómez"
const normalizar = (texto) =>
  (texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function CobrosPage() {
  // Filtros de servidor ("" = sin filtrar)
  const [estado, setEstado] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [tipo, setTipo] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [pagina, setPagina] = useState(1);

  // Búsqueda de texto libre, en cliente, sobre la página ya cargada
  const [busqueda, setBusqueda] = useState('');

  const [opcionesCliente, setOpcionesCliente] = useState([{ value: '', label: 'Todos los clientes' }]);
  const [resultado, setResultado] = useState({ datos: [], total: 0, pagina: 1, totalPaginas: 1 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Sube cada vez que se anula un recibo, para volver a pedir la lista
  const [version, setVersion] = useState(0);

  const [verId, setVerId] = useState(null); // recibo abierto en el detalle
  const [anulando, setAnulando] = useState(null); // recibo que se está por anular

  // ------------------------------------------
  // CLIENTES para el filtro (una sola vez). Se piden todos, activos e
  // inactivos: un cliente inactivo también puede tener recibos. El backend
  // da hasta 100 por pedido, de sobra para un estudio unipersonal.
  // ------------------------------------------
  useEffect(() => {
    api
      .get('/clientes', { params: { estado: 'todos', limite: 100 } })
      .then((respuesta) => {
        setOpcionesCliente([
          { value: '', label: 'Todos los clientes' },
          ...respuesta.data.datos.map((c) => ({ value: String(c.id), label: c.nombreRazonSocial })),
        ]);
      })
      .catch(() => {}); // si falla, el filtro queda solo con "Todos"
  }, []);

  // ------------------------------------------
  // RECIBOS: se piden de nuevo al cambiar un filtro, la página o "version"
  // ------------------------------------------
  useEffect(() => {
    let vigente = true; // evita actualizar el estado si ya cambió un filtro
    async function cargar() {
      setCargando(true);
      setError('');
      try {
        // params: axios arma el query string y omite lo undefined
        const respuesta = await api.get('/cobros', {
          params: {
            estado: estado || undefined,
            clienteId: clienteId || undefined,
            tipo: tipo || undefined,
            desde: desde || undefined,
            hasta: hasta || undefined,
            pagina,
            limite: LIMITE_POR_PAGINA,
          },
        });
        if (vigente) setResultado(respuesta.data); // { datos, total, pagina, limite, totalPaginas }
      } catch (err) {
        if (vigente) setError(err.response?.data?.error || 'No se pudieron cargar los recibos');
      } finally {
        if (vigente) setCargando(false);
      }
    }
    cargar();
    return () => {
      vigente = false;
    };
  }, [estado, clienteId, tipo, desde, hasta, pagina, version]);

  // Cambiar cualquier filtro de servidor vuelve a la página 1
  const cambiarFiltro = (setter) => (valor) => {
    setter(valor);
    setPagina(1);
  };

  // Búsqueda en cliente: por número de recibo, cliente, expediente/trámite y concepto
  const filasVisibles = resultado.datos.filter((cobro) => {
    if (!busqueda.trim()) return true;
    const texto = normalizar(
      `${cobro.numero} ${cobro.cliente.nombreRazonSocial} ${origenDeCobro(cobro).texto} ${cobro.concepto || ''}`
    );
    return texto.includes(normalizar(busqueda));
  });

  // Desde el detalle: se cierra y se abre la confirmación de anulación
  function pedirAnulacionDesdeDetalle(cobro) {
    setVerId(null);
    setAnulando(cobro);
  }

  function alAnular() {
    setAnulando(null);
    setVersion((v) => v + 1);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Cobros &amp; Facturación</h1>
        <p className="text-sm text-gray-500">
          Recibos emitidos. Para registrar un cobro entrá al expediente o trámite correspondiente (sección &ldquo;Cobros
          y recibos&rdquo;).
        </p>
      </div>

      {/* --- Filtros de servidor --- */}
      <div className="flex flex-wrap gap-3">
        <SelectInput
          label="Estado"
          name="estado"
          opciones={OPCIONES_ESTADO_RECIBO}
          value={estado}
          onChange={(e) => cambiarFiltro(setEstado)(e.target.value)}
        />
        <SelectInput
          label="Cliente"
          name="clienteId"
          opciones={opcionesCliente}
          value={clienteId}
          onChange={(e) => cambiarFiltro(setClienteId)(e.target.value)}
        />
        <SelectInput
          label="Concepto"
          name="tipo"
          opciones={OPCIONES_TIPO_LINEA}
          value={tipo}
          onChange={(e) => cambiarFiltro(setTipo)(e.target.value)}
        />
        <Input
          label="Desde"
          name="desde"
          type="date"
          value={desde}
          max={hasta || undefined}
          onChange={(e) => cambiarFiltro(setDesde)(e.target.value)}
        />
        <Input
          label="Hasta"
          name="hasta"
          type="date"
          value={hasta}
          min={desde || undefined}
          onChange={(e) => cambiarFiltro(setHasta)(e.target.value)}
        />
      </div>

      <TablaContainer
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        placeholder="Buscar N°, cliente, expediente..."
        cantidad={filasVisibles.length}
        unidad="recibo"
      >
        {cargando ? (
          <p className="px-5 py-6 text-sm text-gray-500">Cargando recibos...</p>
        ) : error ? (
          <p className="px-5 py-6 text-sm text-red-600">{error}</p>
        ) : filasVisibles.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-500">No hay recibos que coincidan.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="px-5 py-2">N°</th>
                <th className="px-5 py-2">Fecha</th>
                <th className="px-5 py-2">Cliente</th>
                <th className="px-5 py-2">Expediente / Trámite</th>
                <th className="px-5 py-2">Método</th>
                <th className="px-5 py-2 text-right">Total</th>
                <th className="px-5 py-2">Estado</th>
                <th className="px-5 py-2" />
              </tr>
            </thead>
            <tbody>
              {filasVisibles.map((cobro) => {
                const anulado = cobro.estado === 'ANULADO';
                const origen = origenDeCobro(cobro);
                return (
                  <tr key={cobro.id} className="border-b border-gray-50 last:border-0">
                    <td className={`px-5 py-2 font-medium ${anulado ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {cobro.numero}
                    </td>
                    <td className="px-5 py-2 whitespace-nowrap text-gray-600">{formatearFechaSola(cobro.fecha)}</td>
                    <td className="px-5 py-2 text-gray-700">
                      <Link to={`/clientes/${cobro.cliente.id}`} className="hover:underline">
                        {cobro.cliente.nombreRazonSocial}
                      </Link>
                    </td>
                    <td className="px-5 py-2 text-gray-700">
                      {origen.enlace ? (
                        <Link to={origen.enlace} className="hover:underline">
                          {origen.texto}
                        </Link>
                      ) : (
                        origen.texto
                      )}
                    </td>
                    <td className="px-5 py-2 text-gray-600">{etiquetaMetodoPago(cobro.metodoPago)}</td>
                    <td
                      className={`px-5 py-2 text-right whitespace-nowrap font-medium ${
                        anulado ? 'text-gray-400 line-through' : 'text-gray-900'
                      }`}
                    >
                      {formatearGs(cobro.total)}
                    </td>
                    <td className="px-5 py-2">
                      <Badge tone={TONO_ESTADO_RECIBO[cobro.estado] || 'gray'}>{etiquetaEstadoRecibo(cobro.estado)}</Badge>
                    </td>
                    <td className="px-5 py-2 whitespace-nowrap text-right">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setVerId(cobro.id)}>
                        Ver
                      </Button>
                      {!anulado && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setAnulando(cobro)}
                        >
                          Anular
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </TablaContainer>

      {/* Paginación (de servidor: usa resultado.total, no filasVisibles) */}
      {resultado.totalPaginas > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Página {resultado.pagina} de {resultado.totalPaginas} ({resultado.total} recibos en total)
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

      {/* --- Modales --- */}
      {verId && (
        <DetalleCobroModal cobroId={verId} onClose={() => setVerId(null)} onAnular={pedirAnulacionDesdeDetalle} />
      )}
      {anulando && <AnularCobroModal cobro={anulando} onClose={() => setAnulando(null)} onAnulado={alAnular} />}
    </div>
  );
}