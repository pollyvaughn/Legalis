// ============================================================
// Input.jsx
// Campo de formulario con label incluido, para unificar el
// bloque "<label>...</label><input .../>" que se repetía en
// cada form (modales de creación, ediciones inline, partes).
//
// USO:
//   <Input label="Email" name="email" value={form.email} onChange={handleChange} />
//   <Input label="RUC" name="ruc" required />
//   <Input label="Monto" name="montoJuicio" type="text" inputMode="decimal" />
//
// Para <select>, usar SelectInput (definido más abajo en este mismo archivo)
// con la misma apariencia visual que Input.
// ============================================================

// Clases base compartidas por input y select, para que se vean idénticos
const CLASES_CAMPO =
  'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none';

export function Input({ label, id, className = '', ...resto }) {
  // Si no se pasa un id explícito, se genera a partir del name
  // (React necesita htmlFor === id para que el label sea accesible)
  const inputId = id || resto.name;

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input id={inputId} className={[CLASES_CAMPO, className].filter(Boolean).join(' ')} {...resto} />
    </div>
  );
}

// SelectInput: mismo look que Input, pero para <select>.
// "opciones" es un array de { value, label }.
export function SelectInput({ label, id, opciones, className = '', ...resto }) {
  const selectId = id || resto.name;

  return (
    <div>
      {label && (
        <label htmlFor={selectId} className="mb-1 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <select id={selectId} className={[CLASES_CAMPO, className].filter(Boolean).join(' ')} {...resto}>
        {opciones.map((opcion) => (
          <option key={opcion.value} value={opcion.value} disabled={opcion.disabled}>
            {opcion.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Textarea: mismo look que Input, para textos largos (ej: cuerpo de un escrito).
// resize-y permite estirarlo hacia abajo pero no hacia los costados.
export function Textarea({ label, id, className = '', ...resto }) {
  const textareaId = id || resto.name;

  return (
    <div>
      {label && (
        <label htmlFor={textareaId} className="mb-1 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={[CLASES_CAMPO, 'resize-y', className].filter(Boolean).join(' ')}
        {...resto}
      />
    </div>
  );
}