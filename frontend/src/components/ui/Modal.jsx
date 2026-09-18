// ============================================================
// Modal.jsx
// "Cáscara" reusable de un modal: fondo oscuro + card blanca +
// header con título y botón de cerrar (X) + slot para el
// contenido (children) + footer opcional con acciones.
//
// El contenido específico de cada modal (los campos del form)
// se pasa como children; el footer con botones también se pasa
// como children de <Modal.Footer> o se arma directo en el padre.
//
// USO:
//   <Modal title="Nuevo cliente" onClose={cerrar}>
//     <form onSubmit={...}>
//       ...campos...
//       <Modal.Footer>
//         <Button variant="secondary" onClick={cerrar}>Cancelar</Button>
//         <Button type="submit">Guardar</Button>
//       </Modal.Footer>
//     </form>
//   </Modal>
// ============================================================

import { X } from 'lucide-react';

export default function Modal({ title, onClose, children }) {
  return (
    // --- Fondo oscuro semitransparente, clic afuera cierra el modal ---
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      {/* stopPropagation: evita que un clic DENTRO del modal lo cierre */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl"
      >
        {/* --- Header: título + botón de cerrar --- */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        {/* --- Contenido: lo que le pase cada modal específico --- */}
        {children}
      </div>
    </div>
  );
}

// Modal.Footer: barra inferior con separador, para las acciones
// (Cancelar / Guardar). Se usa como children DENTRO del <form>,
// como último elemento, para que el submit del form funcione bien.
Modal.Footer = function ModalFooter({ children }) {
  return (
    <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
      {children}
    </div>
  );
};