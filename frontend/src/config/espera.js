// src/config/espera.js
// Vigencia de las solicitudes de las áreas (los mismos números que backend/vigencia.py).
// Desde que el área envía su solicitud tiene un plazo para llevar la unidad al taller:
//   - Vigente:    menos de DIAS_VIGENTE días
//   - Por vencer: de DIAS_VIGENTE a DIAS_LIMITE días (aviso en amarillo)
//   - Vencida:    DIAS_LIMITE días o más → se cancela sola con el motivo
// La usan la bandeja de Solicitudes, el panel de control y el seguimiento del área.
export const DIAS_VIGENTE = 8;
export const DIAS_LIMITE = 12;

const DIA = 86400000;

export const PLAZOS = [
  {
    valor: "vigente", label: "Vigente", rango: `menos de ${DIAS_VIGENTE} días`,
    chip: "bg-emerald-100 text-emerald-800", punto: "bg-emerald-500", texto: "text-emerald-700",
  },
  {
    valor: "por_vencer", label: "Por vencer", rango: `${DIAS_VIGENTE}–${DIAS_LIMITE} días`,
    chip: "bg-amber-100 text-amber-900", punto: "bg-amber-500", texto: "text-amber-900",
  },
];

// Las fechas del servidor vienen en UTC sin zona
export const aFecha = (iso) => new Date(iso.endsWith("Z") ? iso : `${iso}Z`);

export const diasEsperando = (iso) => Math.floor((Date.now() - aFecha(iso)) / DIA);

// Fecha límite para llevar la unidad
export const fechaLimite = (iso) => new Date(aFecha(iso).getTime() + DIAS_LIMITE * DIA);

export const fechaCorta = (fecha) =>
  fecha.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });

/** Plazo de una solicitud pendiente: { ...PLAZOS[i], vence, diasRestantes } */
export function plazoDe(iso) {
  const vence = fechaLimite(iso);
  const restante = vence.getTime() - Date.now();
  const dias = diasEsperando(iso);
  const base = dias >= DIAS_VIGENTE ? PLAZOS[1] : PLAZOS[0];
  return { ...base, vence, diasRestantes: Math.max(0, Math.ceil(restante / DIA)) };
}

// "Vence hoy", "Vence mañana", "Vence en 5 días"
export function textoVence(iso) {
  const { diasRestantes } = plazoDe(iso);
  if (diasRestantes <= 0) return "Vence hoy";
  if (diasRestantes === 1) return "Vence mañana";
  return `Vence en ${diasRestantes} días`;
}

export function tiempoEsperando(iso) {
  const horas = Math.floor((Date.now() - aFecha(iso)) / 3600000);
  if (horas < 1) return "Hace menos de 1 hora";
  if (horas < 24) return `Esperando ${horas} ${horas === 1 ? "hora" : "horas"}`;
  const dias = Math.floor(horas / 24);
  return `Esperando ${dias} ${dias === 1 ? "día" : "días"}`;
}
