// src/config/espera.js
// Prioridad de una solicitud de área según los días que lleva esperando.
// La usan la bandeja de Solicitudes y el panel de control.
export const PRIORIDADES_ESPERA = [
  { valor: "alta", label: "Alta", desde: 3, chip: "bg-red-100 text-red-700", borde: "border-l-red-500", punto: "bg-red-500" },
  { valor: "media", label: "Media", desde: 1, chip: "bg-amber-100 text-amber-900", borde: "border-l-amber-500", punto: "bg-amber-500" },
  { valor: "baja", label: "Reciente", desde: 0, chip: "bg-slate-100 text-slate-600", borde: "border-l-slate-200", punto: "bg-slate-300" },
];

// Las fechas del servidor vienen en UTC sin zona
export const aFecha = (iso) => new Date(iso.endsWith("Z") ? iso : `${iso}Z`);

export const diasEsperando = (iso) => Math.floor((Date.now() - aFecha(iso)) / 86400000);

export const prioridadPorEspera = (iso) => {
  const dias = diasEsperando(iso);
  return PRIORIDADES_ESPERA.find((x) => dias >= x.desde);
};

export function tiempoEsperando(iso) {
  const horas = Math.floor((Date.now() - aFecha(iso)) / 3600000);
  if (horas < 1) return "Hace menos de 1 hora";
  if (horas < 24) return `Esperando ${horas} ${horas === 1 ? "hora" : "horas"}`;
  const dias = Math.floor(horas / 24);
  return `Esperando ${dias} ${dias === 1 ? "día" : "días"}`;
}
