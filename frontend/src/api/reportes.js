// src/api/reportes.js
import { request, toQuery } from "./client";

export const reportesApi = {
  obtener: ({ desde, hasta, area = "" }) => request(`/reportes${toQuery({ desde, hasta, area })}`),
};
