// src/api/solicitudes.js
import { request, toQuery } from "./client";

export const solicitudesApi = {
  listar: ({ q = "", estado = "", prioridad = "", mecanico_id = "", vehiculo_id = "" } = {}) =>
    request(`/solicitudes${toQuery({ q, estado, prioridad, mecanico_id, vehiculo_id })}`),

  obtener: (id) => request(`/solicitudes/${id}`),

  // ─── Pasos del mecánico (cada uno avanza el servicio) ───
  // { fallas, acciones_a_realizar, refacciones: [{cantidad, unidad_medida, concepto}] }
  diagnostico: (id, payload) => request(`/solicitudes/${id}/diagnostico`, { method: "POST", body: payload }),
  // { hoja_no, hoja_total, checklist, observaciones_ingreso }
  ingreso: (id, payload) => request(`/solicitudes/${id}/ingreso`, { method: "POST", body: payload }),
  // { hoja_no, hoja_total, mecanico_nombre, mecanico_firma }
  enviarOrdenCompra: (id, payload) => request(`/solicitudes/${id}/orden-compra`, { method: "POST", body: payload }),
  // { acciones (trabajo realizado), observaciones } → queda entregado
  entrega: (id, payload) => request(`/solicitudes/${id}/entrega`, { method: "POST", body: payload }),

  editar: (id, payload) =>
    request(`/solicitudes/${id}`, { method: "PUT", body: payload }),

  // Solo admin: regresar al paso anterior para corregir
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
