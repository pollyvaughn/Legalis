// ============================================
// EXPEDIENTEDETAILPAGE.JSX
// Muestra el detalle de un expediente puntual, incluyendo sus
// partes procesales (vienen incluidas en el GET por id, ver
// expedientes.service.js del backend). Permite agregar una parte
// nueva y editar una parte existente, ambos con forms inline
// (aparecen en la misma pantalla, sin cambiar de página).
// ============================================

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';

// Roles procesales posibles, según el enum del schema de Prisma.
// Si el enum cambia en el backend, hay que actualizar esta lista.
const ROLES_PROCESALES = ['ACTOR', 'DEMANDADO', 'TERCERO', 'REPRESENTANTE_ESTATAL', 'DEFENSA'];

// Muestra el valor, o un guión si está vacío/null — evita que
// la lista de partes se vea inconsistente entre sí (ver backlog).
function conPlaceholder(valor) {
  return valor && valor.trim() !== '' ? valor : '—';
}

function ExpedienteDetailPage() {
  // useParams lee el :id de la URL (ej: /expedientes/2 → id = "2")
  const { id } = useParams();

  const [expediente, setExpediente] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Estado del form inline para AGREGAR una parte nueva
  const [mostrarFormAgregar, setMostrarFormAgregar] = useState(false);
  const [nombreParte, setNombreParte] = useState('');
  const [documentoParte, setDocumentoParte] = useState('');
  const [rolParte, setRolParte] = useState(ROLES_PROCESALES[0]);
  const [guardandoParte, setGuardandoParte] = useState(false);
  const [errorParte, setErrorParte] = useState('');

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

  // ------------------------------------------
  // Trae el expediente del backend. Está en una función aparte
  // (no solo adentro del useEffect) porque también la volvemos
  // a llamar después de agregar/editar una parte, para refrescar.
  // ------------------------------------------
  async function cargarExpediente() {
    try {
      const respuesta = await api.get(`/expedientes/${id}`);
      setExpediente(respuesta.data);
    } catch (err) {
      setError('No se pudo cargar el expediente');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarExpediente();
  }, [id]);

  // ------------------------------------------
  // handleAgregarParte: envía la nueva parte al backend.
  // ------------------------------------------
  async function handleAgregarParte(evento) {
    evento.preventDefault();
    setErrorParte('');
    setGuardandoParte(true);

    try {
      await api.post(`/expedientes/${id}/partes`, {
        nombre: nombreParte,
        documento: documentoParte || undefined,
        rol: rolParte,
      });

      // Limpia el form y lo cierra
      setNombreParte('');
      setDocumentoParte('');
      setRolParte(ROLES_PROCESALES[0]);
      setMostrarFormAgregar(false);

      // Refresca el expediente para mostrar la parte nueva
      await cargarExpediente();
    } catch (err) {
      const mensaje = err.response?.data?.error || 'No se pudo agregar la parte';
      setErrorParte(mensaje);
    } finally {
      setGuardandoParte(false);
    }
  }

  // ------------------------------------------
  // iniciarEdicion: precarga el form de edición con los datos
  // actuales de la parte clickeada, y lo abre.
  // ------------------------------------------
  function iniciarEdicion(parte) {
    setParteEnEdicionId(parte.id);
    setNombreEdit(parte.nombre);
    setDocumentoEdit(parte.documento || '');
    setRolEdit(parte.rol);
    setRolEspecificoEdit(parte.rolEspecifico || '');
    setErrorEdit('');
  }

  function cancelarEdicion() {
    setParteEnEdicionId(null);
  }

  // ------------------------------------------
  // handleGuardarEdicion: envía el PUT con los cambios de la
  // parte que se está editando actualmente.
  // ------------------------------------------
  async function handleGuardarEdicion(evento) {
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
      await cargarExpediente();
    } catch (err) {
      const mensaje = err.response?.data?.error || 'No se pudo guardar la edición';
      setErrorEdit(mensaje);
    } finally {
      setGuardandoEdit(false);
    }
  }

  if (cargando) {
    return <div className="p-8 text-gray-500 text-sm">Cargando expediente...</div>;
  }

  if (error || !expediente) {
    return <div className="p-8 text-red-600 text-sm">{error || 'Expediente no encontrado'}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <Link to="/expedientes" className="text-sm text-blue-600 hover:underline">
        ← Volver a expedientes
      </Link>

      {/* Datos principales del expediente */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mt-4 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">
              {expediente.numeroExpediente}
            </h1>
            <p className="text-gray-600 mt-1">{expediente.caratula}</p>
          </div>
          <Link
            to={`/expedientes/${id}/editar`}
            className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-200 transition"
          >
            Editar
          </Link>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <dt className="text-gray-400">Cliente</dt>
            <dd className="text-gray-700">{expediente.cliente?.nombreRazonSocial}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Fuero</dt>
            <dd className="text-gray-700">{conPlaceholder(expediente.fuero)}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Juzgado</dt>
            <dd className="text-gray-700">{conPlaceholder(expediente.juzgado)}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Secretaría</dt>
            <dd className="text-gray-700">{conPlaceholder(expediente.secretaria)}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Objeto del juicio</dt>
            <dd className="text-gray-700">{conPlaceholder(expediente.objetoJuicio)}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Unidad fiscal</dt>
            <dd className="text-gray-700">{conPlaceholder(expediente.unidadFiscal)}</dd>
          </div>
        </dl>
      </div>

      {/* Partes procesales */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Partes procesales</h2>
          {!mostrarFormAgregar && (
            <button
              onClick={() => setMostrarFormAgregar(true)}
              className="text-sm bg-gray-800 text-white px-3 py-1.5 rounded-md hover:bg-gray-700 transition"
            >
              + Agregar parte
            </button>
          )}
        </div>

        {/* Lista de partes ya cargadas */}
        {expediente.partes.length === 0 && !mostrarFormAgregar && (
          <p className="text-gray-500 text-sm">Todavía no hay partes cargadas.</p>
        )}

        {expediente.partes.length > 0 && (
          <ul className="divide-y divide-gray-100 mb-4">
            {expediente.partes.map((parte) => (
              <li key={parte.id} className="py-3">
                {/* Si esta parte está en edición, mostramos el form
                    en vez de la fila normal de solo-lectura */}
                {parteEnEdicionId === parte.id ? (
                  <form onSubmit={handleGuardarEdicion} className="space-y-3 bg-gray-50 rounded-md p-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Nombre
                      </label>
                      <input
                        type="text"
                        value={nombreEdit}
                        onChange={(e) => setNombreEdit(e.target.value)}
                        required
                        className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Documento
                      </label>
                      <input
                        type="text"
                        value={documentoEdit}
                        onChange={(e) => setDocumentoEdit(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Rol procesal
                      </label>
                      <select
                        value={rolEdit}
                        onChange={(e) => setRolEdit(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {ROLES_PROCESALES.map((rol) => (
                          <option key={rol} value={rol}>{rol}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Rol específico (ej: Apoderado)
                      </label>
                      <input
                        type="text"
                        value={rolEspecificoEdit}
                        onChange={(e) => setRolEspecificoEdit(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {errorEdit && <p className="text-sm text-red-600">{errorEdit}</p>}

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={guardandoEdit}
                        className="bg-gray-800 text-white text-sm font-medium px-3 py-1.5 rounded-md hover:bg-gray-700 transition disabled:opacity-50"
                      >
                        {guardandoEdit ? 'Guardando...' : 'Guardar cambios'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelarEdicion}
                        className="text-sm text-gray-500 hover:text-gray-800 px-3 py-1.5"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  // Fila normal, de solo lectura, con botón para entrar a edición
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{parte.nombre}</p>
                      <p className="text-xs text-gray-500">
                        {parte.rol} · {conPlaceholder(parte.documento)} · {conPlaceholder(parte.rolEspecifico)}
                      </p>
                    </div>
                    <button
                      onClick={() => iniciarEdicion(parte)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Editar
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Form inline para agregar una parte nueva */}
        {mostrarFormAgregar && (
          <form onSubmit={handleAgregarParte} className="border-t border-gray-100 pt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre
              </label>
              <input
                type="text"
                value={nombreParte}
                onChange={(e) => setNombreParte(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Documento (opcional)
              </label>
              <input
                type="text"
                value={documentoParte}
                onChange={(e) => setDocumentoParte(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rol procesal
              </label>
              <select
                value={rolParte}
                onChange={(e) => setRolParte(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ROLES_PROCESALES.map((rol) => (
                  <option key={rol} value={rol}>{rol}</option>
                ))}
              </select>
            </div>

            {errorParte && <p className="text-sm text-red-600">{errorParte}</p>}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={guardandoParte}
                className="bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-700 transition disabled:opacity-50"
              >
                {guardandoParte ? 'Guardando...' : 'Guardar parte'}
              </button>
              <button
                type="button"
                onClick={() => setMostrarFormAgregar(false)}
                className="text-sm text-gray-500 hover:text-gray-800 px-4 py-2"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ExpedienteDetailPage;