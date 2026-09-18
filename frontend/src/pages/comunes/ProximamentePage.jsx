// ============================================================
// ProximamentePage.jsx
// Placeholder para módulos del sidebar que todavía no tienen
// backend/frontend implementado (Asesorías, Calendario, Honorarios, Cobros).
// Se muestra en vez de ocultar o deshabilitar el link de navegación.
// ============================================================

export default function ProximamentePage() {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <h2 className="text-xl font-semibold text-slate-700">
          Este módulo está en construcción
        </h2>
        <p className="mt-2 text-sm text-slate-500 max-w-sm">
          Todavía no fue desarrollado dentro del sistema. Va a estar disponible
          en una próxima etapa del proyecto.
        </p>
      </div>
    );
  }