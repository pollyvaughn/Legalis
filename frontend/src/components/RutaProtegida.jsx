// ============================================
// RUTAPROTEGIDA.JSX
// Envuelve las páginas que requieren estar logueado.
//  - Sin token → redirige a /login.
//  - Con contraseña temporal pendiente → redirige a /cambiar-password
//    (no puede ver ninguna otra pantalla hasta cambiarla).
//  - Prop "soloAbogado": si el usuario no es ABOGADO, lo manda a
//    /expedientes. Es una cortesía visual: la protección REAL de los
//    datos está en el backend (requiereRol).
//  - Prop "permitirConPasswordTemporal": solo la pantalla de
//    cambio de contraseña la usa, para no redirigirse a sí misma.
// ============================================

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function RutaProtegida({ children, soloAbogado = false, permitirConPasswordTemporal = false }) {
  const { estaAutenticado, usuario, esAbogado } = useAuth();

  if (!estaAutenticado) {
    return <Navigate to="/login" replace />;
  }

  if (usuario?.debeCambiarPassword && !permitirConPasswordTemporal) {
    return <Navigate to="/cambiar-password" replace />;
  }

  if (soloAbogado && !esAbogado) {
    return <Navigate to="/expedientes" replace />;
  }

  return children;
}

export default RutaProtegida;