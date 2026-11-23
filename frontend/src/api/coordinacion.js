// src/api/coordinacion.js
// Titular de la Coordinación de Parque Vehicular (historial de cambios)
import { request } from "./client";

export const coordinacionApi = {
  titulares: () => request("/coordinacion/titulares"),

  registrar: (payload) => request("/coordinacion/titulares", { method: "POST", body: payload }),

  corregir: (id, payload) => request(`/coordinacion/titulares/${id}`, { method: "PUT", body: payload }),

  deshacer: (id) => request(`/coordinacion/titulares/${id}`, { method: "DELETE" }),
};
