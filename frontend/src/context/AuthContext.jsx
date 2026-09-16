// ============================================
// AUTHCONTEXT.JSX
// "Context" de React: un lugar central donde se guarda si hay
// alguien logueado o no, accesible desde cualquier componente
// sin tener que pasar props manualmente de padre a hijo.
// ============================================

import { createContext, useContext, useState } from 'react';
import api from '../api/axios';

// El Context en sí — un "canal" vacío que se llena con el Provider de abajo
const AuthContext = createContext(null);

// ------------------------------------------
// AuthProvider
// Envuelve toda la app (se usa una vez en main.jsx o App.jsx).
// Cualquier componente adentro puede leer el usuario logueado
// o llamar a login()/logout() usando el hook useAuth() de abajo.
// ------------------------------------------
export function AuthProvider({ children }) {
  // Al cargar la página, revisa si ya había un token guardado
  // de una sesión anterior (para no perder el login al refrescar)
  const [token, setToken] = useState(() => localStorage.getItem('legalis_token'));

  // Igual que el token: recupera los datos del usuario guardados
  // como JSON en localStorage, si existen.
  const [usuario, setUsuario] = useState(() => {
    const guardado = localStorage.getItem('legalis_usuario');
    return guardado ? JSON.parse(guardado) : null;
  });

  // ------------------------------------------
  // login: llama a POST /api/auth/login, y si sale bien,
  // guarda token + usuario tanto en localStorage (persiste al
  // refrescar) como en el estado de React (para que la UI reaccione)
  // ------------------------------------------
  async function login(email, password) {
    const respuesta = await api.post('/auth/login', { email, password });
    const { token: tokenRecibido, usuario: usuarioRecibido } = respuesta.data;

    localStorage.setItem('legalis_token', tokenRecibido);
    localStorage.setItem('legalis_usuario', JSON.stringify(usuarioRecibido));

    setToken(tokenRecibido);
    setUsuario(usuarioRecibido);
  }

  // ------------------------------------------
  // logout: borra token y usuario de todos lados
  // ------------------------------------------
  function logout() {
    localStorage.removeItem('legalis_token');
    localStorage.removeItem('legalis_usuario');
    setToken(null);
    setUsuario(null);
  }

  // estaAutenticado: true si hay un token guardado
  const estaAutenticado = Boolean(token);

  return (
    <AuthContext.Provider value={{ token, usuario, login, logout, estaAutenticado }}>
      {children}
    </AuthContext.Provider>
  );
}

// ------------------------------------------
// useAuth: hook para usar el contexto fácilmente.
// En vez de importar useContext + AuthContext en cada archivo,
// cualquier componente hace: const { login, estaAutenticado } = useAuth();
// ------------------------------------------
export function useAuth() {
  return useContext(AuthContext);
}