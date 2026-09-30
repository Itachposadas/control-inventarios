// src/api/general.js
import { request, toQuery } from "./client";

export const generalApi = {
  buscar: (q) => request(`/buscar${toQuery({ q })}`),
  notificaciones: () => request("/notificaciones"),
};
