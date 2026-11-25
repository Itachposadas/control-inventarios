// src/api/logos.js
// Logotipos del sistema (Administración › Logotipos).
import { request } from "./client";

export const logosApi = {
  // { clave: { personalizado, version, nombre_archivo, tamano, actualizado_por, actualizado_at } }
  listar: () => request("/logos", { auth: false }),

  cambiar: (clave, archivo) => {
    const form = new FormData();
    form.append("logo", archivo);
    return request(`/logos/${clave}`, { method: "PUT", body: form });
  },

  restaurar: (clave) => request(`/logos/${clave}`, { method: "DELETE" }),
};
