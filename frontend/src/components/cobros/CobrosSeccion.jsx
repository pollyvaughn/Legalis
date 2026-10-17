// ============================================================
// COBROSSECCION.JSX — Módulo 4 (RF10 / CU-26 y CU-27)
// Recibos de un expediente o de un trámite: registrar un cobro
// (honorarios, devolución de gastos y/o anticipo) y anular recibos.
// Reutilizable: lo único que cambia son las URLs de la API.
//
// Props:
//   urlBase    "/expedientes/5/cobros" o "/tramites/5/cobros"
//   urlCuenta  "/expedientes/5/cuenta-corriente" o "/tramites/5/cuenta-corriente"
//              (de ahí salen los totales liquidados para calcular lo pendiente)
//   onChange   (opcional) se llama tras registrar o anular, para que el padre
//              refresque la cuenta corriente y las listas de honorarios y gastos
//   refrescar  número que el padre sube cuando cambian honorarios o gastos:
//              vuelve a pedir los datos (cambia lo pendiente de cobrar)
//
// REGLAS (iguales al backend):
//  - Un recibo = un solo expediente o trámite, con hasta una línea de cada tipo.
//  - Cada línea de honorarios o gastos <= su saldo pendiente (RN-33).
//  - El anticipo solo resta del saldo (RN-32).
//  - NO se borran ni se editan: "Anular" los deja en la lista (grises) con
//    número, fecha y motivo, y dejan de contar (RN-35).
// Solo ABOGADO: el padre no debe renderizar esta sección para el asistente.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import api from '../../api/axios';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import NuevoCobroModal from './NuevoCobroModal';
import AnularCobroModal from './AnularCobroModal';
import { formatearFechaSola, formatearFechaHora } from '../../utils/fechas';
import { formatearGs } from '../../utils/moneda';
import {
  etiquetaMetodoPago,
  etiquetaLinea,
  etiquetaEstadoRecibo,
  TONO_ESTADO_RECIBO,
} from '../../constants/cobros';

// ------------------------------------------------------------
// HELPER: calcularPendientes
// Pendiente de cada tipo = liquidado − cobrado de ese tipo (mínimo 0).
// Solo cuentan las líneas de recibos EMITIDOS (los anulados no).
// Es la misma cuenta que hace el backend (calcularSaldosPorTipo).
// ------------------------------------------------------------
function calcularPendientes(cuenta, recibos) {
  let cobradoHonorarios = 0;
  let cobradoGastos = 0;
  for (const recibo of recibos) {
    if (recibo.estado !== 'EMITIDO') continue;
    for (const linea of recibo.lineas) {
      if (linea.tipo === 'HONORARIOS') cobradoHonorarios += linea.monto;
      if (linea.tipo === 'GASTOS') cobradoGastos += linea.monto;
    }
  }
  return {
    honorarios: Math.max(0, (cuenta?.honorarios?.total ?? 0) - cobradoHonorarios),
    gastos: Math.max(0, (cuenta?.gastos?.total ?? 0) - cobradoGastos),
  };
}

