// src/api/reportes.js
import { request, toQuery } from "./client";

export const reportesApi = {
  obtener: ({ desde, hasta, area = "" }) => request(`/reportes${toQuery({ desde, hasta, area })}`),

  // El mismo reporte en Excel (.xlsx), como archivo
  excel: ({ desde, hasta, area = "" }) =>
    request(`/reportes/excel${toQuery({ desde, hasta, area })}`, { blob: true }),
};
