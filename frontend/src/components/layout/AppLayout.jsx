// ============================================================
// AppLayout.jsx
// Layout general de la app autenticada: Sidebar fijo a la izquierda
// + header superior (nombre del estudio + fecha) + área de contenido
// donde se renderiza la página actual (recibida como children).
//
// Se usa envolviendo cada página dentro de RutaProtegida en App.jsx:
// <RutaProtegida><AppLayout><MiPagina /></AppLayout></RutaProtegida>
// ============================================================

import Sidebar from "./Sidebar";

// Formatea la fecha actual en español, ej: "Miércoles, 17 de septiembre de 2026"
function fechaHoyFormateada() {
  const fecha = new Intl.DateTimeFormat('es-PY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
  // Solo el día (primer carácter); no usar className "capitalize"
  // porque también capitaliza "de" y el mes.
  return fecha.charAt(0).toLocaleUpperCase('es-PY') + fecha.slice(1);
}

export default function AppLayout({ children }) {
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* --- Header superior --- */}
        <header className="flex items-center justify-end border-b border-slate-200 bg-white px-8 py-4">
          <span className="text-sm text-slate-500">
            {fechaHoyFormateada()}
          </span>
        </header>

        {/* --- Contenido de la página actual --- */}
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}