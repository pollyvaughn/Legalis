// ============================================================
// LIQUIDACIONESSECCION.JSX — Módulo 3 (RF7 / CU-22)
// Liquidaciones de honorarios de un expediente o de un trámite.
// Reutilizable: lo único que cambia es la URL de la API.
//
// Props:
//   urlBase   "/expedientes/5/liquidaciones" o "/tramites/5/liquidaciones"
//   onChange  (opcional) se llama tras guardar o eliminar, para que el padre
//             refresque la cuenta corriente
//
// FLUJO: se elige el método, se completan los datos, se toca "Calcular"
// (GET /liquidaciones/calcular, no guarda nada) y recién ahí se habilita
// "Guardar". El backend recalcula igual al guardar: nunca confía en el
// total que viene de la pantalla.
//
// REGLAS (iguales al backend):
//  - El IVA se SUMA encima del neto (10%, 5% o exenta).
//  - Editar / eliminar solo si está PENDIENTE (sin cobros).
//  - El método no se puede cambiar una vez creada la liquidación.
// Cada liquidación tiene un botón "Proforma" (PDF con neto, IVA discriminado
// y total; GET /liquidaciones/:id/proforma), en cualquier estado.
// Solo ABOGADO: el padre no debe renderizar esta sección para el asistente.
// ============================================================

import { useEffect, useState } from 'react';
import api from '../../api/axios';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { Input, SelectInput, Textarea } from '../ui/Input';
import useScrollHighlight from '../../hooks/useScrollHighlight';
import { descargarPdf } from '../../utils/descargarPdf';
import { formatearFecha } from '../../utils/fechas';
import { formatearGs } from '../../utils/moneda';
import {
  OPCIONES_METODO,
  OPCIONES_TASA_IVA,
  etiquetaMetodo,
  etiquetaEstadoCobro,
  TONO_ESTADO_COBRO,
} from '../../constants/honorarios';

// ------------------------------------------------------------
// Campos numéricos del formulario, según cómo se escriben:
//  - MONEDA: guaraníes enteros -> solo dígitos (se ignoran puntos y letras)
//  - DECIMAL: porcentaje y jornales -> dígitos con coma o punto (ej: 12,5)
// ------------------------------------------------------------
const CAMPOS_MONEDA = ['montoBase', 'valorJornal', 'montoFijo'];
const CAMPOS_DECIMAL = ['porcentaje', 'cantidadJornales'];
// Si cambia alguno de estos, el cálculo mostrado ya no vale y hay que recalcular
const CAMPOS_QUE_AFECTAN = [...CAMPOS_MONEDA, ...CAMPOS_DECIMAL, 'metodo', 'tasaIva'];

const FORM_VACIO = {
  id: null, // null = alta | número = edición
  metodo: 'PORCENTAJE',
  concepto: '',
  montoBase: '',
  porcentaje: '',
  cantidadJornales: '',
  valorJornal: '',
  montoFijo: '',
  tasaIva: 'IVA_10', // la más común
  observaciones: '',
};

// "2500.00" (Decimal de Prisma) -> "2.5" para mostrar en el input al editar
const aTextoNumero = (valor) => (valor === null || valor === undefined ? '' : String(Number(valor)));

// ------------------------------------------------------------
// entradasDelMetodo: solo los datos que aplican al método elegido.
// El decimal se manda con punto aunque se haya escrito con coma.
// ------------------------------------------------------------
function entradasDelMetodo(f) {
  const conPunto = (texto) => String(texto).replace(',', '.');
  if (f.metodo === 'PORCENTAJE') {
    return { montoBase: f.montoBase, porcentaje: conPunto(f.porcentaje) };
  }
  if (f.metodo === 'JORNALES') {
    return { cantidadJornales: conPunto(f.cantidadJornales), valorJornal: f.valorJornal };
  }
  return { montoFijo: f.montoFijo };
}

// Texto de cómo se calculó (se muestra en cada fila de la lista)
function detalleCalculo(liq) {
  if (liq.metodo === 'PORCENTAJE') {
    return `${formatearGs(liq.montoBase)} × ${Number(liq.porcentaje).toLocaleString('es-PY')}%`;
  }
  if (liq.metodo === 'JORNALES') {
    return `${Number(liq.cantidadJornales).toLocaleString('es-PY')} jornales × ${formatearGs(liq.valorJornal)}`;
  }
  return 'Monto fijo acordado';
}

