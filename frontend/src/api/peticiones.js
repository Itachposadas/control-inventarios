// src/api/peticiones.js
// Solicitudes que mandan las áreas desde la página de inicio.
import { request, toQuery } from "./client";

export const peticionesApi = {
  // estado: "pendiente" (por defecto) | "atendida" | "descartada" | "todas"
  listar: ({ estado = "" } = {}) => request(`/peticiones${toQuery({ estado })}`),

  obtener: (id) => request(`/peticiones/${id}`),

  descartar: (id, motivo) =>
    request(`/peticiones/${id}/descartar`, { method: "POST", body: { motivo } }),
};
