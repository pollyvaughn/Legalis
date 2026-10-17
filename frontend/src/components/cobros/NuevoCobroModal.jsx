// ============================================================
// NUEVOCOBROMODAL.JSX — Módulo 4 (RF10 / CU-26)
// Formulario para registrar un recibo de un expediente o de un trámite.
// Un recibo tiene hasta UNA línea de cada tipo (RN-31):
//   - Honorarios            (tope: honorarios pendientes, RN-33)
//   - Devolución de gastos  (tope: gastos pendientes, RN-33)
//   - Anticipo              (sin tope: es plata a cuenta, RN-32)
//
// Props:
//   urlBase       "/expedientes/5/cobros" o "/tramites/5/cobros"
//   pendientes    { honorarios, gastos } lo que todavía se puede cobrar de cada tipo
//   onClose       cerrar sin guardar
//   onRegistrado  (cobro) se llama cuando el backend guardó el recibo
//
// Los topes se controlan acá solo para avisar antes de enviar: la
// validación real (y la que manda) es la del backend.
// ============================================================

import { useState } from 'react';
import api from '../../api/axios';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Input, SelectInput } from '../ui/Input';
import { hoyInput } from '../../utils/fechas';
import { formatearGs } from '../../utils/moneda';
import { OPCIONES_METODO_PAGO, ETIQUETA_LINEA } from '../../constants/cobros';

// Orden en que se muestran las líneas del formulario
const TIPOS = ['HONORARIOS', 'GASTOS', 'ANTICIPO'];

// Aclaración corta debajo de cada línea
const AYUDA_LINEA = {
  HONORARIOS: 'Cobro de honorarios ya liquidados.',
  GASTOS: 'El cliente le devuelve los gastos que se adelantaron.',
  ANTICIPO: 'Pago a cuenta: resta del saldo total; si sobra, queda a favor del cliente.',
};

// Una fila del formulario: etiqueta + monto (+ botón "Todo" si tiene tope)
function FilaLinea({ tipo, valor, tope, onChange }) {
  const tieneTope = tipo !== 'ANTICIPO';
  const sinSaldo = tieneTope && tope === 0;
  const excede = tieneTope && Number(valor) > tope;

  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">{ETIQUETA_LINEA[tipo]}</p>
          <p className="text-xs text-gray-400">{AYUDA_LINEA[tipo]}</p>
        </div>
        {tieneTope && (
          <p className="shrink-0 text-xs text-gray-500">
            {sinSaldo ? 'Sin saldo pendiente' : `Pendiente: ${formatearGs(tope)}`}
          </p>
        )}
      </div>

      <div className="mt-2 flex items-start gap-2">
        <div className="flex-1">
          <Input
            name={`monto-${tipo}`}
            aria-label={`Monto de ${ETIQUETA_LINEA[tipo]} (Gs.)`}
            inputMode="numeric"
            placeholder="Monto en Gs. (opcional)"
            value={valor}
            onChange={(e) => onChange(tipo, e.target.value.replace(/\D/g, ''))}
            disabled={sinSaldo}
          />
          {valor && !excede && <p className="mt-1 text-xs text-gray-500">{formatearGs(valor)}</p>}
          {excede && (
            <p role="alert" className="mt-1 text-xs text-red-600">
              Supera el saldo pendiente ({formatearGs(tope)}).
            </p>
          )}
        </div>
        {tieneTope && !sinSaldo && (
          <Button type="button" variant="secondary" size="sm" className="mt-1" onClick={() => onChange(tipo, String(tope))}>
            Todo
          </Button>
        )}
      </div>
    </div>
  );
}

export default function NuevoCobroModal({ urlBase, pendientes, onClose, onRegistrado }) {
  const [form, setForm] = useState({
    fecha: hoyInput(),
    metodoPago: 'EFECTIVO',
    referenciaPago: '',
    concepto: '',
  });
  const [montos, setMontos] = useState({ HONORARIOS: '', GASTOS: '', ANTICIPO: '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const topeDe = { HONORARIOS: pendientes.honorarios, GASTOS: pendientes.gastos };

  function handleChange(evento) {
    const { name, value } = evento.target;
    setForm((anterior) => ({ ...anterior, [name]: value }));
  }

  function cambiarMonto(tipo, valor) {
    setMontos((anterior) => ({ ...anterior, [tipo]: valor }));
  }

  // Total del recibo y control de topes (en vivo)
  const total = TIPOS.reduce((suma, tipo) => suma + Number(montos[tipo] || 0), 0);
  const algunoExcede = ['HONORARIOS', 'GASTOS'].some((tipo) => Number(montos[tipo] || 0) > topeDe[tipo]);

  async function handleSubmit(evento) {
    evento.preventDefault();
    setGuardando(true);
    setError('');
    try {
      // Solo viajan las líneas con monto: [{ tipo: 'HONORARIOS', monto: 500000 }, ...]
      const lineas = TIPOS.map((tipo) => ({ tipo, monto: Number(montos[tipo] || 0) })).filter((l) => l.monto > 0);

      const respuesta = await api.post(urlBase, {
        fecha: form.fecha,
        metodoPago: form.metodoPago,
        referenciaPago: form.referenciaPago.trim() || null,
        concepto: form.concepto.trim() || null,
        lineas,
      });
      onRegistrado(respuesta.data);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo registrar el cobro');
      setGuardando(false);
    }
  }

  return (
    // closeOnOverlay=false: un clic afuera no debe perder lo cargado
    <Modal title="Nuevo cobro" onClose={onClose} size="lg" closeOnOverlay={false}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 px-6 py-5">
          <p className="text-xs text-gray-500">* Campo obligatorio. Cargá al menos una línea con monto.</p>

          {/* --- Datos del pago --- */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Fecha del cobro *"
              type="date"
              name="fecha"
              value={form.fecha}
              onChange={handleChange}
              max={hoyInput()} /* no puede ser futura (misma regla que el backend) */
              required
            />
            <SelectInput
              label="Método de pago *"
              name="metodoPago"
              value={form.metodoPago}
              onChange={handleChange}
              opciones={OPCIONES_METODO_PAGO}
            />
          </div>

          <Input
            label="Referencia del pago (opcional)"
            name="referenciaPago"
            value={form.referenciaPago}
            onChange={handleChange}
            maxLength={100}
            placeholder="Ej: N° de transferencia o de cheque"
          />
          <Input
            label="Concepto (opcional)"
            name="concepto"
            value={form.concepto}
            onChange={handleChange}
            maxLength={200}
            placeholder="Ej: Cobro de la primera etapa"
          />

          {/* --- Líneas del recibo --- */}
          <div className="space-y-2">
            {TIPOS.map((tipo) => (
              <FilaLinea key={tipo} tipo={tipo} valor={montos[tipo]} tope={topeDe[tipo]} onChange={cambiarMonto} />
            ))}
          </div>

          {/* --- Total del recibo --- */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
            <span className="text-gray-500">Total del recibo</span>
            <span className="text-base font-semibold text-gray-900">{formatearGs(total)}</span>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando || total <= 0 || algunoExcede}>
            {guardando ? 'Registrando...' : 'Registrar cobro'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}