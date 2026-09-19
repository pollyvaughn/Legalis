// ============================================
// PLANTILLAFORMMODAL.JSX
// Modal para crear, editar o duplicar una plantilla de escrito.
//
// Props:
//   modo       'crear' | 'editar' | 'duplicar'
//   inicial    datos precargados (null al crear). En 'editar' trae el id.
//   onClose    cierra el modal sin guardar
//   onGuardado(plantilla)  se llama con la plantilla que devolvió el backend
//
// "Duplicar" es un alta (POST) con los datos de otra plantilla ya cargados.
// ============================================

import { useState } from 'react';
import api from '../../api/axios';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Input, SelectInput, Textarea } from '../ui/Input';
import { OPCIONES_FUERO } from '../../constants/fueros';
import { OPCIONES_CLASE, OPCIONES_CATEGORIA, OPCIONES_ORIGEN } from '../../constants/plantillas';

// Título del modal según el modo
const TITULOS = {
  crear: 'Nueva plantilla',
  editar: 'Editar plantilla',
  duplicar: 'Duplicar plantilla',
};

// Fuero es OPCIONAL: '' significa "sirve para cualquier fuero" (el backend lo guarda como null)
const SELECT_FUERO = [
  { value: '', label: 'Cualquier fuero' },
  ...OPCIONES_FUERO.filter((o) => o.value !== ''),
];

// Valores por defecto de un formulario en blanco
const FORM_VACIO = {
  titulo: '',
  descripcion: '',
  contenido: '',
  fuero: '',
  clase: 'DE_FONDO',
  categoria: 'DEMANDA',
  origen: 'PROPIA',
};

function PlantillaFormModal({ modo, inicial, onClose, onGuardado }) {
  // Si hay "inicial" (editar/duplicar) se precarga; los null se pasan a '' para los inputs
  const [form, setForm] = useState({
    ...FORM_VACIO,
    ...(inicial && {
      titulo: inicial.titulo,
      descripcion: inicial.descripcion || '',
      contenido: inicial.contenido,
      fuero: inicial.fuero || '',
      clase: inicial.clase,
      categoria: inicial.categoria,
      origen: inicial.origen,
    }),
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Un solo handler para todos los campos: usa el "name" de cada input
  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // ------------------------------------------
  // GUARDAR: PUT si edita, POST si crea o duplica
  // ------------------------------------------
  async function handleSubmit(e) {
    e.preventDefault(); // evita que el form recargue la página
    setGuardando(true);
    setError('');
    try {
      const respuesta =
        modo === 'editar'
          ? await api.put(`/plantillas/${inicial.id}`, form)
          : await api.post('/plantillas', form);
      // El padre cierra el modal y refresca, por eso no hace falta setGuardando(false) acá
      onGuardado(respuesta.data);
    } catch (err) {
      // El backend responde { error: "mensaje" } en los 400/404/500
      setError(err.response?.data?.error || 'No se pudo guardar la plantilla');
      setGuardando(false);
    }
  }

  return (
    <Modal title={TITULOS[modo]} onClose={onClose} size="lg" closeOnOverlay={false}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 px-6 py-5">
          <Input
            label="Título *"
            name="titulo"
            value={form.titulo}
            onChange={handleChange}
            placeholder="Ej: Demanda por alimentos"
            maxLength={200}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <SelectInput
              label="Categoría *"
              name="categoria"
              value={form.categoria}
              onChange={handleChange}
              opciones={OPCIONES_CATEGORIA}
            />
            <SelectInput
              label="Clase *"
              name="clase"
              value={form.clase}
              onChange={handleChange}
              opciones={OPCIONES_CLASE}
            />
            <SelectInput
              label="Fuero"
              name="fuero"
              value={form.fuero}
              onChange={handleChange}
              opciones={SELECT_FUERO}
            />
            <SelectInput
              label="Origen del texto"
              name="origen"
              value={form.origen}
              onChange={handleChange}
              opciones={OPCIONES_ORIGEN}
            />
          </div>

          <Input
            label="Descripción breve"
            name="descripcion"
            value={form.descripcion}
            onChange={handleChange}
            placeholder="Ej: Para uso en mediación civil"
            maxLength={300}
          />

          <div>
            <Textarea
              label="Cuerpo del escrito *"
              name="contenido"
              value={form.contenido}
              onChange={handleChange}
              rows={12}
              placeholder="Pegá o escribí acá el texto completo del escrito..."
              required
            />
            <p className="mt-1 text-xs text-gray-400">
              Podés pegar texto desde Word o desde una IA; se guardan los saltos de línea.
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar plantilla'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}

export default PlantillaFormModal;