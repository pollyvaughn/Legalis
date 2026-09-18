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

// Formatea la fecha actual en español, ej: "miércoles, 17 de septiembre de 2026"
function fechaHoyFormateada() {
  return new Date().toLocaleDateString("es-PY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function AppLayout({ children }) {
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* --- Header superior --- */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4">
          <h2 className="text-base font-medium text-slate-800">
            Estudio Romero & Asociados {/* placeholder Figma, sin dato real todavía */}
          </h2>
          <span className="text-sm text-slate-500 capitalize">
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