// ============================================================
// MarcaEvento.jsx
// La "marca" que representa un vencimiento en el calendario:
//   - círculo  = plazo judicial
//   - cuadrado = vencimiento de RUC
// El COLOR es el semáforo (urgencia). Así se distinguen el tipo y la
// urgencia a la vez, y el tipo se entiende aunque no se vean bien los
// colores. Sin 'semaforo' se pinta gris (se usa en los filtros).
// ============================================================

import { TIPO_RUC } from './eventosCalendario';

// Color de la marca según semáforo — como fondo sólido porque es una
// figura chica, no una pastilla con texto (mismo mapeo que Badge).
export const COLOR_MARCA = {
  VERDE: 'bg-green-500',
  AMARILLO: 'bg-yellow-500',
  ROJO: 'bg-orange-500',
  VENCIDO: 'bg-red-500',
  CUMPLIDO: 'bg-gray-400',
};

export default function MarcaEvento({ tipo, semaforo, className = '' }) {
  const forma = tipo === TIPO_RUC ? 'rounded-[3px]' : 'rounded-full';
  const color = COLOR_MARCA[semaforo] || 'bg-gray-400';

  return (
    <span
      aria-hidden="true"
      className={`inline-block h-2.5 w-2.5 shrink-0 ${forma} ${color} ${className}`}
    />
  );
}