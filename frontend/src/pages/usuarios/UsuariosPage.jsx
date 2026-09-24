// ============================================
// USUARIOSPAGE.JSX — Gestión de cuentas (solo ABOGADO)
// Lista los usuarios y permite crear asistentes (con contraseña
// temporal), editarlos, activarlos/desactivarlos y resetear su
// contraseña. La contraseña temporal se muestra UNA sola vez.
// Mismo estilo que ClientesListPage: TablaContainer + Modal.
// Las acciones de fila (desactivar/reactivar y resetear clave)
// pasan por un modal de confirmación, igual que el resto de la app.
// ============================================

import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import TablaContainer from '../../components/ui/TablaContainer';

// ------------------------------------------
// UsuarioFormModal: alta (usuario = null) o edición (usuario = objeto).
// Al guardar llama a onGuardado(respuesta.data): en el alta la respuesta
// trae { usuario, passwordTemporal }; en la edición, el usuario editado.
// ------------------------------------------
function UsuarioFormModal({ usuario, onClose, onGuardado }) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    nombre: usuario?.nombre || '',
    email: usuario?.email || '',
  });

  function handleChange(evento) {
    const { name, value } = evento.target;
    setForm((anterior) => ({ ...anterior, [name]: value }));
  }

  async function handleSubmit(evento) {
    evento.preventDefault();
    setError('');
    setGuardando(true);

    try {
      const respuesta = usuario
        ? await api.put(`/usuarios/${usuario.id}`, form)
        : await api.post('/usuarios', form);
      onGuardado(respuesta.data);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar el usuario');
      setGuardando(false);
    }
  }

  return (
    <Modal title={usuario ? 'Editar usuario' : 'Nuevo asistente'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 px-6 py-5">
          <Input label="Nombre" name="nombre" value={form.nombre} onChange={handleChange} required />
          <Input label="Email" type="email" name="email" value={form.email} onChange={handleChange} required />

          {!usuario && (
            <p className="text-xs text-gray-500">
              Al crear la cuenta se genera una contraseña temporal que verás una sola vez.
            </p>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? 'Guardando...' : usuario ? 'Guardar cambios' : 'Crear asistente'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}

// ------------------------------------------
// CredencialModal: muestra la contraseña temporal recién generada.
// closeOnOverlay=false: un clic afuera NO lo cierra, así no se pierde
// por accidente (no se puede volver a consultar).
// ------------------------------------------
function CredencialModal({ credencial, onClose }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(credencial.password);
      setCopiado(true);
    } catch {
      setCopiado(false); // si el navegador bloquea el portapapeles, la copia a mano
    }
  }

  return (
    <Modal title="Contraseña temporal" onClose={onClose} closeOnOverlay={false}>
      <div className="space-y-4 px-6 py-5">
        <p className="text-sm text-gray-600">
          Cuenta de <span className="font-medium text-gray-900">{credencial.nombre}</span> ({credencial.email}).
          Anotala o copiala ahora: por seguridad no se vuelve a mostrar. Deberá cambiarla en su primer ingreso.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-center font-mono text-base tracking-wider text-gray-900">
            {credencial.password}
          </code>
          <Button variant="secondary" onClick={copiar}>
            {copiado ? '¡Copiada!' : 'Copiar'}
          </Button>
        </div>
      </div>
      <Modal.Footer>
        <Button onClick={onClose}>Entendido</Button>
      </Modal.Footer>
    </Modal>
  );
}

// ------------------------------------------
// Página principal
// ------------------------------------------
function UsuariosPage() {
  const { usuario: yo } = useAuth();

  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // Modales: formulario (false = cerrado, null = alta, objeto = edición)
  const [formAbierto, setFormAbierto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [credencial, setCredencial] = useState(null);

  // Confirmación de acciones de fila: null o { tipo: 'estado' | 'reset', usuario }
  const [accion, setAccion] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [errorAccion, setErrorAccion] = useState('');

  // GET /api/usuarios
  async function cargarUsuarios() {
    try {
      const respuesta = await api.get('/usuarios');
      setUsuarios(respuesta.data);
    } catch (err) {
      setError('No se pudieron cargar los usuarios');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarUsuarios();
  }, []);

  function abrirForm(usuario = null) {
    setUsuarioEditando(usuario);
    setFormAbierto(true);
  }

  // Tras guardar: si fue un alta (la respuesta trae passwordTemporal),
  // muestra la credencial; en cualquier caso cierra el form y refresca.
  function alGuardar(datos) {
    setFormAbierto(false);
    if (datos.passwordTemporal) {
      setCredencial({
        nombre: datos.usuario.nombre,
        email: datos.usuario.email,
        password: datos.passwordTemporal,
      });
    }
    cargarUsuarios();
  }

  // Abre el modal de confirmación para una acción sobre un usuario
  function abrirAccion(tipo, usuario) {
    setErrorAccion('');
    setAccion({ tipo, usuario });
  }

  // Ejecuta la acción confirmada. Si el backend la rechaza (ej: "No podés
  // desactivar tu propia cuenta"), el error se muestra dentro del modal.
  async function confirmarAccion() {
    const { tipo, usuario: u } = accion;
    setProcesando(true);
    setErrorAccion('');
    try {
      if (tipo === 'estado') {
        // PATCH /api/usuarios/:id/estado
        await api.patch(`/usuarios/${u.id}/estado`, { activo: !u.activo });
      } else {
        // POST /api/usuarios/:id/resetear-password → devuelve la nueva clave temporal
        const respuesta = await api.post(`/usuarios/${u.id}/resetear-password`);
        setCredencial({ nombre: u.nombre, email: u.email, password: respuesta.data.passwordTemporal });
      }
      setAccion(null);
      cargarUsuarios();
    } catch (err) {
      setErrorAccion(err.response?.data?.error || 'No se pudo completar la acción');
    } finally {
      setProcesando(false);
    }
  }

  // Búsqueda local por nombre o email (son pocos usuarios: no hace falta backend)
  const texto = busqueda.trim().toLowerCase();
  const filtrados = usuarios.filter(
    (u) => u.nombre.toLowerCase().includes(texto) || u.email.toLowerCase().includes(texto)
  );

  return (
    <div>
      {/* --- Encabezado --- */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Gestión de usuarios</h1>
        <Button onClick={() => abrirForm()}>+ Nuevo asistente</Button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <TablaContainer
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        placeholder="Buscar nombre o email..."
        cantidad={filtrados.length}
        unidad="usuario"
      >
        {cargando ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">Cargando usuarios...</p>
        ) : filtrados.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">No hay usuarios que coincidan.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs font-medium text-gray-500">
                <th className="px-5 py-3">Nombre</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Rol</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((u) => (
                <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {u.nombre}
                    {u.id === yo?.id && <span className="ml-2 text-xs font-normal text-gray-400">(tú)</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{u.email}</td>
                  <td className="px-5 py-3 text-gray-600">{u.rol === 'ABOGADO' ? 'Abogada' : 'Asistente'}</td>
                  <td className="px-5 py-3 space-x-1">
                    <Badge tone={u.activo ? 'green' : 'gray'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge>
                    {u.activo && u.debeCambiarPassword && <Badge tone="yellow">Clave temporal</Badge>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {/* La cuenta de la abogada no se gestiona acá: su clave se cambia en "Mi perfil" */}
                    {u.rol !== 'ABOGADO' && (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => abrirForm(u)}>Editar</Button>
                        <Button variant="ghost" size="sm" onClick={() => abrirAccion('reset', u)}>
                          Resetear clave
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => abrirAccion('estado', u)}>
                          {u.activo ? 'Desactivar' : 'Reactivar'}
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TablaContainer>

      {/* --- Modal de alta / edición --- */}
      {formAbierto && (
        <UsuarioFormModal usuario={usuarioEditando} onClose={() => setFormAbierto(false)} onGuardado={alGuardar} />
      )}

      {/* --- Modal con la contraseña temporal (una sola vez) --- */}
      {credencial && <CredencialModal credencial={credencial} onClose={() => setCredencial(null)} />}

      {/* --- Confirmación de desactivar/reactivar y resetear clave --- */}
      {accion && (
        <Modal
          title={
            accion.tipo === 'reset'
              ? 'Resetear contraseña'
              : accion.usuario.activo
                ? 'Desactivar cuenta'
                : 'Reactivar cuenta'
          }
          onClose={() => setAccion(null)}
        >
          <div className="px-6 py-5">
            <p className="text-sm text-gray-700">
              {accion.tipo === 'reset' ? (
                <>
                  Se generará una contraseña temporal nueva para <strong>{accion.usuario.nombre}</strong>. La
                  actual dejará de funcionar.
                </>
              ) : accion.usuario.activo ? (
                <>
                  ¿Desactivar la cuenta de <strong>{accion.usuario.nombre}</strong>? No podrá ingresar al
                  sistema, pero se conserva su historial.
                </>
              ) : (
                <>
                  ¿Reactivar la cuenta de <strong>{accion.usuario.nombre}</strong>? Podrá volver a ingresar.
                </>
              )}
            </p>
            {errorAccion && <p className="mt-3 text-sm text-red-600">{errorAccion}</p>}
          </div>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setAccion(null)}>
              Cancelar
            </Button>
            <Button
              variant={accion.tipo === 'estado' && accion.usuario.activo ? 'danger' : 'primary'}
              onClick={confirmarAccion}
              disabled={procesando}
            >
              {procesando
                ? 'Procesando...'
                : accion.tipo === 'reset'
                  ? 'Resetear'
                  : accion.usuario.activo
                    ? 'Desactivar'
                    : 'Reactivar'}
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}

export default UsuariosPage;