export default function CobrosSeccion({ urlBase, urlCuenta, onChange, refrescar = 0 }) {
  const [lista, setLista] = useState([]);
  const [cuenta, setCuenta] = useState(null); // resumen de la cuenta corriente
  const [cargando, setCargando] = useState(true);
  const [errorLista, setErrorLista] = useState('');

  const [mostrarNuevo, setMostrarNuevo] = useState(false); // modal "Nuevo cobro"
  const [anulando, setAnulando] = useState(null); // recibo que se está por anular
  const [aviso, setAviso] = useState(''); // mensaje verde tras registrar / anular

  // URL ya cargada: "Cargando..." solo se muestra la primera vez (o si cambia el
  // expediente / trámite); las recargas por "refrescar" son silenciosas.
  const urlCargada = useRef(null);

  // ------------------------------------------
  // CARGAR recibos y cuenta corriente (al abrir y cuando cambia "refrescar")
  // ------------------------------------------
  useEffect(() => {
    let vigente = true; // evita actualizar el estado si el componente ya cambió
    async function cargar() {
      if (urlCargada.current !== urlBase) setCargando(true);
      setErrorLista('');
      try {
        const [recibos, resumen] = await Promise.all([api.get(urlBase), api.get(urlCuenta)]);
        if (vigente) {
          setLista(recibos.data);
          setCuenta(resumen.data);
          urlCargada.current = urlBase;
        }
      } catch (err) {
        if (vigente) setErrorLista(err.response?.data?.error || 'No se pudieron cargar los cobros');
      } finally {
        if (vigente) setCargando(false);
      }
    }
    cargar();
    return () => {
      vigente = false;
    };
  }, [urlBase, urlCuenta, refrescar]);

  // El mensaje verde desaparece solo a los 5 segundos
  useEffect(() => {
    if (!aviso) return;
    const temporizador = window.setTimeout(() => setAviso(''), 5000);
    return () => window.clearTimeout(temporizador);
  }, [aviso]);

  // Recibo recién registrado: va primero (tiene el número más alto)
  function alRegistrar(cobro) {
    setLista((l) => [cobro, ...l]);
    setMostrarNuevo(false);
    setAviso(`Recibo N° ${cobro.numero} registrado.`);
    onChange?.();
  }

  // Recibo recién anulado: reemplaza al de la lista (queda gris, con su motivo)
  function alAnular(cobro) {
    setLista((l) => l.map((c) => (c.id === cobro.id ? cobro : c)));
    setAnulando(null);
    setAviso(`Recibo N° ${cobro.numero} anulado.`);
    onChange?.();
  }

  const pendientes = calcularPendientes(cuenta, lista);

  // Total cobrado con recibos vigentes (los ANULADOS no suman)
  const totalVigente = lista.filter((c) => c.estado === 'EMITIDO').reduce((suma, c) => suma + c.total, 0);

  return (
    <div>
      {/* --- Título + acción --- */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Cobros y recibos</h2>
          <p className="text-xs text-gray-400">
            Pagos que hizo el cliente. Un recibo puede llevar honorarios, devolución de gastos y/o un anticipo. No se
            borran: se anulan.
          </p>
        </div>
        <Button size="sm" onClick={() => setMostrarNuevo(true)} disabled={cargando || !cuenta}>
          + Nuevo cobro
        </Button>
      </div>

      {/* --- Lo que todavía se puede cobrar de cada tipo --- */}
      {cuenta && (
        <p className="mb-3 text-xs text-gray-500">
          Pendiente de cobro — honorarios: <strong className="text-gray-700">{formatearGs(pendientes.honorarios)}</strong>
          {' · '}
          gastos: <strong className="text-gray-700">{formatearGs(pendientes.gastos)}</strong>
        </p>
      )}

      {aviso && (
        <p role="status" className="mb-3 text-sm text-green-700">
          {aviso}
        </p>
      )}

      {/* --- Lista de recibos --- */}
      {cargando ? (
        <p className="text-sm text-gray-500">Cargando cobros...</p>
      ) : errorLista ? (
        <p className="text-sm text-red-600">{errorLista}</p>
      ) : lista.length === 0 ? (
        <p className="text-sm text-gray-500">Todavía no se registró ningún cobro.</p>
      ) : (
        <>
          <ul className="divide-y divide-gray-100">
            {lista.map((cobro) => {
              const anulado = cobro.estado === 'ANULADO';
              const apagado = anulado ? 'text-gray-400' : 'text-gray-500';
              return (
                <li key={cobro.id} className="flex items-start justify-between gap-3 py-3 first:pt-0">
                  {/* Izquierda: qué recibo es y qué incluye */}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`text-sm font-medium ${anulado ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        Recibo N° {cobro.numero}
                      </p>
                      <Badge tone={TONO_ESTADO_RECIBO[cobro.estado] || 'gray'}>{etiquetaEstadoRecibo(cobro.estado)}</Badge>
                    </div>
                    <p className={`mt-0.5 text-xs ${apagado}`}>
                      {formatearFechaSola(cobro.fecha)} · {etiquetaMetodoPago(cobro.metodoPago)}
                      {cobro.referenciaPago ? ` · Ref. ${cobro.referenciaPago}` : ''}
                    </p>
                    <p className={`mt-0.5 text-xs ${apagado}`}>
                      {cobro.lineas.map((l) => `${etiquetaLinea(l.tipo)} ${formatearGs(l.monto)}`).join(' · ')}
                    </p>
                    {cobro.concepto && <p className={`mt-0.5 text-xs ${apagado}`}>{cobro.concepto}</p>}
                    {anulado && cobro.anulacion && (
                      <p className="mt-0.5 text-xs text-gray-400">
                        Anulado el {formatearFechaHora(cobro.anulacion.fecha)}
                        {cobro.anulacion.por?.nombre ? ` por ${cobro.anulacion.por.nombre}` : ''} — motivo:{' '}
                        {cobro.anulacion.motivo}
                      </p>
                    )}
                  </div>

                  {/* Derecha: total + acción */}
                  <div className="shrink-0 text-right">
                    <p className={`text-sm font-semibold ${anulado ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {formatearGs(cobro.total)}
                    </p>
                    {!anulado && (
                      <div className="mt-1 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setAnulando(cobro)}
                        >
                          Anular
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Total cobrado con recibos vigentes (sin los anulados) */}
          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
            <span className="text-gray-500">Total cobrado (sin anulados)</span>
            <span className="font-semibold text-gray-900">{formatearGs(totalVigente)}</span>
          </div>
        </>
      )}

      {/* --- Modales --- */}
      {mostrarNuevo && (
        <NuevoCobroModal
          urlBase={urlBase}
          pendientes={pendientes}
          onClose={() => setMostrarNuevo(false)}
          onRegistrado={alRegistrar}
        />
      )}
      {anulando && <AnularCobroModal cobro={anulando} onClose={() => setAnulando(null)} onAnulado={alAnular} />}
    </div>
  );
}