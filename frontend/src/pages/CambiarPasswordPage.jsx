// ============================================
// CAMBIARPASSWORDPAGE.JSX
// Pantalla de cambio de contraseña OBLIGATORIO (primer ingreso o
// contraseña reseteada por la abogada). Sin sidebar a propósito:
// el usuario no puede navegar a ningún lado hasta completarla.
// Tiene "Cerrar sesión" por si entró con la cuenta equivocada.
// ============================================

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FormCambiarPassword from '../components/FormCambiarPassword';

function CambiarPasswordPage() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  function handleExito() {
    navigate('/expedientes', { replace: true });
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-semibold text-gray-800 mb-1">Cambiá tu contraseña</h1>
        <p className="text-sm text-gray-500 mb-6">
          Hola {usuario?.nombre}. Ingresaste con una contraseña temporal; por seguridad
          tenés que elegir una nueva antes de continuar.
        </p>

        <FormCambiarPassword onExito={handleExito} />

        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 w-full text-center text-xs text-gray-400 hover:text-gray-700"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

export default CambiarPasswordPage;