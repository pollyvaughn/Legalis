// ============================================================
// Sidebar.jsx
// Barra de navegación lateral fija de la aplicación.
// Muestra los 8 módulos del sistema (aunque algunos todavía no
// tengan backend/frontend funcional) + bloque de perfil de usuario.
// Paleta clara (fondo blanco), siguiendo la referencia visual de Figma.
// ============================================================

import { NavLink } from "react-router-dom";
import {
  Briefcase,
  Menu,
  LayoutGrid,
  Users,
  FileText,
  FileSignature,
  Clock,
  Calendar,
  DollarSign,
  CreditCard,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

// Lista de items del menú.
// "disponible: false" = módulo sin backend aún → lleva a pantalla "próximamente"
// pero el link SIGUE visible (decisión de diseño: no ocultar, no deshabilitar).
const NAV_ITEMS = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutGrid, disponible: false },
  { label: "Clientes", to: "/clientes", icon: Users, disponible: true },
  { label: "Expedientes", to: "/expedientes", icon: FileText, disponible: true },
  { label: "Asesorías & Trámites", to: "/asesorias", icon: Clock, disponible: false },
  { label: "Calendario & Plazos", to: "/calendario", icon: Calendar, disponible: false },
  { label: "Honorarios & Gastos", to: "/honorarios", icon: DollarSign, disponible: false },
  { label: "Escritos Forenses", to: "/plantillas", icon: FileSignature, disponible: true },
  { label: "Cobros & Facturación", to: "/cobros", icon: CreditCard, disponible: false },
];

// Genera las iniciales a partir del nombre completo, ej: "Martín Romero" -> "MR"
function iniciales(nombre) {
  if (!nombre) return "??";
  const partes = nombre.trim().split(/\s+/);
  const primera = partes[0]?.[0] || "";
  const segunda = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primera + segunda).toUpperCase();
}

export default function Sidebar() {
  const { usuario, logout } = useAuth();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      {/* --- Encabezado: logo + botón de colapsar (colapso aún no implementado) --- */}
      <div className="flex items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-white">
            <Briefcase size={16} strokeWidth={2} />
          </span>
          <span className="text-base font-semibold text-gray-900">Legalis</span>
        </div>
        <button
          type="button"
          title="Colapsar menú"
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <Menu size={18} strokeWidth={1.75} />
        </button>
      </div>

      {/* --- Navegación principal --- */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {NAV_ITEMS.map(({ label, to, icon: Icon, disponible }) => (
          <NavLink
            key={to}
            to={to}
            // Si el módulo no está disponible, igual navega, pero a una
            // ruta que renderiza <ProximamentePage />. Nunca se deshabilita
            // el link (decisión: siempre visible y clickeable).
            className={({ isActive }) =>
              [
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                !disponible && !isActive && "text-gray-400", // pista visual sutil de "todavía no completo"
              ]
                .filter(Boolean)
                .join(" ")
            }
          >
            <Icon size={18} strokeWidth={1.75} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* --- Bloque de perfil de usuario (footer del sidebar) --- */}
      <div className="border-t border-gray-200 px-4 py-4">
        <div className="flex items-center gap-3">
          {/* avatar circular con iniciales del usuario logueado */}
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-900 text-sm font-medium text-white">
            {iniciales(usuario?.nombre)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">
              {usuario?.nombre || "Usuario"}
            </p>
            <p className="truncate text-xs text-gray-500">
              {usuario?.rol || "—"}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-3 w-full rounded-lg py-1.5 text-left text-xs text-gray-400 hover:text-gray-700"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}