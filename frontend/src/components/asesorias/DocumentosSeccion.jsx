// ============================================
// DOCUMENTOSSECCION.JSX
// Registro de recepción de documentos: solo se ANOTA qué llegó, cuándo
// y alguna observación (no se suben archivos).
// Es reutilizable: sirve para un trámite ("/tramites/5/documentos") o,
// más adelante, para un expediente ("/expedientes/5/documentos").
//
// Props:
//   urlBase     ruta de la API donde se crean los documentos
//   documentos  lista actual (la maneja el componente padre)
//   onChange    se llama con la lista NUEVA tras crear, editar o eliminar
// ============================================

import { useState } from 'react';
import api from '../../api/axios';
import Button from '../ui/Button';
import { Input } from '../ui/Input';
import { formatearFechaSola, aInputFecha, hoyInput } from '../../utils/fechas';

// Sugerencias del campo "tipo" (se puede escribir cualquier otro texto)
const SUGERENCIAS = [
  'Facturas de compras',
  'Facturas de ventas',
  'Cédula de identidad',
  'Extracto bancario',
  'Balance',
  'Contrato',
  'Poder',
  'Otros comprobantes',
];

// Más reciente primero (por fecha de recepción; el id desempata), igual que el backend.
// Las fechas son texto ISO, así que comparar como texto ordena bien.
function ordenar(lista) {
  return [...lista].sort((a, b) => {
    const porFecha = b.fechaRecepcion.localeCompare(a.fechaRecepcion);
    return porFecha !== 0 ? porFecha : b.id - a.id;
  });
}

export default function DocumentosSeccion({ urlBase, documentos, onChange }) {
  // Formulario: null = cerrado | { id: null (alta) o número (edición), ...campos }
  const [form, setForm] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Id del documento que se está por eliminar (confirmación en la propia fila)
  const [borrarId, setBorrarId] = useState(null);

  function abrirNuevo() {
    setError('');
    setForm({ id: null, tipoDocumento: '', fechaRecepcion: hoyInput(), observaciones: '' });
  }

  function abrirEditar(doc) {
    setError('');
    setForm({
      id: doc.id,
      tipoDocumento: doc.tipoDocumento,
      fechaRecepcion: aInputFecha(doc.fechaRecepcion),
      observaciones: doc.observaciones || '',
    });
  }

  // Un solo handler para todos los campos: usa el "name" de cada input
  function handleChange(evento) {
    const { name, value } = evento.target;
    setForm((formAnterior) => ({ ...formAnterior, [name]: value }));
  }

  // ------------------------------------------
  // GUARDAR (POST si es nuevo, PUT si se edita)
  // ------------------------------------------
  async function handleSubmit(evento) {
    evento.preventDefault();
    setGuardando(true);
    setError('');
    try {
      const datos = {
        tipoDocumento: form.tipoDocumento,
        fechaRecepcion: form.fechaRecepcion,
        observaciones: form.observaciones,
      };
      if (form.id) {
        const respuesta = await api.put(`/documentos/${form.id}`, datos);
        onChange(ordenar(documentos.map((d) => (d.id === form.id ? respuesta.data : d))));
      } else {
        const respuesta = await api.post(urlBase, datos);
        onChange(ordenar([respuesta.data, ...documentos]));
      }
      setForm(null);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar el documento');
    } finally {
      setGuardando(false);
    }
  }

  // ------------------------------------------
  // ELIMINAR (definitivo: es una línea de un registro)
  // ------------------------------------------
  async function eliminar(id) {
    setError('');
    try {
      await api.delete(`/documentos/${id}`);
      onChange(documentos.filter((d) => d.id !== id));
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo eliminar el documento');
    } finally {
      setBorrarId(null);
    }
  }

  return (
    <div className="border-t border-gray-100 pt-5">
      {/* --- Título + acción --- */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-medium text-gray-700">Documentos recibidos</h4>
          <p className="text-xs text-gray-400">Solo se registra la recepción; no se suben archivos.</p>
        </div>
        {!form && (
          <Button variant="secondary" size="sm" onClick={abrirNuevo}>
            + Registrar recepción
          </Button>
        )}
      </div>

      {/* --- Formulario de alta / edición --- */}
      {form && (
        <form onSubmit={handleSubmit} className="mb-4 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Tipo de documento *"
              name="tipoDocumento"
              value={form.tipoDocumento}
              onChange={handleChange}
              list="sugerencias-documentos"
              maxLength={150}
              placeholder="Ej: Facturas de compras"
              required
            />
            <Input
              label="Fecha de recepción *"
              type="date"
              name="fechaRecepcion"
              value={form.fechaRecepcion}
              onChange={handleChange}
              max={hoyInput()} /* no puede ser futura (misma regla que el backend) */
              required
            />
          </div>
          <datalist id="sugerencias-documentos">
            {SUGERENCIAS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>

          <Input
            label="Observaciones (opcional)"
            name="observaciones"
            value={form.observaciones}
            onChange={handleChange}
            maxLength={500}
            placeholder="Ej: Faltan las de agosto"
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setForm(null)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={guardando}>
              {guardando ? 'Guardando...' : form.id ? 'Guardar cambios' : 'Registrar'}
            </Button>
          </div>
        </form>
      )}

      {/* --- Lista de documentos --- */}
      {documentos.length === 0 ? (
        !form && <p className="text-sm text-gray-500">Todavía no se registró ningún documento.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {documentos.map((doc) => (
            <li key={doc.id} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{doc.tipoDocumento}</p>
                <p className="text-xs text-gray-500">Recibido el {formatearFechaSola(doc.fechaRecepcion)}</p>
                {doc.observaciones && <p className="mt-0.5 text-xs text-gray-500">{doc.observaciones}</p>}
              </div>

              {borrarId === doc.id ? (
                <div className="flex shrink-0 items-center gap-2 text-sm">
                  <span className="text-gray-600">¿Eliminar?</span>
                  <button onClick={() => eliminar(doc.id)} className="font-medium text-red-600 hover:underline">
                    Sí
                  </button>
                  <button onClick={() => setBorrarId(null)} className="text-gray-500 hover:underline">
                    No
                  </button>
                </div>
              ) : (
                <div className="flex shrink-0 gap-3 text-sm">
                  <button onClick={() => abrirEditar(doc)} className="text-gray-600 hover:underline">
                    Editar
                  </button>
                  <button onClick={() => setBorrarId(doc.id)} className="text-red-600 hover:underline">
                    Eliminar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}