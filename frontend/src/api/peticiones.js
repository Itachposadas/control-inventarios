// src/api/peticiones.js
// Solicitudes que mandan las áreas desde la página de inicio.
import { request, toQuery } from "./client";

export const peticionesApi = {
  // estado: "pendiente" (por defecto) | "atendida" | "descartada" | "vencida" | "todas"
  listar: ({ estado = "" } = {}) => request(`/peticiones${toQuery({ estado })}`),

  // Página de la bandeja con búsqueda y filtros:
  // { items, total, pagina, paginas, por_pagina, conteo: {todas, vigente, por_vencer} | null, areas }
  // En "vencida" responde también vencidas: {en_bandeja, archivadas}; archivadas=1 lista las ya limpiadas
  pagina: ({ estado = "", pagina = 1, q = "", area = "", plazo = "", orden = "", archivadas = "" } = {}) =>
    request(`/peticiones${toQuery({ estado, pagina, q, area, plazo, orden, archivadas })}`),

  // "Limpiar vencidas" (admin y Coordinación): las quita de la bandeja sin borrarlas → { archivadas }
  archivarVencidas: () => request("/peticiones/vencidas/archivar", { method: "POST", body: {} }),

  // Rezago: por vencer y áreas que más dejan vencer sus solicitudes (admin y Coordinación)
  rezago: () => request("/peticiones/rezago"),

  obtener: (id) => request(`/peticiones/${id}`),

  // Mecánico: "Atender" (recibe la unidad y abre su servicio)
  recibir: (id) => request(`/peticiones/${id}/recibir`, { method: "POST", body: {} }),

  descartar: (id, motivo) =>
    request(`/peticiones/${id}/descartar`, { method: "POST", body: { motivo } }),
};
