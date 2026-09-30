// src/api/usuarios.js
import { request, toQuery } from "./client";

export const usuariosApi = {
  listar: ({ q = "", role = "", activo = "" } = {}) =>
    request(`/usuarios${toQuery({ q, role, activo })}`),

  obtener: (id) => request(`/usuarios/${id}`),

  crear: (payload) => request("/usuarios", { method: "POST", body: payload }),

  editar: (id, payload) =>
    request(`/usuarios/${id}`, { method: "PUT", body: payload }),

  eliminar: (id) => request(`/usuarios/${id}`, { method: "DELETE" }),
};
