// ============================================================
// Button.jsx
// Botón reusable con variantes de color y tamaño, para unificar
// el estilo de todos los botones de la app (Guardar, Cancelar,
// + Nuevo cliente, Editar, etc.) en un solo lugar.
//
// USO:
//   <Button>Guardar cliente</Button>                    → primary, md
//   <Button variant="secondary">Cancelar</Button>
//   <Button variant="danger" size="sm">Eliminar</Button>
//   <Button disabled={guardando}>...</Button>
// ============================================================

// VARIANTES: cada una es un set de clases de color.
// "primary" = negro (acción principal: guardar, crear)
// "secondary" = gris claro (acción secundaria: cancelar)
// "danger" = rojo (acciones destructivas: eliminar, inactivar)
// "ghost" = transparente con texto gris (acciones sutiles: "Editar" en filas de tabla)
const VARIANTES = {
    primary: 'bg-gray-900 text-white hover:bg-gray-800',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-gray-600 hover:bg-gray-100',
  };
  
  // TAMAÑOS: padding + tamaño de fuente.
  const TAMANOS = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };
  
  export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    className = '', // permite agregar clases puntuales sin romper el patrón (ej: "w-full")
    ...resto // pasa cualquier otra prop tal cual (onClick, type, disabled, etc.)
  }) {
    return (
      <button
        className={[
          'rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed',
          VARIANTES[variant],
          TAMANOS[size],
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...resto}
      >
        {children}
      </button>
    );
  }