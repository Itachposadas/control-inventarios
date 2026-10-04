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

// "Datos del vehículo/maquinaria" del formato de ingreso, en el orden del formato.
// Vienen del catálogo (solo lectura).
export const CAMPOS_INGRESO = [
  { key: "area",          label: "Área asignada" },
  { key: "marca",         label: "Marca" },
  { key: "modelo",        label: "Modelo" },
  { key: "color",         label: "Color" },
  { key: "no_inventario", label: "No. de inventario", mono: true },
  { key: "serie",         label: "No. de serie", mono: true },
  { key: "placas",        label: "Placas", mono: true },
];

// "Accesorios y herramientas" del formato de ingreso: cada concepto es SI o NO.
// Las claves de conceptos que ya existían se conservan para no perder lo
// capturado en servicios anteriores (ej. "espejo_interior" = Espejo retrovisor).
export const CHECKLIST_IZQUIERDA = [
  { n: 1,  key: "espejo_derecho",     label: "Espejo lateral derecho" },
  { n: 2,  key: "espejo_izquierdo",   label: "Espejo lateral izquierdo" },
  { n: 3,  key: "espejo_interior",    label: "Espejo retrovisor" },
  { n: 4,  key: "limpiadores",        label: "Limpiadores" },
  { n: 5,  key: "claxon",             label: "Claxon" },
  { n: 6,  key: "viseras",            label: "Viseras" },
  { n: 7,  key: "palanca_velocidades", label: "Palanca de velocidades" },
  { n: 8,  key: "cinturones",         label: "Cinturones de seguridad" },
  { n: 9,  key: "antena",             label: "Antena" },
  { n: 10, key: "radio",              label: "Radio" },
  { n: 11, key: "clima",              label: "Clima" },
  { n: 12, key: "manijas",            label: "Manijas" },
  { n: 13, key: "parabrisas",         label: "Parabrisas" },
  { n: 14, key: "medallon_trasero",   label: "Medallón trasero" },
  { n: 15, key: "cristales_puerta",   label: "Cristales de puerta" },
  { n: 16, key: "encendedor",         label: "Encendedor" },
  { n: 17, key: "faros",              label: "Faros y luces" },
  { n: 18, key: "molduras",           label: "Molduras" },
  { n: 19, key: "calaveras",          label: "Calaveras" },
  { n: 20, key: "defensa_delantera",  label: "Defensa delantera" },
];

export const CHECKLIST_DERECHA = [
  { n: 21, key: "defensa_trasera",    label: "Defensa trasera" },
  { n: 22, key: "parrilla",           label: "Parrilla" },
  { n: 23, key: "llanta_refaccion",   label: "Llantas de refacción" },
  { n: 24, key: "tapones_ruedas",     label: "Tapones de ruedas" },
  { n: 25, key: "tapon_gasolina",     label: "Tapón de gasolina" },
  { n: 26, key: "tapon_radiador",     label: "Tapón de radiador" },
  { n: 27, key: "tapon_aceite",       label: "Tapón de aceite" },
  { n: 28, key: "bayoneta_aceite",    label: "Bayoneta de aceite" },
  { n: 29, key: "llave_cruz",         label: "Llave cruz" },
  { n: 30, key: "gato",               label: "Gato" },
  { n: 31, key: "senalamiento",       label: "Señalamiento" },
  { n: 32, key: "extintor",           label: "Extinguidor" },
  { n: 33, key: "cables_corriente",   label: "Cable para corriente" },
  { n: 34, key: "caja_herramientas",  label: "Caja de herramientas" },
  { n: 35, key: "porta_llantas",      label: "Porta llantas" },
  { n: 36, key: "baston_seguridad",   label: "Bastón de seguridad" },
  { n: 37, key: "placa_delantera",    label: "Placa delantera" },
  { n: 38, key: "placa_trasera",      label: "Placa trasera" },
  { n: 39, key: "llantas",            label: "Llantas" },
  // 40. "Total de número de birlos" es numérico: se guarda aparte (total_birlos)
];

export const CHECKLIST_ITEMS = [...CHECKLIST_IZQUIERDA, ...CHECKLIST_DERECHA];

/** Conceptos que todavía no tienen SI ni NO */
export function conceptosSinMarcar(checklist = {}) {
  return CHECKLIST_ITEMS.filter((i) => typeof checklist[i.key] !== "boolean");
}

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
