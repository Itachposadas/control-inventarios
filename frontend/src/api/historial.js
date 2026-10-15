// src/api/historial.js
// Historial de servicios por vehículo (admin y parque vehicular).
// El gasto y los costos solo llegan al admin.
import { request, toQuery } from "./client";

export const historialApi = {
  // { vehiculos: [...], areas: [...] }  orden: "reciente" | "servicios" | "gasto"
  // Con `pagina` agrega { total, pagina, paginas, por_pagina }
  // preventivo: "" | "avisos" | "vencido" | "proximo"
  vehiculos: ({ q = "", area = "", orden = "", preventivo = "", pagina = "" } = {}) =>
    request(`/historial/vehiculos${toQuery({ q, area, orden, preventivo, pagina })}`),

  // Unidades con mantenimiento preventivo vencido o próximo
  // { meses, dias_aviso, vencidos, proximos, avisos: [{ id, nombre, area, estado, proximo, dias, ... }] }
  preventivo: () => request("/historial/preventivo"),

  // { vehiculo, resumen, servicios: [...] }
  vehiculo: (id) => request(`/historial/vehiculos/${id}`),
};
