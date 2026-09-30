// src/config/colors.js
export const COLORS = {
  institucional: "#9F2241",
  institucionalDark: "#7D1A33",
  institucionalSoft: "rgba(159, 34, 65, 0.08)",

  bg: "#F5F7FA",
  bgSoft: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",

  textPrimary: "#1E293B",
  textSecondary: "#64748B",

  success: "#16A34A",
  warning: "#F59E0B",
  info: "#2563EB",
  error: "#DC2626",
};

// Colores por estado de solicitud
export const ESTADO_STYLES = {
  recibida: "bg-slate-100 text-slate-700",
  diagnostico: "bg-amber-100 text-amber-700",
  reparacion: "bg-blue-100 text-blue-700",
  completada: "bg-emerald-100 text-emerald-700",
  entregada: "bg-emerald-100 text-emerald-700",
};

// Colores por prioridad
export const PRIORIDAD_STYLES = {
  alta: { dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50" },
  media: { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" },
  baja: { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
};