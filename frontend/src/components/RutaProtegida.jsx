// ============================================
// RUTAPROTEGIDA.JSX
// Envuelve las páginas que requieren estar logueado.
// Si no hay token, redirige a /login en vez de mostrar la página.
// ============================================

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function RutaProtegida({ children }) {
  const { estaAutenticado } = useAuth();

  if (!estaAutenticado) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default RutaProtegida;