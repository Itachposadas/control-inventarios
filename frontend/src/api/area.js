// src/api/area.js
// Cuenta de un área: solo ve los vehículos de su área y envía solicitudes.
import { request } from "./client";

export const areaApi = {
  vehiculos: () => request("/area/vehiculos"),

  enviar: (payload) => request("/area/peticiones", { method: "POST", body: payload }),
};
