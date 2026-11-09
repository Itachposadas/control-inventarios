// src/api/peticiones.js
// Solicitudes que mandan las áreas desde la página de inicio.
import { request, toQuery } from "./client";

export const peticionesApi = {
  // estado: "pendiente" (por defecto) | "atendida" | "descartada" | "vencida" | "todas"
  listar: ({ estado = "" } = {}) => request(`/peticiones${toQuery({ estado })}`),

  // Página de la bandeja con búsqueda y filtros:
  // { items, total, pagina, paginas, por_pagina, conteo: {todas, vigente, por_vencer} | null, areas }
  pagina: ({ estado = "", pagina = 1, q = "", area = "", plazo = "", orden = "" } = {}) =>
    request(`/peticiones${toQuery({ estado, pagina, q, area, plazo, orden })}`),

  obtener: (id) => request(`/peticiones/${id}`),

  // Mecánico: "Atender" (recibe la unidad y abre su servicio)
  recibir: (id) => request(`/peticiones/${id}/recibir`, { method: "POST", body: {} }),

  descartar: (id, motivo) =>
    request(`/peticiones/${id}/descartar`, { method: "POST", body: { motivo } }),
};
