// ============================================================
// GASTOSSECCION.JSX — Módulo 3 (RF8 / CU-23)
// Gastos reembolsables de un expediente o de un trámite: dinero que
// el profesional adelantó (tasas, copias, viáticos) y luego le reclama
// al cliente. Reutilizable: lo único que cambia es la URL de la API.
//
// Props:
//   urlBase  "/expedientes/5/gastos" o "/tramites/5/gastos"
//
// REGLAS (iguales al backend):
//  - Los gastos NO llevan IVA.
//  - Se editan o anulan solo si están PENDIENTE (sin cobros).
//  - NO se borran: "Anular" los deja en la lista (grises y tachados)
//    con estado ANULADO, y dejan de sumar en el total.
//  - El comprobante es solo una referencia de texto (no se sube archivo).
// Solo ABOGADO: el padre no debe renderizar esta sección para el asistente.
// ============================================================

import { useEffect, useState } from 'react';
import api from '../../api/axios';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import { Input } from '../ui/Input';
import useScrollHighlight from '../../hooks/useScrollHighlight';
import { formatearFechaSola, aInputFecha, hoyInput } from '../../utils/fechas';
import { formatearGs } from '../../utils/moneda';
import { etiquetaEstadoCobro, TONO_ESTADO_COBRO } from '../../constants/honorarios';

// Sugerencias del campo "concepto" (se puede escribir cualquier otro texto)
const SUGERENCIAS = [
  'Tasa judicial',
  'Copias del expediente',
  'Notificaciones',
  'Viáticos',
  'Timbrados y sellados',
  'Honorarios de peritos',
];

// Más reciente primero (por fecha del gasto; el id desempata), igual que el backend.
// Las fechas son texto ISO, así que comparar como texto ordena bien.
function ordenar(lista) {
  return [...lista].sort((a, b) => {
    const porFecha = b.fecha.localeCompare(a.fecha);
    return porFecha !== 0 ? porFecha : b.id - a.id;
  });
}

