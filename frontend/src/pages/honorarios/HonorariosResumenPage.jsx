// ============================================================
// HONORARIOSRESUMENPAGE.JSX — Módulo 3 (3.4b)
// Panel resumen del menú "Honorarios & Gastos" (/honorarios).
// Solo LEE (GET /api/cuenta-corriente); no carga ni modifica nada:
// los honorarios y gastos se cargan dentro de cada expediente/trámite.
//
// Muestra:
//   - Tarjetas con los totales del estudio (honorarios, gastos,
//     a cobrar, cobrado y saldo pendiente)
//   - Tabla por cliente (el que más debe primero) con buscador y
//     enlace al detalle del cliente, donde está su cuenta corriente
//
// Botón "Exportar PDF": descarga el panel completo por cliente (GET /cuenta-corriente/exportar).
// Solo ABOGADO: la ruta se protege en App.jsx y el backend responde
// 403 al asistente.
// ============================================================

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import TablaContainer from '../../components/ui/TablaContainer';
import { descargarPdf } from '../../utils/descargarPdf';
import { formatearGs } from '../../utils/moneda';
import { plural } from '../../utils/textos';

// Tarjeta de un total (título chico arriba, monto grande, detalle opcional)
function TarjetaTotal({ titulo, monto, detalle, destacada = false }) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        destacada ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white'
      }`}
    >
      <p className={`text-xs font-medium ${destacada ? 'text-gray-300' : 'text-gray-500'}`}>{titulo}</p>
      <p className={`mt-1 text-xl font-semibold ${destacada ? 'text-white' : 'text-gray-900'}`}>{monto}</p>
      {detalle && <p className={`mt-1 text-xs ${destacada ? 'text-gray-300' : 'text-gray-400'}`}>{detalle}</p>}
    </div>
  );
}

// Quita tildes y pasa a minúscula, para que "gomez" encuentre "Gómez"
const normalizar = (texto) =>
  (texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function HonorariosResumenPage() {
  const [datos, setDatos] = useState(null); // { totales, clientes }
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [exportando, setExportando] = useState(false);

  // ------------------------------------------
  // EXPORTAR el panel completo a PDF (todos los clientes con movimientos)
  // ------------------------------------------
  async function exportarPdf() {
    setExportando(true);
    setError('');
    try {
      await descargarPdf('/cuenta-corriente/exportar', 'honorarios-y-gastos-por-cliente.pdf');
    } catch (err) {
      setError(err.message);
    } finally {
      setExportando(false);
    }
  }

  // ------------------------------------------
  // CARGA DEL PANEL (una sola vez al entrar a la pantalla)
  // ------------------------------------------
  useEffect(() => {
    let vigente = true; // evita actualizar el estado si se salió de la pantalla
    async function cargar() {
      try {
        const respuesta = await api.get('/cuenta-corriente');
        if (vigente) setDatos(respuesta.data);
      } catch (err) {
        if (vigente) setError(err.response?.data?.error || 'No se pudo cargar el panel de honorarios');
      } finally {
        if (vigente) setCargando(false);
      }
    }
    cargar();
    return () => {
      vigente = false;
    };
  }, []);

  // Filtro local por nombre o RUC (el backend ya manda todo ordenado por saldo)
  const clientesFiltrados = (datos?.clientes || []).filter((c) => {
    const texto = normalizar(busqueda);
    return !texto || normalizar(c.nombreRazonSocial).includes(texto) || normalizar(c.ruc).includes(texto);
  });

  const totales = datos?.totales;

  return (
    <div>
      {/* --- Título --- */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Honorarios & Gastos</h1>
          <p className="mt-1 text-sm text-gray-500">
            Resumen de lo que se debe por cliente. Los honorarios y gastos se cargan dentro de cada
            expediente o trámite.
          </p>
        </div>
        <Button variant="secondary" onClick={exportarPdf} disabled={!datos || exportando}>
          {exportando ? 'Generando...' : 'Exportar PDF'}
        </Button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {cargando ? (
        <p className="text-sm text-gray-500">Cargando panel...</p>
      ) : (
        totales && (
          <>
            {/* --- Tarjetas de totales --- */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <TarjetaTotal
                titulo="Honorarios (con IVA)"
                monto={formatearGs(totales.honorarios.total)}
                detalle={`neto ${formatearGs(totales.honorarios.neto)} + IVA ${formatearGs(totales.honorarios.iva)}`}
              />
              <TarjetaTotal
                titulo="Gastos reembolsables"
                monto={formatearGs(totales.gastos.total)}
                detalle={`${plural(totales.gastos.cantidad, 'gasto')} sin anular`}
              />
              <TarjetaTotal titulo="Total a cobrar" monto={formatearGs(totales.totalACobrar)} />
              <TarjetaTotal titulo="Cobrado" monto={formatearGs(totales.cobrado)} />
              <TarjetaTotal
                titulo="Saldo pendiente"
                monto={formatearGs(totales.saldo)}
                detalle={`${plural(totales.clientesConSaldo, 'cliente')} con saldo`}
                destacada
              />
            </div>

            {/* --- Tabla por cliente --- */}
            <TablaContainer
              busqueda={busqueda}
              onBusquedaChange={setBusqueda}
              placeholder="Buscar cliente o RUC..."
              cantidad={clientesFiltrados.length}
              unidad="cliente"
            >
              {datos.clientes.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-gray-500">
                  Todavía no hay honorarios ni gastos cargados. Cargalos desde el detalle de un
                  expediente o trámite.
                </p>
              ) : clientesFiltrados.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-gray-500">
                  No hay clientes que coincidan con la búsqueda.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-xs font-medium text-gray-500">
                        <th className="px-5 py-3">Cliente</th>
                        <th className="px-5 py-3 text-right">Honorarios</th>
                        <th className="px-5 py-3 text-right">Gastos</th>
                        <th className="px-5 py-3 text-right">A cobrar</th>
                        <th className="px-5 py-3 text-right">Cobrado</th>
                        <th className="px-5 py-3 text-right">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientesFiltrados.map((c) => (
                        <tr key={c.clienteId} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-5 py-3">
                            {/* El detalle del cliente tiene su cuenta corriente completa */}
                            <Link to={`/clientes/${c.clienteId}`} className="font-medium text-gray-900 hover:underline">
                              {c.nombreRazonSocial}
                            </Link>
                            <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                              <span>{c.ruc}</span>
                              {!c.activo && <Badge tone="gray">Inactivo</Badge>}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right text-gray-700">{formatearGs(c.honorariosTotal)}</td>
                          <td className="px-5 py-3 text-right text-gray-700">{formatearGs(c.gastosTotal)}</td>
                          <td className="px-5 py-3 text-right text-gray-700">{formatearGs(c.totalACobrar)}</td>
                          <td className="px-5 py-3 text-right text-gray-700">{formatearGs(c.cobrado)}</td>
                          <td className="px-5 py-3 text-right font-semibold text-gray-900">{formatearGs(c.saldo)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TablaContainer>
          </>
        )
      )}
    </div>
  );
}