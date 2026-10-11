// ============================================================
// ExportarExpedienteModal.jsx
// Modal "Exportar PDF" de UN expediente (Módulo 2). Se abre desde el
// botón del encabezado de ActuacionesSeccion. Evita meter filtros
// sueltos en la pantalla: todo se elige acá.
//
// Qué se puede exportar (dos PDFs distintos, uno por vez):
//   - Historial de actuaciones, con período: Todo / Último mes /
//     Último año / Rango personalizado.
//   - Plazos pendientes (sin período: es lo que está abierto hoy, y
//     filtrar por fecha podría esconder un plazo por vencer).
//
// El período se convierte a desde/hasta ('AAAA-MM-DD') ACÁ, con la
// fecha local del navegador, y el backend solo recibe esas fechas.
// Endpoint: GET /expedientes/:id/exportar?contenido=&desde=&hasta=
// ============================================================

import { useState } from 'react';
import api from '../../api/axios';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { Input } from '../ui/Input';
import { hoyInput } from '../../utils/fechas';

// Qué contenido se exporta
const CONTENIDOS = [
  { value: 'actuaciones', label: 'Historial de actuaciones' },
  { value: 'plazos', label: 'Plazos pendientes' },
];

// Períodos disponibles (solo para actuaciones)
const PERIODOS = [
  { value: 'todo', label: 'Todo el historial' },
  { value: 'mes', label: 'Último mes' },
  { value: 'anio', label: 'Último año' },
  { value: 'rango', label: 'Rango de fechas' },
];

// ------------------------------------------------------------
// "Hoy menos N meses" como 'AAAA-MM-DD' (fecha local).
// Si el día no existe en el mes de destino (ej: 31 de marzo - 1 mes),
// se usa el último día de ese mes en vez de saltar al siguiente.
// ------------------------------------------------------------
function hoyMenosMeses(meses) {
  const hoy = new Date();
  const ultimoDiaDestino = new Date(hoy.getFullYear(), hoy.getMonth() - meses + 1, 0).getDate();
  const fecha = new Date(
    hoy.getFullYear(),
    hoy.getMonth() - meses,
    Math.min(hoy.getDate(), ultimoDiaDestino)
  );
  const dos = (n) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

export default function ExportarExpedienteModal({ expedienteId, onClose }) {
  const [contenido, setContenido] = useState('actuaciones');
  const [periodo, setPeriodo] = useState('todo');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState('');

  const hoy = hoyInput();
  const esActuaciones = contenido === 'actuaciones';
  const esRango = esActuaciones && periodo === 'rango';

  // Rango incompleto o al revés: no se puede exportar todavía
  const rangoInvalido = esRango && (!desde || !hasta || desde > hasta);

  // ------------------------------------------------------------
  // Pide el PDF y lo descarga vía blob (mismo patrón que los
  // listados de Módulo 1).
  // ------------------------------------------------------------
  async function exportar() {
    setError('');
    setExportando(true);

    // Traduce el período elegido a desde/hasta (los plazos no llevan período)
    const params = { contenido };
    if (esActuaciones) {
      if (periodo === 'mes') {
        params.desde = hoyMenosMeses(1);
        params.hasta = hoy;
      } else if (periodo === 'anio') {
        params.desde = hoyMenosMeses(12);
        params.hasta = hoy;
      } else if (periodo === 'rango') {
        params.desde = desde;
        params.hasta = hasta;
      }
    }

    try {
      const respuesta = await api.get(`/expedientes/${expedienteId}/exportar`, {
        params,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([respuesta.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${contenido}-expediente-${expedienteId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      onClose();
    } catch (err) {
      setError('No se pudo generar el PDF');
    } finally {
      setExportando(false);
    }
  }

  return (
    <Modal title="Exportar PDF del expediente" onClose={onClose}>
      <div className="space-y-5 px-6 py-5">
        {/* --- 1. Qué exportar --- */}
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-gray-700">Contenido</legend>
          <div className="space-y-2">
            {CONTENIDOS.map((opcion) => (
              <label key={opcion.value} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="contenido"
                  value={opcion.value}
                  checked={contenido === opcion.value}
                  onChange={() => setContenido(opcion.value)}
                />
                {opcion.label}
              </label>
            ))}
          </div>
        </fieldset>

        {/* --- 2. Período (solo actuaciones) --- */}
        {esActuaciones ? (
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-gray-700">Período</legend>
            <div className="grid grid-cols-2 gap-2">
              {PERIODOS.map((opcion) => (
                <label key={opcion.value} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="periodo"
                    value={opcion.value}
                    checked={periodo === opcion.value}
                    onChange={() => setPeriodo(opcion.value)}
                  />
                  {opcion.label}
                </label>
              ))}
            </div>

            {/* Fechas del rango personalizado */}
            {esRango && (
              <div className="mt-3 grid grid-cols-2 gap-4">
                <Input
                  label="Desde"
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  max={hasta || hoy}
                />
                <Input
                  label="Hasta"
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  min={desde || undefined}
                  max={hoy}
                />
              </div>
            )}
          </fieldset>
        ) : (
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500">
            Se incluyen todos los plazos que siguen pendientes, con su estado a hoy. No lleva
            período: filtrar por fecha podría dejar afuera un plazo por vencer.
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>

      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={exportando}>
          Cancelar
        </Button>
        <Button onClick={exportar} disabled={exportando || rangoInvalido}>
          {exportando ? 'Generando...' : 'Exportar PDF'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}