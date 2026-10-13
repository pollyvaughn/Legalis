// ============================================================
// CUENTACORRIENTESECCION.JSX — Módulo 3 (RF8)
// Estado de cuenta: cuánto se cobra y cuánto falta. Solo LEE
// (GET .../cuenta-corriente); no crea ni modifica nada.
//
//   A cobrar = honorarios (neto + IVA) + gastos sin anular
//   Saldo    = a cobrar − cobrado
//
// Props:
//   urlBase    "/expedientes/5/cuenta-corriente", "/tramites/5/cuenta-corriente"
//              o "/clientes/5/cuenta-corriente"
//   refrescar  número que el padre sube cuando se carga / edita / elimina
//              / anula algo (honorarios o gastos): vuelve a pedir los datos
//
// Si la respuesta trae "detalle" (vista del CLIENTE) se muestra además una
// tabla con lo que aporta cada expediente y trámite.
// Solo ABOGADO: el padre no debe renderizar esta sección para el asistente.
// ============================================================

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import Badge from '../ui/Badge';
import { formatearGs } from '../../utils/moneda';
import { plural } from '../../utils/textos';

// Una línea del estado de cuenta: etiqueta a la izquierda, monto a la derecha
function Linea({ etiqueta, detalle, monto, fuerte = false }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <div>
        <p className={`text-sm ${fuerte ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{etiqueta}</p>
        {detalle && <p className="text-xs text-gray-400">{detalle}</p>}
      </div>
      <p className={`shrink-0 text-sm ${fuerte ? 'font-semibold text-gray-900' : 'text-gray-800'}`}>{monto}</p>
    </div>
  );
}

// "1 liquidación" / "3 liquidaciones" (plural() solo agrega la s, y acá no alcanza)
const cantidadLiquidaciones = (n) => (n === 1 ? '1 liquidación' : `${n} liquidaciones`);

// Enlace al expediente o trámite de una fila del detalle
function enlaceDe(fila) {
  return fila.tipo === 'EXPEDIENTE' ? `/expedientes/${fila.id}` : `/asesorias?tramiteId=${fila.id}`;
}

export default function CuentaCorrienteSeccion({ urlBase, refrescar = 0 }) {
  // Se guarda junto con la URL a la que pertenece, para no mostrar datos
  // viejos si la pantalla pasa de un expediente a otro.
  const [resultado, setResultado] = useState(null); // { url, datos }
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true; // evita actualizar el estado si el componente ya cambió
    async function cargar() {
      try {
        const respuesta = await api.get(urlBase);
        if (vigente) {
          setResultado({ url: urlBase, datos: respuesta.data });
          setError('');
        }
      } catch (err) {
        if (vigente) setError(err.response?.data?.error || 'No se pudo cargar la cuenta corriente');
      }
    }
    cargar();
    return () => {
      vigente = false;
    };
  }, [urlBase, refrescar]);

  const datos = resultado?.url === urlBase ? resultado.datos : null;

  return (
    <div>
      {/* --- Título --- */}
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">Cuenta corriente</h2>
        <p className="text-xs text-gray-400">
          Honorarios (con IVA) más gastos sin anular, menos lo cobrado.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : !datos ? (
        <p className="text-sm text-gray-500">Cargando cuenta corriente...</p>
      ) : (
        <>
          {/* --- Estado de cuenta --- */}
          <div className="divide-y divide-gray-100">
            <Linea
              etiqueta="Honorarios (con IVA)"
              detalle={`${cantidadLiquidaciones(datos.honorarios.cantidad)} · neto ${formatearGs(
                datos.honorarios.neto
              )} + IVA ${formatearGs(datos.honorarios.iva)}`}
              monto={formatearGs(datos.honorarios.total)}
            />
            <Linea
              etiqueta="Gastos reembolsables"
              detalle={`${plural(datos.gastos.cantidad, 'gasto')}${
                datos.gastos.anulados > 0 ? ` · ${plural(datos.gastos.anulados, 'anulado')} (no suma)` : ''
              }`}
              monto={formatearGs(datos.gastos.total)}
            />
            <Linea etiqueta="Total a cobrar" monto={formatearGs(datos.totalACobrar)} fuerte />
            <Linea etiqueta="Cobrado" monto={`− ${formatearGs(datos.cobrado)}`} />
            <Linea etiqueta="Saldo pendiente" monto={formatearGs(datos.saldo)} fuerte />
          </div>

          {/* --- Detalle por expediente / trámite (solo en la vista del cliente) --- */}
          {datos.detalle &&
            (datos.detalle.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">
                Este cliente todavía no tiene honorarios ni gastos cargados.
              </p>
            ) : (
              <div className="mt-5">
                <h3 className="mb-2 text-sm font-semibold text-gray-900">Detalle por expediente y trámite</h3>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-400">
                      <tr>
                        <th className="px-4 py-2 font-medium">Caso</th>
                        <th className="px-4 py-2 text-right font-medium">Honorarios</th>
                        <th className="px-4 py-2 text-right font-medium">Gastos</th>
                        <th className="px-4 py-2 text-right font-medium">A cobrar</th>
                        <th className="px-4 py-2 text-right font-medium">Saldo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {datos.detalle.map((fila) => (
                        <tr key={`${fila.tipo}-${fila.id}`}>
                          <td className="px-4 py-2">
                            <Link to={enlaceDe(fila)} className="font-medium text-gray-900 hover:underline">
                              {fila.titulo}
                            </Link>
                            <div className="mt-0.5">
                              <Badge tone="gray">{fila.tipo === 'EXPEDIENTE' ? 'Expediente' : 'Trámite'}</Badge>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-right text-gray-700">{formatearGs(fila.honorariosTotal)}</td>
                          <td className="px-4 py-2 text-right text-gray-700">{formatearGs(fila.gastosTotal)}</td>
                          <td className="px-4 py-2 text-right text-gray-700">{formatearGs(fila.totalACobrar)}</td>
                          <td className="px-4 py-2 text-right font-semibold text-gray-900">
                            {formatearGs(fila.saldo)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
        </>
      )}
    </div>
  );
}