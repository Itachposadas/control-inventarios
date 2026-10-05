// src/api/foraneas.js
// Órdenes de reparación en taller foráneo.
import { request, toQuery } from "./client";

export const foraneasApi = {
  // entregadas: true → solo las de vehículos ya entregados (historial)
  listar: ({ q = "", solicitud_id = "", entregadas = false } = {}) =>
    request(`/foraneas${toQuery({ q, solicitud_id, entregadas: entregadas ? "1" : "" })}`),

  obtener: (id) => request(`/foraneas/${id}`),

  // Se genera a partir de un ingreso a taller (solicitud)
  crear: (solicitudId, payload) =>
    request(`/solicitudes/${solicitudId}/foraneas`, { method: "POST", body: payload }),

  editar: (id, payload) => request(`/foraneas/${id}`, { method: "PUT", body: payload }),

  eliminar: (id) => request(`/foraneas/${id}`, { method: "DELETE" }),
};
