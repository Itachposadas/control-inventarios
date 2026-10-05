// src/api/herramientas.js
// Préstamo de herramientas: catálogo y préstamos a mecánicos.
import { request, toQuery } from "./client";

export const herramientasApi = {
  // Catálogo
  listar: () => request("/herramientas"),

  crear: (payload) => request("/herramientas", { method: "POST", body: payload }),

  editar: (id, payload) => request(`/herramientas/${id}`, { method: "PUT", body: payload }),

  eliminar: (id) => request(`/herramientas/${id}`, { method: "DELETE" }),

  // Préstamos: estado "activos" o "devueltos"
  prestamos: ({ estado = "activos" } = {}) =>
    request(`/herramientas/prestamos${toQuery({ estado })}`),

  prestar: (payload) => request("/herramientas/prestamos", { method: "POST", body: payload }),

  // items: [{ id, cantidad }] con lo que regresó; sin items se devuelve todo
  devolver: (id, items) =>
    request(`/herramientas/prestamos/${id}/devolver`, {
      method: "POST",
      body: items ? { items } : {},
    }),
};
