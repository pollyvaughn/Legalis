// ============================================================
// ExportarVencimientosModal.jsx
// Modal "Exportar PDF" del listado de VENCIMIENTOS PENDIENTES (RF6),
// que se abre desde el encabezado de Calendario & Plazos. Junta
// plazos judiciales y vencimientos de RUC, ordenados por urgencia.
//
// Se elige acá (para no llenar la pantalla de filtros):
//   - Tipo: todos / solo plazos judiciales / solo RUC
//   - Hasta cuándo: todos los pendientes, próximos 30 o 60 días, o un
//     rango de fechas.
// En las opciones de "próximos N días" los VENCIDOS que siguen
// pendientes se incluyen siempre (no se mandan "desde"). En el rango
// entra solo lo que vence dentro de las fechas elegidas.
//
// Props:
//   tipoInicial  'todos' | 'plazos' | 'ruc' (viene de los filtros de la pantalla)
//   onClose      cierra el modal
// Endpoint: GET /vencimientos/exportar?tipo=&desde=&hasta=
// ============================================================

import { useState } from 'react';
import api from '../../api/axios';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { Input } from '../ui/Input';

// Qué tipo de vencimiento se exporta
const TIPOS = [
  { value: 'todos', label: 'Plazos judiciales y RUC' },
  { value: 'plazos', label: 'Solo plazos judiciales' },
  { value: 'ruc', label: 'Solo vencimientos de RUC' },
];

// Hasta cuándo (cada una se traduce a desde/hasta al exportar)
const HORIZONTES = [
  { value: 'todos', label: 'Todos los pendientes' },
  { value: '30', label: 'Vencidos y próximos 30 días' },
  { value: '60', label: 'Vencidos y próximos 60 días' },
  { value: 'rango', label: 'Rango de fechas' },
];

// ------------------------------------------------------------
// "Hoy más N días" como 'AAAA-MM-DD' (fecha local del navegador)
// ------------------------------------------------------------
function hoyMasDias(dias) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  const dos = (n) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

export default function ExportarVencimientosModal({ tipoInicial = 'todos', onClose }) {
  const [tipo, setTipo] = useState(tipoInicial);
  const [horizonte, setHorizonte] = useState('todos');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState('');

  const esRango = horizonte === 'rango';
  // Rango incompleto o al revés: todavía no se puede exportar
  const rangoInvalido = esRango && (!desde || !hasta || desde > hasta);

  // ------------------------------------------------------------
  // Pide el PDF y lo descarga vía blob (mismo patrón que los demás
  // exportar del sistema).
  // ------------------------------------------------------------
  async function exportar() {
    setError('');
    setExportando(true);

    // Traduce la opción elegida a desde/hasta
    const params = { tipo };
    if (horizonte === '30' || horizonte === '60') {
      params.hasta = hoyMasDias(Number(horizonte));
    } else if (esRango) {
      params.desde = desde;
      params.hasta = hasta;
    }

    try {
      const respuesta = await api.get('/vencimientos/exportar', { params, responseType: 'blob' });

      const url = window.URL.createObjectURL(new Blob([respuesta.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'vencimientos-pendientes.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      onClose();
    } catch {
      setError('No se pudo generar el PDF');
    } finally {
      setExportando(false);
    }
  }

  return (
    <Modal title="Exportar vencimientos pendientes" onClose={onClose}>
      <div className="space-y-5 px-6 py-5">
        {/* --- 1. Tipo de vencimiento --- */}
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-gray-700">Tipo</legend>
          <div className="space-y-2">
            {TIPOS.map((opcion) => (
              <label key={opcion.value} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="tipo"
                  value={opcion.value}
                  checked={tipo === opcion.value}
                  onChange={() => setTipo(opcion.value)}
                />
                {opcion.label}
              </label>
            ))}
          </div>
        </fieldset>

        {/* --- 2. Hasta cuándo --- */}
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-gray-700">Período</legend>
          <div className="grid grid-cols-2 gap-2">
            {HORIZONTES.map((opcion) => (
              <label key={opcion.value} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="horizonte"
                  value={opcion.value}
                  checked={horizonte === opcion.value}
                  onChange={() => setHorizonte(opcion.value)}
                />
                {opcion.label}
              </label>
            ))}
          </div>

          {/* Fechas del rango personalizado */}
          {esRango && (
            <div className="mt-3 grid grid-cols-2 gap-4">
              <Input
                label="Vence desde"
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                max={hasta || undefined}
              />
              <Input
                label="Vence hasta"
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                min={desde || undefined}
              />
            </div>
          )}
        </fieldset>

        <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500">
          Solo incluye vencimientos pendientes, ordenados por urgencia. Los cumplidos no aparecen.
        </p>

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