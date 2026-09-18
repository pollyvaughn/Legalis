// ============================================
// EXPEDIENTEDETAILPAGE.JSX
// Muestra el detalle de un expediente puntual, incluyendo sus
// partes procesales (vienen incluidas en el GET por id, ver
// expedientes.service.js del backend). El botón "Editar" alterna
// la card principal a un form inline (mismo patrón que
// ClienteDetailPage — no navega a una página separada).
// La edición de partes procesales es independiente: cada parte
// se edita inline por fila, sin relación con el form de arriba.
// ============================================

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
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

  // Estado del form inline para EDITAR el expediente (datos principales)
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');

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
  // a llamar después de editar el expediente o agregar/editar
  // una parte, para refrescar.
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
  // iniciarEdicion: precarga el form con los datos actuales
  // del expediente (datos principales, no partes procesales).
  // ------------------------------------------
  function iniciarEdicion() {
    setForm({
      numeroExpediente: expediente.numeroExpediente,
      caratula: expediente.caratula,
      fuero: expediente.fuero || '',
      jurisdiccion: expediente.jurisdiccion || '',
      juzgado: expediente.juzgado || '',
      secretaria: expediente.secretaria || '',
      objetoJuicio: expediente.objetoJuicio || '',
      montoJuicio: expediente.montoJuicio ?? '',
      unidadFiscal: expediente.unidadFiscal || '',
    });
    setErrorForm('');
    setEditando(true);
  }

  function handleChange(evento) {
    const { name, value } = evento.target;
    setForm((formAnterior) => ({ ...formAnterior, [name]: value }));
  }

  async function handleGuardar(evento) {
    evento.preventDefault();
    setErrorForm('');
    setGuardando(true);

    try {
      await api.put(`/expedientes/${id}`, {
        ...form,
        montoJuicio: form.montoJuicio === '' ? null : form.montoJuicio,
      });

      setEditando(false);
      await cargarExpediente();
    } catch (err) {
      const mensaje = err.response?.data?.error || 'No se pudo guardar el expediente';
      setErrorForm(mensaje);
    } finally {
      setGuardando(false);
    }
  }

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
      await cargarExpediente();
    } catch (err) {
      const mensaje = err.response?.data?.error || 'No se pudo guardar la edición';
      setErrorEdit(mensaje);
    } finally {
      setGuardandoEdit(false);
    }
  }

  if (cargando) {
    return <p className="text-sm text-gray-500">Cargando expediente...</p>;
  }

  if (error || !expediente) {
    return <p className="text-sm text-red-600">{error || 'Expediente no encontrado'}</p>;
  }

  return (
    <div>
      <Link
        to="/expedientes"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft size={16} strokeWidth={1.75} />
        Volver a expedientes
      </Link>

      {/* --- Card principal: datos del expediente --- */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {expediente.numeroExpediente}
            </h1>
            <p className="mt-1 text-sm text-gray-500">{expediente.caratula}</p>
          </div>
          {!editando && (
            <button
              onClick={iniciarEdicion}
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Editar
            </button>
          )}
        </div>

        {!editando ? (
          // ------------------------------------------
          // VISTA DE SOLO LECTURA
          // ------------------------------------------
          <dl className="grid grid-cols-2 gap-x-8 gap-y-4 border-t border-gray-100 pt-5 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase text-gray-400">Cliente</dt>
              <dd className="mt-1 text-gray-800">{expediente.cliente?.nombreRazonSocial}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-400">Fuero</dt>
              <dd className="mt-1 text-gray-800">{conPlaceholder(expediente.fuero)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-400">Juzgado</dt>
              <dd className="mt-1 text-gray-800">{conPlaceholder(expediente.juzgado)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-400">Secretaría</dt>
              <dd className="mt-1 text-gray-800">{conPlaceholder(expediente.secretaria)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-400">Objeto del juicio</dt>
              <dd className="mt-1 text-gray-800">{conPlaceholder(expediente.objetoJuicio)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-400">Unidad fiscal</dt>
              <dd className="mt-1 text-gray-800">{conPlaceholder(expediente.unidadFiscal)}</dd>
            </div>
          </dl>
        ) : (
          // ------------------------------------------
          // FORM DE EDICIÓN
          // El cliente NUNCA se muestra como campo editable acá
          // (misma decisión que en ClienteDetailPage: cambiar de
          // dueño requiere un flujo explícito, no un campo suelto).
          // ------------------------------------------
          <form onSubmit={handleGuardar} className="space-y-4 border-t border-gray-100 pt-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                N° Expediente
              </label>
              <input
                type="text"
                name="numeroExpediente"
                value={form.numeroExpediente}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Carátula</label>
              <input
                type="text"
                name="caratula"
                value={form.caratula}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Fuero</label>
                <input
                  type="text"
                  name="fuero"
                  value={form.fuero}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Jurisdicción
                </label>
                <input
                  type="text"
                  name="jurisdiccion"
                  value={form.jurisdiccion}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Juzgado</label>
                <input
                  type="text"
                  name="juzgado"
                  value={form.juzgado}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Secretaría
                </label>
                <input
                  type="text"
                  name="secretaria"
                  value={form.secretaria}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Objeto del juicio
              </label>
              <input
                type="text"
                name="objetoJuicio"
                value={form.objetoJuicio}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Monto del juicio
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  name="montoJuicio"
                  value={form.montoJuicio}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Unidad fiscal
                </label>
                <input
                  type="text"
                  name="unidadFiscal"
                  value={form.unidadFiscal}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none"
                />
              </div>
            </div>

            {errorForm && <p className="text-sm text-red-600">{errorForm}</p>}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={guardando}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button
                type="button"
                onClick={() => setEditando(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>

      {/* --- Partes procesales (edición inline por fila, independiente de arriba) --- */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Partes procesales</h2>
          {!mostrarFormAgregar && (
            <button
              onClick={() => setMostrarFormAgregar(true)}
              className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              + Agregar parte
            </button>
          )}
        </div>

        {/* Lista de partes ya cargadas */}
        {expediente.partes.length === 0 && !mostrarFormAgregar && (
          <p className="text-sm text-gray-500">Todavía no hay partes cargadas.</p>
        )}

        {expediente.partes.length > 0 && (
          <ul className="mb-4 divide-y divide-gray-100">
            {expediente.partes.map((parte) => (
              <li key={parte.id} className="py-3 first:pt-0">
                {/* Si esta parte está en edición, mostramos el form
                    en vez de la fila normal de solo-lectura */}
                {parteEnEdicionId === parte.id ? (
                  <form
                    onSubmit={handleGuardarEdicionParte}
                    className="space-y-3 rounded-lg bg-gray-50 p-4"
                  >
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        Nombre
                      </label>
                      <input
                        type="text"
                        value={nombreEdit}
                        onChange={(e) => setNombreEdit(e.target.value)}
                        required
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-gray-300 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        Documento
                      </label>
                      <input
                        type="text"
                        value={documentoEdit}
                        onChange={(e) => setDocumentoEdit(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-gray-300 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        Rol procesal
                      </label>
                      <select
                        value={rolEdit}
                        onChange={(e) => setRolEdit(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-gray-300 focus:outline-none"
                      >
                        {ROLES_PROCESALES.map((rol) => (
                          <option key={rol} value={rol}>{rol}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        Rol específico (ej: Apoderado)
                      </label>
                      <input
                        type="text"
                        value={rolEspecificoEdit}
                        onChange={(e) => setRolEspecificoEdit(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-gray-300 focus:outline-none"
                      />
                    </div>

                    {errorEdit && <p className="text-sm text-red-600">{errorEdit}</p>}

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={guardandoEdit}
                        className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                      >
                        {guardandoEdit ? 'Guardando...' : 'Guardar cambios'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelarEdicionParte}
                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  // Fila normal, de solo lectura, con botón para entrar a edición
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{parte.nombre}</p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {parte.rol} · {conPlaceholder(parte.documento)} · {conPlaceholder(parte.rolEspecifico)}
                      </p>
                    </div>
                    <button
                      onClick={() => iniciarEdicionParte(parte)}
                      className="text-sm font-medium text-gray-600 hover:text-gray-900"
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
          <form onSubmit={handleAgregarParte} className="space-y-3 border-t border-gray-100 pt-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nombre</label>
              <input
                type="text"
                value={nombreParte}
                onChange={(e) => setNombreParte(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Documento (opcional)
              </label>
              <input
                type="text"
                value={documentoParte}
                onChange={(e) => setDocumentoParte(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Rol procesal
              </label>
              <select
                value={rolParte}
                onChange={(e) => setRolParte(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none"
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
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {guardandoParte ? 'Guardando...' : 'Guardar parte'}
              </button>
              <button
                type="button"
                onClick={() => setMostrarFormAgregar(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
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