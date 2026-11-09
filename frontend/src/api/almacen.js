// src/api/almacen.js
// Almacén (control de refacciones): materiales, existencias y movimientos.
import { request, toQuery } from "./client";

export const almacenApi = {
  // Catálogo con existencias (todos=1 incluye los dados de baja)
  materiales: ({ todos } = {}) => request(`/almacen/materiales${toQuery({ todos: todos ? 1 : "" })}`),

  crear: (payload) => request("/almacen/materiales", { method: "POST", body: payload }),

  editar: (id, payload) => request(`/almacen/materiales/${id}`, { method: "PUT", body: payload }),

  // Llegó material: { material_id, cantidad, nota }
  entrada: (payload) => request("/almacen/entradas", { method: "POST", body: payload }),

  // Conteo físico: { material_id, existencia_real, nota }
  ajuste: (payload) => request("/almacen/ajustes", { method: "POST", body: payload }),

  // { material_id, tipo, pagina }
  movimientos: (params = {}) => request(`/almacen/movimientos${toQuery({ pagina: 1, ...params })}`),

  // Material usado en un servicio / lo que sobró regresa al almacén
  usar: (solicitudId, payload) =>
    request(`/almacen/servicios/${solicitudId}/salidas`, { method: "POST", body: payload }),

  devolver: (solicitudId, payload) =>
    request(`/almacen/servicios/${solicitudId}/devoluciones`, { method: "POST", body: payload }),
};

// Aviso para una cantidad escrita: vacía, que no es número o menor a lo permitido (null si está bien)
export const avisoCantidad = (valor, { vacio = "Rellena este campo con la cantidad", cero = false } = {}) => {
  const texto = String(valor ?? "").trim();
  if (!texto) return vacio;
  const n = Number(texto.replace(",", "."));
  if (Number.isNaN(n)) return "Escribe solo números (ej. 4 o 2.5)";
  if (n < 0 || (n === 0 && !cero)) return cero ? "No puede ser negativa" : "Escribe una cantidad mayor a 0";
  return null;
};

// 4 → "4"; 2.5 → "2.5" (sin ceros de más)
export const cantidadTexto = (n) => Number(n).toLocaleString("es-MX", { maximumFractionDigits: 2 });
