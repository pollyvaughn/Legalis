// ============================================
// FORMCAMBIARPASSWORD.JSX
// Formulario de cambio de contraseña propia. Lo usan dos pantallas:
//  - CambiarPasswordPage (cambio forzado tras contraseña temporal)
//  - PerfilPage (cambio voluntario)
// Recibe "onExito" para que cada pantalla decida qué hacer
// después de un cambio correcto (redirigir, mostrar mensaje, etc.)
// ============================================

import { useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

// Debe coincidir con PASSWORD_MIN_LENGTH del backend (auth.service.js)
const PASSWORD_MIN_LENGTH = 8;

function FormCambiarPassword({ onExito }) {
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const { marcarPasswordCambiada } = useAuth();

  async function handleSubmit(evento) {
    evento.preventDefault();
    setError('');

    // Validaciones en el navegador (respuesta instantánea).
    // El backend valida de nuevo: esto es solo comodidad.
    if (passwordNueva.length < PASSWORD_MIN_LENGTH) {
      setError(`La contraseña nueva debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`);
      return;
    }
    if (passwordNueva !== confirmacion) {
      setError('La confirmación no coincide con la contraseña nueva');
      return;
    }

    setCargando(true);
    try {
      await api.put('/auth/cambiar-password', { passwordActual, passwordNueva });

      // Apaga el flag en el estado y en localStorage
      marcarPasswordCambiada();

      // Limpia los campos por seguridad
      setPasswordActual('');
      setPasswordNueva('');
      setConfirmacion('');

      onExito?.();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo cambiar la contraseña');
    } finally {
      setCargando(false);
    }
  }

  const claseInput =
    'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Contraseña actual
        </label>
        <input
          type="password"
          value={passwordActual}
          onChange={(e) => setPasswordActual(e.target.value)}
          required
          autoComplete="current-password"
          className={claseInput}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Contraseña nueva
        </label>
        <input
          type="password"
          value={passwordNueva}
          onChange={(e) => setPasswordNueva(e.target.value)}
          required
          autoComplete="new-password"
          className={claseInput}
        />
        <p className="text-xs text-gray-500 mt-1">Mínimo {PASSWORD_MIN_LENGTH} caracteres.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Repetir contraseña nueva
        </label>
        <input
          type="password"
          value={confirmacion}
          onChange={(e) => setConfirmacion(e.target.value)}
          required
          autoComplete="new-password"
          className={claseInput}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={cargando}
        className="w-full bg-gray-800 text-white text-sm font-medium py-2 rounded-md hover:bg-gray-700 transition disabled:opacity-50"
      >
        {cargando ? 'Guardando...' : 'Cambiar contraseña'}
      </button>
    </form>
  );
}

export default FormCambiarPassword;