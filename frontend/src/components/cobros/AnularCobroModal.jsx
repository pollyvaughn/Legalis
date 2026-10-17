// ============================================================
// ANULARCOBROMODAL.JSX — Módulo 4 (RF10 / CU-27, RN-35)
// Confirmación para anular un recibo. El motivo es obligatorio.
// NO borra: el recibo conserva su número, pasa a ANULADO y sus
// importes vuelven al saldo (el backend recalcula los estados de
// las liquidaciones y los gastos).
//
// Props:
//   cobro      el recibo a anular (necesita id, numero y total)
//   onClose    cerrar sin anular
//   onAnulado  (cobroActualizado) se llama cuando el backend confirmó
// Lo usan CobrosSeccion (expediente / trámite) y CobrosPage (/cobros).
// ============================================================

import { useState } from 'react';
import api from '../../api/axios';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Textarea } from '../ui/Input';
import { formatearGs } from '../../utils/moneda';
import { MOTIVO_MAXIMO } from '../../constants/cobros';

export default function AnularCobroModal({ cobro, onClose, onAnulado }) {
  const [motivo, setMotivo] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(evento) {
    evento.preventDefault();
    setProcesando(true);
    setError('');
    try {
      const respuesta = await api.post(`/cobros/${cobro.id}/anular`, { motivo });
      onAnulado(respuesta.data);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo anular el recibo');
      setProcesando(false);
    }
  }

  return (
    // closeOnOverlay=false: un clic afuera no debe perder el motivo escrito
    <Modal title={`Anular recibo N° ${cobro.numero}`} onClose={onClose} closeOnOverlay={false}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-3 px-6 py-5">
          <p className="text-sm text-gray-700">
            ¿Seguro que querés anular el recibo <strong>N° {cobro.numero}</strong> por{' '}
            <strong>{formatearGs(cobro.total)}</strong>?
          </p>
          <p className="text-sm text-gray-500">
            No se borra: conserva su número y queda marcado como anulado. Sus importes vuelven al saldo del
            expediente o trámite.
          </p>

          <Textarea
            label="Motivo de la anulación *"
            name="motivo"
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={MOTIVO_MAXIMO}
            placeholder="Ej: Error de monto al cargar el recibo"
            required
          />
          <p className="text-right text-xs text-gray-400">
            {motivo.length}/{MOTIVO_MAXIMO}
          </p>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={onClose} disabled={procesando}>
            Cancelar
          </Button>
          <Button type="submit" variant="danger" disabled={procesando || !motivo.trim()}>
            {procesando ? 'Anulando...' : 'Sí, anular recibo'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}