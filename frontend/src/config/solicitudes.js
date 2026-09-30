// src/config/solicitudes.js
import { ROLES } from "./roles";

// Orden del flujo de una solicitud
export const ESTADOS = [
  { value: "recibida",    label: "Recibida" },
  { value: "diagnostico", label: "Diagnóstico" },
  { value: "reparacion",  label: "Reparación" },
  { value: "completada",  label: "Completada" },
  { value: "entregada",   label: "Entregada" },
];
export const ESTADO_LABEL = Object.fromEntries(ESTADOS.map((e) => [e.value, e.label]));

export const TIPOS = [
  { value: "correctivo", label: "Correctivo" },
  { value: "preventivo", label: "Preventivo" },
  { value: "emergencia", label: "Emergencia" },
];
export const TIPO_LABEL = Object.fromEntries(TIPOS.map((t) => [t.value, t.label]));

export const PRIORIDADES = [
  { value: "alta",  label: "Alta" },
  { value: "media", label: "Media" },
  { value: "baja",  label: "Baja" },
];
export const PRIORIDAD_LABEL = Object.fromEntries(PRIORIDADES.map((p) => [p.value, p.label]));

// Datos del vehículo que muestra el formato de ingreso (vienen del catálogo, solo lectura)
export const CAMPOS_INGRESO = [
  { key: "unidad",        label: "Vehículo / Maquinaria" },
  { key: "marca",         label: "Marca" },
  { key: "modelo",        label: "Modelo" },
  { key: "placas",        label: "Placas", mono: true },
  { key: "color",         label: "Color" },
  { key: "area",          label: "Área" },
  { key: "serie",         label: "No. de Serie", mono: true },
  { key: "no_inventario", label: "No. Inventario", mono: true },
];

// Accesorios del formato de ingreso (palomita = sí llegó).
// Para agregar o quitar conceptos basta con editar esta lista.
export const CHECKLIST = [
  {
    grupo: "Exterior",
    items: [
      { key: "espejo_derecho",    label: "Espejo derecho" },
      { key: "espejo_izquierdo",  label: "Espejo izquierdo" },
      { key: "limpiadores",       label: "Limpiadores" },
      { key: "defensa_delantera", label: "Defensa delantera" },
      { key: "defensa_trasera",   label: "Defensa trasera" },
      { key: "faros",             label: "Faros" },
      { key: "calaveras",         label: "Calaveras" },
      { key: "direccionales",     label: "Direccionales" },
      { key: "parabrisas",        label: "Parabrisas" },
      { key: "antena",            label: "Antena" },
      { key: "tapon_gasolina",    label: "Tapón de gasolina" },
      { key: "emblemas",          label: "Emblemas" },
      { key: "placas",            label: "Placas" },
    ],
  },
  {
    grupo: "Interior",
    items: [
      { key: "claxon",            label: "Claxon" },
      { key: "radio",             label: "Radio / estéreo" },
      { key: "espejo_interior",   label: "Espejo retrovisor interior" },
      { key: "tapetes",           label: "Tapetes" },
      { key: "cinturones",        label: "Cinturones de seguridad" },
      { key: "encendedor",        label: "Encendedor" },
    ],
  },
];

// Ruta base del módulo según el rol
export const SOLICITUDES_BASE = {
  [ROLES.ADMIN]: "/admin/solicitudes",
  [ROLES.MECANICO]: "/mecanico/reparaciones",
};

export function formatFecha(iso, conHora = false) {
  if (!iso) return "—";
  // El backend guarda en UTC sin zona; se agrega "Z" para convertir a hora local
  const d = new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
  return d.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(conHora ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function formatMoneda(valor) {
  if (valor === null || valor === undefined) return "—";
  return Number(valor).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}
