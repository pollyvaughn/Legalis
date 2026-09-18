// ============================================================
// TablaContainer.jsx
// Card blanca con barra de búsqueda + contador arriba, y la
// tabla (pasada como children) abajo. Unifica el wrapper visual
// que se repetía en ClientesListPage y ExpedientesListPage.
//
// El filtrado en sí (qué texto matchea qué campos) queda en cada
// página, porque los campos a buscar son distintos en cada caso
// — este componente solo es el contenedor visual + el input.
//
// USO:
//   <TablaContainer
//     busqueda={busqueda}
//     onBusquedaChange={setBusqueda}
//     placeholder="Buscar cliente, email, RUC..."
//     cantidad={clientesFiltrados.length}
//     unidad="cliente"
//   >
//     <table>...</table>
//   </TablaContainer>
// ============================================================

import { Search } from 'lucide-react';

export default function TablaContainer({
  busqueda,
  onBusquedaChange,
  placeholder,
  cantidad,
  unidad, // ej: "cliente" → se pluraliza solo como "clientes"
  children,
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      {/* --- Barra de búsqueda + contador --- */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div className="relative w-80">
          <Search
            size={16}
            strokeWidth={1.75}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none"
          />
        </div>
        <span className="text-sm text-gray-500">
          {cantidad} {unidad}{cantidad !== 1 && 's'}
        </span>
      </div>

      {/* --- Contenido: la tabla o el mensaje de "sin resultados" --- */}
      {children}
    </div>
  );
}