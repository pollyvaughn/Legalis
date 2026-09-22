// ============================================
// AXIOS.JS
// Instancia central de axios para hablar con el backend.
// Todas las pantallas importan "api" desde acá en vez de usar
// axios directo — así el token se manda automático en cada
// request, sin repetir esa lógica en cada componente.
// ============================================

import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

// ------------------------------------------
// INTERCEPTOR DE REQUEST
// Antes de que cualquier request salga, le agrega el header
// Authorization con el token guardado (si existe).
// ------------------------------------------
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('legalis_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// ------------------------------------------
// INTERCEPTOR DE RESPUESTA
// Mira TODAS las respuestas de error del backend antes de que
// lleguen a cada pantalla, para manejar dos casos globales:
//
//  1. 401 (token vencido, inválido, o usuario desactivado):
//     se cierra la sesión y se manda a /login.
//     EXCEPCIÓN: el propio /auth/login también devuelve 401 cuando
//     las credenciales son incorrectas; ahí NO hay que redirigir,
//     porque la pantalla de login tiene que mostrar el error.
//
//  2. 403 con codigo DEBE_CAMBIAR_PASSWORD: el usuario tiene
//     contraseña temporal y debe cambiarla antes de seguir.
//
// Cualquier otro error se deja pasar tal cual (return Promise.reject)
// para que cada pantalla lo maneje como ya lo hace.
// ------------------------------------------
api.interceptors.response.use(
  (respuesta) => respuesta,
  (error) => {
    const status = error.response?.status;
    const codigo = error.response?.data?.codigo;
    const url = error.config?.url || '';

    // Caso 1: sesión inválida (salvo en el propio login)
    if (status === 401 && !url.includes('/auth/login')) {
      localStorage.removeItem('legalis_token');
      localStorage.removeItem('legalis_usuario');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Caso 2: debe cambiar la contraseña temporal.
    // El chequeo de pathname evita un bucle de redirecciones
    // si ya está en esa pantalla.
    if (status === 403 && codigo === 'DEBE_CAMBIAR_PASSWORD') {
      if (window.location.pathname !== '/cambiar-password') {
        // Actualiza el flag guardado para que el frontend coincida con la DB
        const guardado = localStorage.getItem('legalis_usuario');
        if (guardado) {
          const usuario = JSON.parse(guardado);
          usuario.debeCambiarPassword = true;
          localStorage.setItem('legalis_usuario', JSON.stringify(usuario));
        }
        window.location.href = '/cambiar-password';
      }
    }

    return Promise.reject(error);
  }
);

export default api;