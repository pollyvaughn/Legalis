// ============================================
// AXIOS.JS
// Instancia central de axios para hablar con el backend.
// Todas las pantallas importan "api" desde acá en vez de usar
// axios directo — así el token se manda automático en cada
// request, sin repetir esa lógica en cada componente.
// ============================================

import axios from 'axios';

// baseURL: la raíz de tu API backend. Ajustar el puerto si tu
// backend corre en otro (revisar server.js / .env del backend).
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

// ------------------------------------------
// INTERCEPTOR DE REQUEST
// Antes de que cualquier request salga, le agrega el header
// Authorization con el token guardado (si existe).
// Esto reemplaza el "auto-save token script" que usabas en Postman.
// ------------------------------------------
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('legalis_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;