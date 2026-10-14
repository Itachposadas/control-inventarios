// src/api/peticiones.js
// Solicitudes que mandan las áreas desde la página de inicio.
import { request, toQuery } from "./client";

export const peticionesApi = {
  // estado: "pendiente" (por defecto) | "atendida" | "descartada" | "todas"
  listar: ({ estado = "" } = {}) => request(`/peticiones${toQuery({ estado })}`),

  obtener: (id) => request(`/peticiones/${id}`),

  // Solo admin: { idMaterial: precioUnitario }
  capturarPrecios: (id, precios) =>
    request(`/peticiones/${id}/precios`, { method: "PUT", body: { precios } }),

  // Mecánico: firma de recibido (primer paso de "Atender")
  recibir: (id, { mecanico_nombre, mecanico_firma }) =>
    request(`/peticiones/${id}/recibir`, { method: "POST", body: { mecanico_nombre, mecanico_firma } }),

  descartar: (id, motivo) =>
    request(`/peticiones/${id}/descartar`, { method: "POST", body: { motivo } }),
};