export default function GastosSeccion({ urlBase }) {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorLista, setErrorLista] = useState('');

  // Formulario: null = cerrado | { id: null (alta) o número (edición), ...campos }
  const [form, setForm] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Gasto que se está por anular (abre el modal de confirmación)
  const [anulando, setAnulando] = useState(null);
  const [procesandoAnulacion, setProcesandoAnulacion] = useState(false);
  const [errorAnulacion, setErrorAnulacion] = useState('');

  const formularioFocus = useScrollHighlight(form !== null, form?.id ?? 'nuevo-gasto');

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
        if (vigente) setErrorLista(err.response?.data?.error || 'No se pudieron cargar los gastos');
      } finally {
        if (vigente) setCargando(false);
      }
    }
    cargar();
    return () => {
      vigente = false;
    };
  }, [urlBase]);

  function abrirNuevo() {
    setError('');
    setForm({ id: null, concepto: '', fecha: hoyInput(), monto: '', comprobante: '' });
  }

  function abrirEditar(gasto) {
    setError('');
    setForm({
      id: gasto.id,
      concepto: gasto.concepto,
      fecha: aInputFecha(gasto.fecha),
      monto: String(Math.round(Number(gasto.monto))), // "150000.00" -> "150000"
      comprobante: gasto.comprobante || '',
    });
  }

  function cerrarFormulario() {
    setForm(null);
    setError('');
  }

  // Un solo handler para todos los campos: usa el "name" de cada input.
  // El monto va en guaraníes enteros: se descarta todo lo que no sea dígito.
  function handleChange(evento) {
    const { name, value } = evento.target;
    const limpio = name === 'monto' ? value.replace(/\D/g, '') : value;
    setForm((anterior) => ({ ...anterior, [name]: limpio }));
  }

  // ------------------------------------------
  // GUARDAR (POST si es nuevo, PUT si se edita)
  // ------------------------------------------
  async function handleSubmit(evento) {
    evento.preventDefault();
    setGuardando(true);
    setError('');
    try {
      const datos = {
        concepto: form.concepto,
        fecha: form.fecha,
        monto: form.monto,
        comprobante: form.comprobante,
      };
      if (form.id) {
        const respuesta = await api.put(`/gastos/${form.id}`, datos);
        setLista((l) => ordenar(l.map((g) => (g.id === form.id ? respuesta.data : g))));
      } else {
        const respuesta = await api.post(urlBase, datos);
        setLista((l) => ordenar([respuesta.data, ...l]));
      }
      cerrarFormulario();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar el gasto');
    } finally {
      setGuardando(false);
    }
  }

  // ------------------------------------------
  // ANULAR (no borra: el gasto pasa a ANULADO y queda en la lista)
  // ------------------------------------------
  async function confirmarAnulacion() {
    setProcesandoAnulacion(true);
    setErrorAnulacion('');
    try {
      const respuesta = await api.post(`/gastos/${anulando.id}/anular`);
      setLista((l) => l.map((g) => (g.id === anulando.id ? respuesta.data : g)));
      setAnulando(null);
    } catch (err) {
      setErrorAnulacion(err.response?.data?.error || 'No se pudo anular el gasto');
    } finally {
      setProcesandoAnulacion(false);
    }
  }

  function pedirAnulacion(gasto) {
    setErrorAnulacion('');
    setAnulando(gasto);
  }

  // Total de los gastos que cuentan (los ANULADOS no suman)
  const totalVigente = lista
    .filter((g) => g.estado !== 'ANULADO')
    .reduce((suma, g) => suma + Number(g.monto), 0);

  const editando = form?.id != null;

  return (
    <div>
      {/* --- Título + acción --- */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Gastos reembolsables</h2>
          <p className="text-xs text-gray-400">
            Lo que se adelantó y se le reclama al cliente. No lleva IVA; el comprobante es solo una referencia.
          </p>
        </div>
        {!form && (
          <Button size="sm" onClick={abrirNuevo}>
            + Registrar gasto
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
          <p className="text-xs text-gray-500">{editando ? 'Editando gasto. ' : ''}* Campo obligatorio</p>

          <Input
            label="Concepto *"
            name="concepto"
            value={form.concepto}
            onChange={handleChange}
            list="sugerencias-gastos"
            maxLength={200}
            placeholder="Ej: Tasa judicial"
            required
          />
          <datalist id="sugerencias-gastos">
            {SUGERENCIAS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Fecha del gasto *"
              type="date"
              name="fecha"
              value={form.fecha}
              onChange={handleChange}
              max={hoyInput()} /* no puede ser futura (misma regla que el backend) */
              required
            />
            <div>
              <Input
                label="Monto (Gs.) *"
                name="monto"
                inputMode="numeric"
                value={form.monto}
                onChange={handleChange}
                placeholder="Ej: 150000"
                required
              />
              {form.monto && <p className="mt-1 text-xs text-gray-500">{formatearGs(form.monto)}</p>}
            </div>
          </div>

          <Input
            label="Comprobante (opcional)"
            name="comprobante"
            value={form.comprobante}
            onChange={handleChange}
            maxLength={100}
            placeholder="Ej: Factura 001-001-0001234"
          />

          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={cerrarFormulario}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={guardando}>
              {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Registrar gasto'}
            </Button>
          </div>
        </form>
      )}

      {/* --- Lista de gastos --- */}
      {cargando ? (
        <p className="text-sm text-gray-500">Cargando gastos...</p>
      ) : errorLista ? (
        <p className="text-sm text-red-600">{errorLista}</p>
      ) : lista.length === 0 ? (
        !form && <p className="text-sm text-gray-500">Todavía no se registró ningún gasto.</p>
      ) : (
        <>
          <ul className="divide-y divide-gray-100">
            {lista.map((gasto) => {
              const anulado = gasto.estado === 'ANULADO';
              return (
                <li key={gasto.id} className="flex items-start justify-between gap-3 py-3 first:pt-0">
                  {/* Izquierda: qué fue y cuándo */}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={`text-sm font-medium ${
                          anulado ? 'text-gray-400 line-through' : 'text-gray-900'
                        }`}
                      >
                        {gasto.concepto}
                      </p>
                      <Badge tone={TONO_ESTADO_COBRO[gasto.estado] || 'gray'}>
                        {etiquetaEstadoCobro(gasto.estado)}
                      </Badge>
                    </div>
                    <p className={`mt-0.5 text-xs ${anulado ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatearFechaSola(gasto.fecha)}
                      {gasto.comprobante ? ` · ${gasto.comprobante}` : ''}
                    </p>
                  </div>

                  {/* Derecha: monto + acciones */}
                  <div className="shrink-0 text-right">
                    <p
                      className={`text-sm font-semibold ${
                        anulado ? 'text-gray-400 line-through' : 'text-gray-900'
                      }`}
                    >
                      {formatearGs(gasto.monto)}
                    </p>

                    {/* Editar / anular: solo si no tiene cobros ni está anulado */}
                    {gasto.estado === 'PENDIENTE' && !form && (
                      <div className="mt-1 flex items-center justify-end gap-1">
                        <Button type="button" variant="ghost" size="sm" onClick={() => abrirEditar(gasto)}>
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => pedirAnulacion(gasto)}
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

          {/* Total de los gastos vigentes (sin los anulados) */}
          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
            <span className="text-gray-500">Total de gastos (sin anulados)</span>
            <span className="font-semibold text-gray-900">{formatearGs(totalVigente)}</span>
          </div>
        </>
      )}

      {/* --- Modal de confirmación para anular --- */}
      {anulando && (
        <Modal title="Anular gasto" onClose={() => setAnulando(null)}>
          <div className="px-6 py-5">
            <p className="text-sm text-gray-700">
              ¿Seguro que querés anular el gasto <strong>{anulando.concepto}</strong> por{' '}
              <strong>{formatearGs(anulando.monto)}</strong>?
            </p>
            <p className="mt-2 text-sm text-gray-500">
              No se borra: queda en la lista como anulado, deja de sumar y ya no se puede editar.
            </p>
            {errorAnulacion && <p className="mt-3 text-sm text-red-600">{errorAnulacion}</p>}
          </div>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setAnulando(null)} disabled={procesandoAnulacion}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmarAnulacion} disabled={procesandoAnulacion}>
              {procesandoAnulacion ? 'Anulando...' : 'Sí, anular'}
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}