// src/api/historial.js
// Historial de servicios por vehículo (admin y parque vehicular).
// El gasto y los costos solo llegan al admin.
import { request, toQuery } from "./client";

export const historialApi = {
  // { vehiculos: [...], areas: [...] }  orden: "reciente" | "servicios" | "gasto"
  vehiculos: ({ q = "", area = "", orden = "" } = {}) =>
    request(`/historial/vehiculos${toQuery({ q, area, orden })}`),

  // { vehiculo, resumen, servicios: [...] }
  vehiculo: (id) => request(`/historial/vehiculos/${id}`),
};
