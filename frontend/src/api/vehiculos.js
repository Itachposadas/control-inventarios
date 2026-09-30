// src/api/vehiculos.js
import { request, toQuery } from "./client";

export const vehiculosApi = {
  listar: ({ q = "", area = "", estado = "" } = {}) =>
    request(`/vehiculos${toQuery({ q, area, estado })}`),

  obtener: (id) => request(`/vehiculos/${id}`),

  areas: () => request("/vehiculos/areas"),

  historial: (id) => request(`/vehiculos/${id}/historial`),

  crear: (payload) => request("/vehiculos", { method: "POST", body: payload }),

  editar: (id, payload) =>
    request(`/vehiculos/${id}`, { method: "PUT", body: payload }),

  eliminar: (id) => request(`/vehiculos/${id}`, { method: "DELETE" }),
};