export default function LiquidacionesSeccion({ urlBase, onChange }) {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorLista, setErrorLista] = useState('');

  // Formulario: null = cerrado | objeto (ver FORM_VACIO)
  const [form, setForm] = useState(null);
  // Resultado del cálculo en pantalla: null = todavía no calculado (o desactualizado)
  const [resultado, setResultado] = useState(null);
  const [calculando, setCalculando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Id de la liquidación que se está por eliminar (confirmación en la propia fila)
  const [borrarId, setBorrarId] = useState(null);
  // Id de la liquidación cuya proforma se está generando (deshabilita su botón)
  const [proformaId, setProformaId] = useState(null);

  const formularioFocus = useScrollHighlight(form !== null, form?.id ?? 'nueva-liquidacion');

  // ------------------------------------------
  // CARGAR la lista al abrir (y si cambia el expediente / trámite)
  // ------------------------------------------
  useEffect(() => {
    let vigente = true; // evita actualizar el estado si el componente ya cambió
    async function cargar() {
      setCargando(true);
      setErrorLista('');
      try {
        const respuesta = await api.get(urlBase);
        if (vigente) setLista(respuesta.data);
      } catch (err) {
        if (vigente) setErrorLista(err.response?.data?.error || 'No se pudieron cargar las liquidaciones');
      } finally {
        if (vigente) setCargando(false);
      }
    }
    cargar();
    return () => {
      vigente = false;
    };
  }, [urlBase]);

  function abrirNueva() {
    setError('');
    setResultado(null);
    setForm({ ...FORM_VACIO });
  }

  function abrirEditar(liq) {
    setError('');
    setBorrarId(null);
    setForm({
      id: liq.id,
      metodo: liq.metodo,
      concepto: liq.concepto || '',
      montoBase: aTextoNumero(liq.montoBase),
      porcentaje: aTextoNumero(liq.porcentaje),
      cantidadJornales: aTextoNumero(liq.cantidadJornales),
      valorJornal: aTextoNumero(liq.valorJornal),
      montoFijo: aTextoNumero(liq.montoNeto), // en monto fijo, el neto ES el monto ingresado
      tasaIva: liq.tasaIva,
      observaciones: liq.observaciones || '',
    });
    // Los datos todavía no cambiaron: el resultado guardado sigue valiendo
    setResultado({
      montoNeto: Number(liq.montoNeto),
      montoIva: Number(liq.montoIva),
      montoTotal: Number(liq.montoTotal),
    });
  }

  function cerrarFormulario() {
    setForm(null);
    setResultado(null);
    setError('');
  }

  // Un solo handler para todos los campos: usa el "name" de cada input
  function handleChange(evento) {
    const { name, value } = evento.target;
    let limpio = value;
    if (CAMPOS_MONEDA.includes(name)) limpio = value.replace(/\D/g, '');
    else if (CAMPOS_DECIMAL.includes(name)) limpio = value.replace(/[^\d.,]/g, '');

    setForm((anterior) => ({ ...anterior, [name]: limpio }));
    // Si cambió algo que influye en el cálculo, hay que volver a calcular
    if (CAMPOS_QUE_AFECTAN.includes(name)) setResultado(null);
  }

  // ------------------------------------------
  // CALCULAR (no guarda nada): muestra neto, IVA y total
  // ------------------------------------------
  async function calcular() {
    setCalculando(true);
    setError('');
    try {
      const respuesta = await api.get('/liquidaciones/calcular', {
        params: { metodo: form.metodo, tasaIva: form.tasaIva, ...entradasDelMetodo(form) },
      });
      setResultado(respuesta.data);
    } catch (err) {
      setResultado(null);
      setError(err.response?.data?.error || 'No se pudo calcular el honorario');
    } finally {
      setCalculando(false);
    }
  }

  // ------------------------------------------
  // GUARDAR (POST si es nueva, PUT si se edita)
  // ------------------------------------------
  async function handleSubmit(evento) {
    evento.preventDefault();
    setGuardando(true);
    setError('');
    try {
      const datos = {
        tasaIva: form.tasaIva,
        concepto: form.concepto,
        observaciones: form.observaciones,
        ...entradasDelMetodo(form),
      };
      if (form.id) {
        // El método no se manda: no se puede cambiar
        const respuesta = await api.put(`/liquidaciones/${form.id}`, datos);
        setLista((l) => l.map((x) => (x.id === form.id ? respuesta.data : x)));
      } else {
        const respuesta = await api.post(urlBase, { ...datos, metodo: form.metodo });
        setLista((l) => [respuesta.data, ...l]); // la más nueva arriba
      }
      cerrarFormulario();
      onChange?.();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar la liquidación');
    } finally {
      setGuardando(false);
    }
  }

  // ------------------------------------------
  // ELIMINAR (definitivo; el backend solo lo permite si está PENDIENTE)
  // ------------------------------------------
  async function eliminar(id) {
    setError('');
    try {
      await api.delete(`/liquidaciones/${id}`);
      setLista((l) => l.filter((x) => x.id !== id));
      onChange?.();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo eliminar la liquidación');
    } finally {
      setBorrarId(null);
    }
  }

  // ------------------------------------------
  // PROFORMA en PDF de una liquidación
  // ------------------------------------------
  async function descargarProforma(id) {
    setError('');
    setProformaId(id);
    try {
      await descargarPdf(`/liquidaciones/${id}/proforma`, `proforma-${id}.pdf`);
    } catch (err) {
      setError(err.message);
    } finally {
      setProformaId(null);
    }
  }

  const editando = form?.id != null;

  return (
    <div>
      {/* --- Título + acción --- */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Honorarios</h2>
          <p className="text-xs text-gray-400">El IVA se suma encima del honorario neto.</p>
        </div>
        {!form && (
          <Button size="sm" onClick={abrirNueva}>
            + Nueva liquidación
          </Button>
        )}
      </div>

      {/* --- Formulario de alta / edición --- */}
      {form && (
        <form
          ref={formularioFocus}
          onSubmit={handleSubmit}
          className="mb-4 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4"
        >
          <p className="text-xs text-gray-500">
            {editando ? 'Editando liquidación. ' : ''}* Campo obligatorio
          </p>

          <div className="grid grid-cols-2 gap-3">
            <SelectInput
              label="Método de cálculo *"
              name="metodo"
              value={form.metodo}
              onChange={handleChange}
              opciones={OPCIONES_METODO}
              disabled={editando}
            />
            <SelectInput
              label="IVA *"
              name="tasaIva"
              value={form.tasaIva}
              onChange={handleChange}
              opciones={OPCIONES_TASA_IVA}
            />
          </div>
          {editando && (
            <p className="-mt-1 text-xs text-gray-500">
              El método no se puede cambiar. Si te equivocaste, eliminá la liquidación y cargala de nuevo.
            </p>
          )}

          {/* Campos según el método */}
          {form.metodo === 'PORCENTAJE' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  label="Monto base del juicio (Gs.) *"
                  name="montoBase"
                  inputMode="numeric"
                  value={form.montoBase}
                  onChange={handleChange}
                  placeholder="Ej: 10000000"
                />
                {form.montoBase && <p className="mt-1 text-xs text-gray-500">{formatearGs(form.montoBase)}</p>}
              </div>
              <Input
                label="Porcentaje (%) *"
                name="porcentaje"
                inputMode="decimal"
                value={form.porcentaje}
                onChange={handleChange}
                placeholder="Ej: 10 (máx. 100, hasta 2 decimales)"
              />
            </div>
          )}

          {form.metodo === 'JORNALES' && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Cantidad de jornales *"
                name="cantidadJornales"
                inputMode="decimal"
                value={form.cantidadJornales}
                onChange={handleChange}
                placeholder="Ej: 2,5 (hasta 2 decimales)"
              />
              <div>
                <Input
                  label="Valor del jornal (Gs.) *"
                  name="valorJornal"
                  inputMode="numeric"
                  value={form.valorJornal}
                  onChange={handleChange}
                  placeholder="Ej: 150000"
                />
                {form.valorJornal && <p className="mt-1 text-xs text-gray-500">{formatearGs(form.valorJornal)}</p>}
              </div>
            </div>
          )}

          {form.metodo === 'MONTO_FIJO' && (
            <div>
              <Input
                label="Monto a cobrar (Gs.) *"
                name="montoFijo"
                inputMode="numeric"
                value={form.montoFijo}
                onChange={handleChange}
                placeholder="Ej: 2000000"
              />
              {form.montoFijo && <p className="mt-1 text-xs text-gray-500">{formatearGs(form.montoFijo)}</p>}
            </div>
          )}

          <Input
            label={form.metodo === 'MONTO_FIJO' ? 'Concepto *' : 'Concepto o etapa (opcional)'}
            name="concepto"
            value={form.concepto}
            onChange={handleChange}
            maxLength={200}
            required={form.metodo === 'MONTO_FIJO'}
            placeholder="Ej: Etapa de demanda · Honorario mensual octubre"
          />

          <Textarea
            label="Observaciones (opcional)"
            name="observaciones"
            value={form.observaciones}
            onChange={handleChange}
            rows={2}
            maxLength={300}
          />

          {/* --- Cálculo en pantalla (antes de confirmar) --- */}
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            {resultado ? (
              <dl className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-gray-400">Honorario neto</dt>
                  <dd className="mt-0.5 font-medium text-gray-900">{formatearGs(resultado.montoNeto)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">IVA</dt>
                  <dd className="mt-0.5 font-medium text-gray-900">{formatearGs(resultado.montoIva)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">Total a cobrar</dt>
                  <dd className="mt-0.5 font-semibold text-gray-900">{formatearGs(resultado.montoTotal)}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-gray-500">Tocá “Calcular” para ver el neto, el IVA y el total antes de guardar.</p>
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={cerrarFormulario}>
              Cancelar
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={calcular} disabled={calculando}>
              {calculando ? 'Calculando...' : 'Calcular'}
            </Button>
            <Button type="submit" size="sm" disabled={!resultado || guardando}>
              {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Guardar liquidación'}
            </Button>
          </div>
        </form>
      )}

      {/* --- Lista de liquidaciones --- */}
      {cargando ? (
        <p className="text-sm text-gray-500">Cargando liquidaciones...</p>
      ) : errorLista ? (
        <p className="text-sm text-red-600">{errorLista}</p>
      ) : lista.length === 0 ? (
        !form && <p className="text-sm text-gray-500">Todavía no se cargó ninguna liquidación.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {lista.map((liq) => (
            <li key={liq.id} className="flex items-start justify-between gap-3 py-3 first:pt-0">
              {/* Izquierda: qué es y cómo se calculó */}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{liq.concepto || etiquetaMetodo(liq.metodo)}</p>
                  <Badge tone="gray">{etiquetaMetodo(liq.metodo)}</Badge>
                  <Badge tone={TONO_ESTADO_COBRO[liq.estado] || 'gray'}>{etiquetaEstadoCobro(liq.estado)}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  {detalleCalculo(liq)} · cargada el {formatearFecha(liq.creadoEn)}
                </p>
                {liq.observaciones && <p className="mt-0.5 text-xs text-gray-500">{liq.observaciones}</p>}
              </div>

              {/* Derecha: montos + acciones */}
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-gray-900">{formatearGs(liq.montoTotal)}</p>
                <p className="text-xs text-gray-500">
                  {liq.tasaIva === 'EXENTA'
                    ? `Neto ${formatearGs(liq.montoNeto)} (exenta de IVA)`
                    : `Neto ${formatearGs(liq.montoNeto)} + IVA ${formatearGs(liq.montoIva)}`}
                </p>

                {/* Acciones: proforma (siempre) + editar / eliminar (solo si no tiene cobros) */}
                {!form && (
                  <div className="mt-1 flex items-center justify-end gap-1">
                    {borrarId === liq.id ? (
                      <>
                        <span className="text-sm text-gray-600">¿Eliminar?</span>
                        <Button type="button" variant="danger" size="sm" onClick={() => eliminar(liq.id)}>
                          Sí
                        </Button>
                        <Button type="button" variant="secondary" size="sm" onClick={() => setBorrarId(null)}>
                          No
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => descargarProforma(liq.id)}
                          disabled={proformaId === liq.id}
                        >
                          {proformaId === liq.id ? 'Generando...' : 'Proforma'}
                        </Button>
                        {liq.estado === 'PENDIENTE' && (
                          <>
                            <Button type="button" variant="ghost" size="sm" onClick={() => abrirEditar(liq)}>
                              Editar
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => setBorrarId(liq.id)}
                            >
                              Eliminar
                            </Button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Errores que ocurren fuera del formulario (ej: eliminar) */}
      {error && !form && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}