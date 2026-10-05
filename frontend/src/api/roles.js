// src/api/roles.js
import { request } from "./client";

export const rolesApi = {
  listar: () => request("/roles"),

  crear: (payload) => request("/roles", { method: "POST", body: payload }),
};
