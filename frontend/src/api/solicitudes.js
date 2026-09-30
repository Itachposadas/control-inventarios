// src/api/solicitudes.js
import { request, toQuery } from "./client";

export const solicitudesApi = {
  listar: ({ q = "", estado = "", prioridad = "", mecanico_id = "", vehiculo_id = "" } = {}) =>
    request(`/solicitudes${toQuery({ q, estado, prioridad, mecanico_id, vehiculo_id })}`),

  obtener: (id) => request(`/solicitudes/${id}`),

  crear: (payload) => request("/solicitudes", { method: "POST", body: payload }),

  editar: (id, payload) =>
    request(`/solicitudes/${id}`, { method: "PUT", body: payload }),

  cambiarEstado: (id, estado, nota = "") =>
    request(`/solicitudes/${id}/estado`, { method: "POST", body: { estado, nota } }),

  eliminar: (id) => request(`/solicitudes/${id}`, { method: "DELETE" }),

  // ─── Evidencia fotográfica (tipo: "llegada" | "reparacion" | "final") ───
  subirFoto: (id, tipo, archivo) => {
    const form = new FormData();
    form.append("foto", archivo, archivo.name || `${tipo}.jpg`);
    return request(`/solicitudes/${id}/fotos/${tipo}`, { method: "POST", body: form });
  },

  verFoto: (id, tipo) => request(`/solicitudes/${id}/fotos/${tipo}`, { blob: true }),

  quitarFoto: (id, tipo) => request(`/solicitudes/${id}/fotos/${tipo}`, { method: "DELETE" }),
};
