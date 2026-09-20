// ============================================
// URGENCIABADGE.JSX
// Aviso de cercanía del vencimiento. Solo aplica a trámites
// abiertos (pendientes o en proceso). Los umbrales (hoy / 7 días)
// son PROVISORIOS: el Módulo 2 define las alertas definitivas.
// ============================================

import Badge from '../ui/Badge';
import { diasHasta } from '../../utils/fechas';

export default function UrgenciaBadge({ tramite }) {
  if (!['PENDIENTE', 'EN_PROCESO'].includes(tramite.estado)) return null;

  const dias = diasHasta(tramite.fechaVencimiento);
  if (dias < 0) return <Badge tone="red">Vencido</Badge>;
  if (dias === 0) return <Badge tone="yellow">Vence hoy</Badge>;
  if (dias <= 7) return <Badge tone="yellow">En {dias} d</Badge>;
  return null; // más de una semana: sin aviso
}