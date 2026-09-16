// ============================================
// LOGINPAGE.JSX
// Pantalla de login. No hay "registro": las cuentas ya existen
// (creadas por seed o, más adelante, por la abogada desde el
// sistema). Esta pantalla solo permite ENTRAR con una cuenta
// existente.
// ============================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // ------------------------------------------
  // handleSubmit: se ejecuta al enviar el formulario.
  // preventDefault() evita que el navegador recargue la página
  // (comportamiento por defecto de cualquier <form>).
  // ------------------------------------------
  async function handleSubmit(evento) {
    evento.preventDefault();
    setError('');
    setCargando(true);

    try {
      await login(email, password);
      // Login exitoso: redirige a la lista de expedientes
      navigate('/expedientes');
    } catch (err) {
      // El backend devuelve { error: "mensaje" } con status 401
      // si el email o la contraseña son incorrectos.
      const mensaje = err.response?.data?.error || 'No se pudo iniciar sesión';
      setError(mensaje);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-semibold text-gray-800 mb-1">Legalis</h1>
        <p className="text-sm text-gray-500 mb-6">Ingresá con tu cuenta</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Mensaje de error, solo aparece si algo falló */}
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-gray-800 text-white text-sm font-medium py-2 rounded-md hover:bg-gray-700 transition disabled:opacity-50"
          >
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;