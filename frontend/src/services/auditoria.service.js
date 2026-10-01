// ============================================================
// AUDITORIA.SERVICE.JS (frontend)
// Llamadas HTTP al módulo de auditoría, usando la instancia de
// axios ya configurada (maneja token y errores globales).
// ============================================================
import api from '../api/axios.js';

// Lista paginada con filtros opcionales
export async function listarAuditoria(filtros = {}) {
  const { data } = await api.get('/auditoria', { params: filtros });
  return data; // { datos, total, pagina, limite, totalPaginas }
}

// Lista de entidades distintas, para el <select> de filtro
export async function listarEntidadesAuditoria() {
  const { data } = await api.get('/auditoria/entidades');
  return data; // ej: ["Cliente", "Expediente", "ParteProcesal", ...]
}