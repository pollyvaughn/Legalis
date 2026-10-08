import { useState } from 'react';
import api from '../../api/axios';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { Input, SelectInput } from '../ui/Input';
import { useAuth } from '../../context/AuthContext';
import useScrollHighlight from '../../hooks/useScrollHighlight';

// Muestra el valor, o un guión si está vacío/null — evita que
// la lista de partes se vea inconsistente entre sí (ver backlog).
function conPlaceholder(valor) {
    return valor && valor.trim() !== '' ? valor : '—';
}

// Roles procesales posibles, según el enum del schema de Prisma.
// Si el enum cambia en el backend, hay que actualizar esta lista.
const ROLES_PROCESALES = [
    'ACTOR', 
    'DEMANDADO', 
    'TERCERO', 
    'REPRESENTANTE_ESTATAL', 
    'DEFENSA'
];
const OPCIONES_ROLES = ROLES_PROCESALES.map((rol) => ({ 
    value: rol, 
    label: rol 
}));

export default function PartesSeccion({
    expedienteId,
    partes,
    onRefresh,
  }) {

    const { esAbogado } = useAuth();
    // Estado del form inline para AGREGAR una parte nueva
    const [mostrarFormAgregar, setMostrarFormAgregar] = useState(false);
    const [nombreParte, setNombreParte] = useState('');
    const [documentoParte, setDocumentoParte] = useState('');
    const [rolParte, setRolParte] = useState(ROLES_PROCESALES[0]);
    const [guardandoParte, setGuardandoParte] = useState(false);
    const [errorParte, setErrorParte] = useState('');
    const [rolEspecificoParte, setRolEspecificoParte] = useState('');

    // Estado del form inline para EDITAR una parte existente.
    // parteEnEdicionId guarda el id de la parte que se está editando
    // (null = ninguna). Los demás campos son los valores del form.
    const [parteEnEdicionId, setParteEnEdicionId] = useState(null);
    const [nombreEdit, setNombreEdit] = useState('');
    const [documentoEdit, setDocumentoEdit] = useState('');
    const [rolEdit, setRolEdit] = useState(ROLES_PROCESALES[0]);
    const [rolEspecificoEdit, setRolEspecificoEdit] = useState('');
    const [guardandoEdit, setGuardandoEdit] = useState(false);
    const [errorEdit, setErrorEdit] = useState('');

    const altaParteFocus = useScrollHighlight(mostrarFormAgregar, 'alta-parte');

    const edicionParteFocus = useScrollHighlight(
        parteEnEdicionId !== null,
        parteEnEdicionId
    );

    // Estado del modal de confirmación para ELIMINAR una parte.
    // parteAEliminar guarda la parte completa (null = modal cerrado)
    // para poder mostrar su nombre en el mensaje de confirmación.
    const [parteAEliminar, setParteAEliminar] = useState(null);
    const [eliminandoParte, setEliminandoParte] = useState(false);
    const [errorEliminar, setErrorEliminar] = useState('');

    // ------------------------------------------
    // handleAgregarParte: envía la nueva parte al backend.
    // ------------------------------------------
    async function handleAgregarParte(evento) {
        evento.preventDefault();
        setErrorParte('');
        setGuardandoParte(true);

    try {
        await api.post(`/expedientes/${expedienteId}/partes`, {
            nombre: nombreParte,
            documento: documentoParte || undefined,
            rol: rolParte,
            rolEspecifico: rolEspecificoParte || undefined,
        });

      // Limpia el form y lo cierra
      setNombreParte('');
      setDocumentoParte('');
      setRolParte(ROLES_PROCESALES[0]);
      setRolEspecificoParte('');
      setMostrarFormAgregar(false);

      // Refresca el expediente para mostrar la parte nueva
      await onRefresh();
    } catch (err) {
      const mensaje = err.response?.data?.error || 'No se pudo agregar la parte';
      setErrorParte(mensaje);
    } finally {
      setGuardandoParte(false);
    }
  }

  // ------------------------------------------
  // iniciarEdicionParte: precarga el form de edición con los datos
  // actuales de la parte clickeada, y lo abre.
  // ------------------------------------------
  function iniciarEdicionParte(parte) {
    setParteEnEdicionId(parte.id);
    setNombreEdit(parte.nombre);
    setDocumentoEdit(parte.documento || '');
    setRolEdit(parte.rol);
    setRolEspecificoEdit(parte.rolEspecifico || '');
    setErrorEdit('');
  }

  function cancelarEdicionParte() {
    setParteEnEdicionId(null);
  }

  // ------------------------------------------
  // handleGuardarEdicionParte: envía el PUT con los cambios de la
  // parte que se está editando actualmente.
  // ------------------------------------------
  async function handleGuardarEdicionParte(evento) {
    evento.preventDefault();
    setErrorEdit('');
    setGuardandoEdit(true);

    try {
      await api.put(`/partes/${parteEnEdicionId}`, {
        nombre: nombreEdit,
        documento: documentoEdit || null,
        rol: rolEdit,
        rolEspecifico: rolEspecificoEdit || null,
      });

      setParteEnEdicionId(null);
      await onRefresh();
    } catch (err) {
      const mensaje = err.response?.data?.error || 'No se pudo guardar la edición';
      setErrorEdit(mensaje);
    } finally {
      setGuardandoEdit(false);
    }
  }

  // ------------------------------------------
  // handleEliminarParte: borra la parte confirmada en el modal.
  // Es un borrado real (no se puede deshacer), por eso pasa
  // siempre por confirmación previa.
  // ------------------------------------------
  async function handleEliminarParte() {
    setErrorEliminar('');
    setEliminandoParte(true);

    try {
      await api.delete(`/partes/${parteAEliminar.id}`);
      setParteAEliminar(null);
      await onRefresh(); // refresca la lista sin la parte borrada
    } catch (err) {
      const mensaje = err.response?.data?.error || 'No se pudo eliminar la parte';
      setErrorEliminar(mensaje);
    } finally {
      setEliminandoParte(false);
    }
  }
   
  return (
    <>
      {/* --- Partes procesales (edición inline por fila, independiente de arriba) --- */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Partes procesales</h2>
          {esAbogado && !mostrarFormAgregar && (
              <Button size="sm" onClick={() => setMostrarFormAgregar(true)}>
              + Agregar parte
              </Button>
          )}
        </div>

        {/* Lista de partes ya cargadas */}
        {partes.length === 0 && !mostrarFormAgregar && (
          <p className="text-sm text-gray-500">Todavía no hay partes cargadas.</p>
        )}

        {partes.length > 0 && (
          <ul className="mb-4 divide-y divide-gray-100">
              {partes.map((parte) => (
              <li key={parte.id} className="py-3 first:pt-0">
                  {parteEnEdicionId === parte.id ? (
                  <form
                      ref={edicionParteFocus}
                      onSubmit={handleGuardarEdicionParte}
                      className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4"
                  >
                      <Input
                      label="Nombre"
                      value={nombreEdit}
                      onChange={(e) => setNombreEdit(e.target.value)}
                      required
                      />

                      <Input
                      label="Documento"
                      value={documentoEdit}
                      onChange={(e) => setDocumentoEdit(e.target.value)}
                      />

                      <SelectInput
                      label="Rol procesal"
                      value={rolEdit}
                      onChange={(e) => setRolEdit(e.target.value)}
                      opciones={OPCIONES_ROLES}
                      />

                      <Input
                      label="Rol específico"
                      value={rolEspecificoEdit}
                      onChange={(e) => setRolEspecificoEdit(e.target.value)}
                      placeholder="Ej: Imputado, Apoderado"
                      />

                      {errorEdit && <p className="text-sm text-red-600">{errorEdit}</p>}

                      <div className="flex justify-end gap-2">
                      <Button type="button" variant="secondary" size="sm" onClick={cancelarEdicionParte}>
                          Cancelar
                      </Button>
                      <Button type="submit" size="sm" disabled={guardandoEdit}>
                          {guardandoEdit ? 'Guardando...' : 'Guardar cambios'}
                      </Button>
                      </div>
                  </form>
                  ) : (
                  <div className="flex items-center justify-between">
                      <div>
                      <p className="text-sm font-medium text-gray-900">{parte.nombre}</p>
                      <p className="mt-0.5 text-xs text-gray-500">
                          {parte.rol} · {conPlaceholder(parte.documento)} · {conPlaceholder(parte.rolEspecifico)}
                      </p>
                      </div>
                      {esAbogado && (
                      <div className="flex shrink-0 items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => iniciarEdicionParte(parte)}>
                          Editar
                          </Button>
                          <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => {
                              setErrorEliminar('');
                              setParteAEliminar(parte);
                          }}
                          >
                          Eliminar
                          </Button>
                      </div>
                      )}
                  </div>
                  )}
              </li>
              ))}
          </ul>
        )}

        {/* Form inline para agregar una parte nueva */}
        {mostrarFormAgregar && (
          <form
              ref={altaParteFocus}
              onSubmit={handleAgregarParte}
              className="mt-4 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4"
          >
              <p className="text-xs text-gray-500">
              * Campo obligatorio
              </p>
              <Input
              label="Nombre *"
              value={nombreParte}
              onChange={(e) => setNombreParte(e.target.value)}
              required
              />

              <Input
              label="Documento (opcional)"
              value={documentoParte}
              onChange={(e) => setDocumentoParte(e.target.value)}
              />

              <SelectInput
              label="Rol procesal"
              value={rolParte}
              onChange={(e) => setRolParte(e.target.value)}
              opciones={OPCIONES_ROLES}
              />

              <Input
              label="Rol específico (opcional)"
              value={rolEspecificoParte}
              onChange={(e) => setRolEspecificoParte(e.target.value)}
              placeholder="Ej: Imputado, Apoderado"
              />

              {errorParte && <p className="text-sm text-red-600">{errorParte}</p>}

              <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setMostrarFormAgregar(false)}>
                  Cancelar
              </Button>
              <Button type="submit" disabled={guardandoParte}>
                  {guardandoParte ? 'Guardando...' : 'Agregar'}
              </Button>
              </div>
          </form>
        )}
      </div>

      {/* --- Modal de confirmación para ELIMINAR una parte (borrado real) --- */}
      {parteAEliminar && (
        <Modal title="Eliminar parte procesal" onClose={() => setParteAEliminar(null)}>
          <div className="px-6 py-5">
            <p className="text-sm text-gray-700">
                ¿Seguro que querés eliminar a <strong>{parteAEliminar.nombre}</strong> de este
                expediente? Esta acción no se puede deshacer.
            </p>
            {errorEliminar && <p className="mt-3 text-sm text-red-600">{errorEliminar}</p>}
          </div>
          <Modal.Footer>
            <Button
                variant="secondary"
                onClick={() => setParteAEliminar(null)}
                disabled={eliminandoParte}
            >
                Cancelar
            </Button>
            <Button variant="danger" onClick={handleEliminarParte} disabled={eliminandoParte}>
                {eliminandoParte ? 'Eliminando...' : 'Sí, eliminar'}
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </>
  );
}