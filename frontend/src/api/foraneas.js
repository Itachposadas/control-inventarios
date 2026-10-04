// src/api/foraneas.js
// Órdenes de reparación en taller foráneo.
import { request, toQuery } from "./client";

export const foraneasApi = {
  listar: ({ q = "", solicitud_id = "" } = {}) => request(`/foraneas${toQuery({ q, solicitud_id })}`),

  obtener: (id) => request(`/foraneas/${id}`),

  // Se genera a partir de un ingreso a taller (solicitud)
  crear: (solicitudId, payload) =>
    request(`/solicitudes/${solicitudId}/foraneas`, { method: "POST", body: payload }),

  editar: (id, payload) => request(`/foraneas/${id}`, { method: "PUT", body: payload }),

  eliminar: (id) => request(`/foraneas/${id}`, { method: "DELETE" }),
};
