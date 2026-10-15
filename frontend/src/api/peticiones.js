// src/api/peticiones.js
// Solicitudes que mandan las áreas desde la página de inicio.
import { request, toQuery } from "./client";

export const peticionesApi = {
  // estado: "pendiente" (por defecto) | "atendida" | "descartada" | "todas"
  listar: ({ estado = "" } = {}) => request(`/peticiones${toQuery({ estado })}`),

  // Página de la bandeja con búsqueda y filtros:
  // { items, total, pagina, paginas, por_pagina, conteo: {todas, alta, media, baja} | null, areas }
  pagina: ({ estado = "", pagina = 1, q = "", area = "", prioridad = "", orden = "" } = {}) =>
    request(`/peticiones${toQuery({ estado, pagina, q, area, prioridad, orden })}`),

  obtener: (id) => request(`/peticiones/${id}`),

  // Mecánico: firma de recibido (primer paso de "Atender")
  recibir: (id, { mecanico_nombre, mecanico_firma }) =>
    request(`/peticiones/${id}/recibir`, { method: "POST", body: { mecanico_nombre, mecanico_firma } }),

  descartar: (id, motivo) =>
    request(`/peticiones/${id}/descartar`, { method: "POST", body: { motivo } }),
};
