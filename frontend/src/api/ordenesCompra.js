// src/api/ordenesCompra.js
// Órdenes de compra: el mecánico las manda desde su servicio
// (solicitudesApi.enviarOrdenCompra) y administración las atiende.
import { request, toQuery } from "./client";

export const ordenesCompraApi = {
  // estado: "enviada" (por atender, por defecto) | "atendida" | "todas"
  listar: ({ estado = "" } = {}) => request(`/ordenes-compra${toQuery({ estado })}`),

  obtener: (id) => request(`/ordenes-compra/${id}`),

  // Nombre y firma de quien autorizó la última orden (se proponen en la siguiente)
  ultimaAutorizacion: () => request("/ordenes-compra/ultima-autorizacion"),

  // Administración: { proveedor: {nombre, direccion, telefono}, precios: {idRefaccion: precio},
  //                   iva_porcentaje, adicionales }
  // Al atender también: { autoriza_nombre, autoriza_firma }
  guardar: (id, payload) => request(`/ordenes-compra/${id}`, { method: "PUT", body: payload }),
  atender: (id, payload) => request(`/ordenes-compra/${id}/atender`, { method: "POST", body: payload }),
};

export const ESTADO_ORDEN = {
  enviada: { texto: "Por atender", tono: "ambar" },
  atendida: { texto: "Atendida", tono: "verde" },
};
