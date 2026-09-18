// ============================================================
// Badge.jsx
// Pastilla de color para mostrar estados (Activo/Inactivo,
// Vencido/Próximo/Al día, etc.) de forma consistente en toda
// la app — listas, dashboards, detalles.
//
// USO:
//   <Badge tone="green">Activo</Badge>
//   <Badge tone="red">Vencido</Badge>
//   <Badge tone="gray">Persona física</Badge>  (para info neutra, no-estado)
// ============================================================

// Cada "tone" es un color semántico. Se elige por SIGNIFICADO,
// no por dónde se usa: "red" siempre es negativo/urgente,
// "green" siempre es positivo/al día, etc. — así un plazo
// vencido y un cliente inactivo pueden compartir el mismo tone
// si tienen el mismo significado (o no, según decidamos).
const TONOS = {
    gray: 'bg-gray-100 text-gray-600',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-700',
    blue: 'bg-blue-50 text-blue-700',
  };
  
  export default function Badge({ children, tone = 'gray' }) {
    return (
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TONOS[tone]}`}>
        {children}
      </span>
    );
  }