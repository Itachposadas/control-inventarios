// src/api/area.js
// Cuenta de un área: solo ve los vehículos de su área, envía solicitudes
// y consulta el seguimiento de las suyas.
import { request } from "./client";

export const areaApi = {
  vehiculos: () => request("/area/vehiculos"),

  enviar: (payload) => request("/area/peticiones", { method: "POST", body: payload }),

  peticiones: () => request("/area/peticiones"),
};
