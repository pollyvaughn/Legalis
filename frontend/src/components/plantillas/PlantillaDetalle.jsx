// ============================================
// PLANTILLADETALLE.JSX
// Panel derecho de la biblioteca: muestra una plantilla completa
// (título, datos, cuerpo del escrito) con las acciones
// "Copiar" y "Descargar .txt".
//
// Recibe la plantilla ya cargada desde la página. Las acciones
// de la Tanda B (Editar / Duplicar / Eliminar) se suman acá.
// ============================================

import { useState } from 'react';
import { Copy, Check, Download, X, Pencil, CopyPlus, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { formatearFecha } from '../../utils/fechas';
import {
  TONO_CATEGORIA,
  etiquetaCategoria,
  etiquetaClase,
  etiquetaOrigen,
  textoFuero,
} from '../../constants/plantillas';

// Convierte un título en nombre de archivo seguro:
// "Demanda por daños y perjuicios" -> "demanda-por-danos-y-perjuicios"
function nombreArchivo(titulo) {
  return titulo
    .toLowerCase()
    .normalize('NFD')                  // separa la letra de su tilde (ñ -> n + ~)
    .replace(/[\u0300-\u036f]/g, '')   // borra las tildes sueltas
    .replace(/[^a-z0-9]+/g, '-')       // todo lo que no sea letra/número -> guion
    .replace(/^-+|-+$/g, '');          // saca guiones al principio/final
}

function PlantillaDetalle({ plantilla, cargando, onCerrar, onEditar, onDuplicar, onEliminar }) {
  // true durante 2 segundos después de copiar (para mostrar "¡Copiado!")
  const [copiado, setCopiado] = useState(false);

  // ------------------------------------------
  // COPIAR al portapapeles
  // navigator.clipboard es la API nativa del navegador.
  // Funciona en localhost y en https (no en http común).
  // ------------------------------------------
  async function copiar() {
    try {
      await navigator.clipboard.writeText(plantilla.contenido);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (err) {
      alert('No se pudo copiar al portapapeles');
    }
  }

  // ------------------------------------------
  // DESCARGAR como .txt (sin pasar por el backend)
  // Blob = "archivo en memoria". Creamos un link temporal que apunta
  // a ese Blob, lo "clickeamos" por código y lo liberamos.
  // ------------------------------------------
  function descargarTxt() {
    const blob = new Blob([plantilla.contenido], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `${nombreArchivo(plantilla.titulo)}.txt`;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  // --- Mientras llega el detalle del backend ---
  if (cargando || !plantilla) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">
        Cargando plantilla...
      </div>
    );
  }

  return (
    <div className="self-start rounded-xl border border-gray-200 bg-white">
      {/* --- Encabezado: título + datos + barra de acciones --- */}
      <div className="border-b border-gray-100 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900">{plantilla.titulo}</h2>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500">
          <Badge tone={TONO_CATEGORIA[plantilla.categoria]}>
            {etiquetaCategoria(plantilla.categoria)}
          </Badge>
          <span>{textoFuero(plantilla.fuero)}</span>
          <span>·</span>
          <span>{etiquetaClase(plantilla.clase)}</span>
          <span>·</span>
          <span>Origen: {etiquetaOrigen(plantilla.origen)}</span>
          <span>·</span>
          <span>Editado {formatearFecha(plantilla.actualizadoEn)}</span>
        </div>
        {plantilla.descripcion && (
          <p className="mt-2 text-sm text-gray-500">{plantilla.descripcion}</p>
        )}

        {/* --- Barra de acciones: uso del escrito (izq) / gestión (der) --- */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={copiar}>
              <span className="flex items-center gap-1.5">
                {copiado ? <Check size={15} strokeWidth={1.75} /> : <Copy size={15} strokeWidth={1.75} />}
                {copiado ? '¡Copiado!' : 'Copiar'}
              </span>
            </Button>
            <Button variant="secondary" size="sm" onClick={descargarTxt}>
              <span className="flex items-center gap-1.5">
                <Download size={15} strokeWidth={1.75} />
                .txt
              </span>
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onEditar}>
              <span className="flex items-center gap-1.5">
                <Pencil size={15} strokeWidth={1.75} />
                Editar
              </span>
            </Button>
            <Button variant="secondary" size="sm" onClick={onDuplicar}>
              <span className="flex items-center gap-1.5">
                <CopyPlus size={15} strokeWidth={1.75} />
                Duplicar
              </span>
            </Button>
            <Button variant="danger" size="sm" onClick={onEliminar}>
              <span className="flex items-center gap-1.5">
                <Trash2 size={15} strokeWidth={1.75} />
                Eliminar
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* --- Cuerpo del escrito --- */}
      <div className="px-6 py-5">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
          {plantilla.contenido}
        </p>
      </div>
    </div>
  );
}

export default PlantillaDetalle;