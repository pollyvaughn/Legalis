// ============================================
// AUTHCONTEXT.JSX
// "Context" de React: lugar central donde se guarda si hay
// alguien logueado, accesible desde cualquier componente.
// ============================================

import { createContext, useContext, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('legalis_token'));

  const [usuario, setUsuario] = useState(() => {
    const guardado = localStorage.getItem('legalis_usuario');
    return guardado ? JSON.parse(guardado) : null;
  });

  // ------------------------------------------
  // login: guarda token + usuario y DEVUELVE el usuario, para que
  // la pantalla de login pueda decidir a dónde mandarlo (dashboard
  // o cambio de contraseña forzado).
  // ------------------------------------------
  async function login(email, password) {
    const respuesta = await api.post('/auth/login', { email, password });
    const { token: tokenRecibido, usuario: usuarioRecibido } = respuesta.data;

    localStorage.setItem('legalis_token', tokenRecibido);
    localStorage.setItem('legalis_usuario', JSON.stringify(usuarioRecibido));

    setToken(tokenRecibido);
    setUsuario(usuarioRecibido);

    return usuarioRecibido;
  }

  function logout() {
    localStorage.removeItem('legalis_token');
    localStorage.removeItem('legalis_usuario');
    setToken(null);
    setUsuario(null);
  }

  // ------------------------------------------
  // marcarPasswordCambiada: se llama tras un cambio de clave exitoso.
  // Apaga el flag en el estado Y en localStorage, así el usuario
  // sigue usando la app sin tener que volver a loguearse.
  // ------------------------------------------
  function marcarPasswordCambiada() {
    const actualizado = { ...usuario, debeCambiarPassword: false };
    localStorage.setItem('legalis_usuario', JSON.stringify(actualizado));
    setUsuario(actualizado);
  }

  const estaAutenticado = Boolean(token);

  // Atajos de rol para no repetir `usuario?.rol === 'ABOGADO'` por todos lados
  const esAbogado = usuario?.rol === 'ABOGADO';

  return (
    <AuthContext.Provider
      value={{
        token,
        usuario,
        login,
        logout,
        estaAutenticado,
        esAbogado,
        marcarPasswordCambiada,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}