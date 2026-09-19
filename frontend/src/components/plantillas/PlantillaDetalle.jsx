// ============================================
// PLANTILLADETALLE.JSX
// Panel derecho de la biblioteca: muestra una plantilla completa.
//
// Estructura (de arriba hacia abajo):
//   1. Título + badge de categoría + descripción
//   2. Ficha de datos (fuero, clase, origen, última edición)
//   3. Barra de acciones: usar el escrito (Copiar / Descargar)
//      y gestionar la plantilla (Editar / Duplicar / Eliminar)
//   4. Cuerpo del escrito
//
// Recibe la plantilla ya cargada desde la página.
// ============================================

import { useState } from 'react';
import { Copy, Check, Download, X, Pencil, CopyPlus, Trash2, ChevronDown } from 'lucide-react';
import api from '../../api/axios';
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

// Opciones del menú "Descargar". "id" es el formato que se pide.
const FORMATOS_DESCARGA = [
  { id: 'txt', label: 'Texto (.txt)' },
  { id: 'docx', label: 'Word (.docx)' },
  { id: 'pdf', label: 'PDF (.pdf)' },
];

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

// Un dato de la ficha: etiqueta chica arriba, valor abajo
function Dato({ etiqueta, valor }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{etiqueta}</p>
      <p className="mt-0.5 text-sm text-gray-700">{valor}</p>
    </div>
  );
}

function PlantillaDetalle({ plantilla, cargando, onCerrar, onEditar, onDuplicar, onEliminar }) {
  // true durante 2 segundos después de copiar (para mostrar "¡Copiado!")
  const [copiado, setCopiado] = useState(false);

  // Menú "Descargar" abierto o cerrado
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Formato que se está generando en el backend ('docx' | 'pdf') o null.
  // Sirve para deshabilitar el botón mientras se arma el archivo.
  const [descargando, setDescargando] = useState(null);

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
  // Helper: guarda un Blob (archivo en memoria) como descarga del navegador.
  // Crea un link temporal apuntando al Blob, lo "clickea" y lo libera.
  // ------------------------------------------
  function guardarBlob(blob, nombre) {
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  // ------------------------------------------
  // DESCARGAR .txt (se arma acá mismo, sin backend)
  // ------------------------------------------
  function descargarTxt() {
    const blob = new Blob([plantilla.contenido], { type: 'text/plain;charset=utf-8' });
    guardarBlob(blob, `${nombreArchivo(plantilla.titulo)}.txt`);
  }

  // ------------------------------------------
  // DESCARGAR .docx / .pdf (los genera el backend)
  // responseType 'blob' = axios devuelve el binario tal cual, sin
  // intentar leerlo como JSON. El token viaja porque usamos "api".
  // ------------------------------------------
  async function descargarArchivo(formato) {
    setDescargando(formato);
    try {
      const respuesta = await api.get(`/plantillas/${plantilla.id}/descargar`, {
        params: { formato },
        responseType: 'blob',
      });
      guardarBlob(respuesta.data, `${nombreArchivo(plantilla.titulo)}.${formato}`);
    } catch (err) {
      alert('No se pudo generar el archivo');
    } finally {
      setDescargando(null);
    }
  }

  // Al elegir una opción del menú: lo cierra y descarga en ese formato
  function elegirFormato(formato) {
    setMenuAbierto(false);
    if (formato === 'txt') descargarTxt();
    else descargarArchivo(formato);
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
      {/* ========== 1. Título + badge + descripción ========== */}
      <div className="px-6 pb-5 pt-5">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900">{plantilla.titulo}</h2>
          <button
            type="button"
            onClick={onCerrar}
            title="Cerrar"
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="mt-2">
          <Badge tone={TONO_CATEGORIA[plantilla.categoria]}>
            {etiquetaCategoria(plantilla.categoria)}
          </Badge>
        </div>

        {plantilla.descripcion && (
          <p className="mt-3 text-sm text-gray-500">{plantilla.descripcion}</p>
        )}

        {/* ========== 2. Ficha de datos ========== */}
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Dato etiqueta="Fuero" valor={textoFuero(plantilla.fuero)} />
          <Dato etiqueta="Clase" valor={etiquetaClase(plantilla.clase)} />
          <Dato etiqueta="Origen" valor={etiquetaOrigen(plantilla.origen)} />
          <Dato etiqueta="Editado" valor={formatearFecha(plantilla.actualizadoEn)} />
        </div>
      </div>

      {/* ========== 3. Barra de acciones (una sola fila) ========== */}
      <div className="flex items-center justify-between gap-2 border-y border-gray-100 bg-gray-50 px-6 py-3">
        {/* --- Izquierda: usar el escrito --- */}
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={copiar}>
            <span className="flex items-center gap-1.5">
              {copiado ? <Check size={15} strokeWidth={1.75} /> : <Copy size={15} strokeWidth={1.75} />}
              {copiado ? '¡Copiado!' : 'Copiar'}
            </span>
          </Button>

          {/* Menú desplegable de descargas */}
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMenuAbierto(!menuAbierto)}
              disabled={descargando !== null}
            >
              <span className="flex items-center gap-1.5">
                <Download size={15} strokeWidth={1.75} />
                {descargando ? 'Generando...' : 'Descargar'}
                <ChevronDown size={14} strokeWidth={1.75} />
              </span>
            </Button>

            {menuAbierto && (
              <>
                {/* Capa invisible a pantalla completa: un clic afuera cierra el menú */}
                <div className="fixed inset-0 z-10" onClick={() => setMenuAbierto(false)} />
                <div className="absolute left-0 z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  {FORMATOS_DESCARGA.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => elegirFormato(f.id)}
                      className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* --- Derecha: gestionar la plantilla --- */}
        <div className="flex items-center gap-2">
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
          {/* Eliminar: solo ícono, rojo suave. La confirmación pasa por el modal. */}
          <button
            type="button"
            onClick={onEliminar}
            title="Eliminar plantilla"
            className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={17} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* ========== 4. Cuerpo del escrito ==========
          whitespace-pre-wrap respeta los saltos de línea del texto original
          y a la vez parte las líneas largas para que no desborden. */}
      <div className="px-6 py-5">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
          {plantilla.contenido}
        </p>
      </div>
    </div>
  );
}

export default PlantillaDetalle;