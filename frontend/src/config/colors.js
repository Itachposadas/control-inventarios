// src/config/colors.js
// ─── Paleta del sistema: ÚNICA fuente de los colores ───
// La usan Tailwind (tailwind.config.js → clases como bg-institucional, bg-fondo)
// y el código JavaScript (gráficas, PDF, tarjetas). Para cambiar un tono se
// edita solo aquí.
//
// Contraste revisado con la norma WCAG AA (texto ≥ 4.5:1, íconos ≥ 3:1).

// Guinda institucional (Gobierno). Blanco sobre guinda: 7.6:1 ✓
export const INSTITUCIONAL = {
  DEFAULT: "#9F2241",
  dark: "#7D1A33",   // hover / presionado (blanco encima: 10.2:1 ✓)
  light: "#B83A58",  // degradados y acentos suaves
};

// Fondo general de las pantallas (login y sistema usan el mismo)
export const FONDO = "#F5F7FA";

export const COLORS = {
  institucional: INSTITUCIONAL.DEFAULT,
  institucionalDark: INSTITUCIONAL.dark,
  institucionalSoft: "rgba(159, 34, 65, 0.08)",

  bg: FONDO,
  bgSoft: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",

  textPrimary: "#1E293B",
  textSecondary: "#64748B", // slate-500: 4.8:1 sobre blanco ✓ (slate-400 no pasa)

  // Acentos de íconos e indicadores (≥ 3:1 sobre blanco)
  success: "#16A34A",  // 3.3:1
  warning: "#D97706",  // 3.2:1 (el ámbar #F59E0B anterior: 2.1:1 ✗)
  info: "#2563EB",     // 5.2:1
  error: "#DC2626",    // 4.8:1
};

// Colores de series para gráficas con varias categorías (ej. dona por área).
// Empiezan con el guinda institucional y siguen tonos de una paleta validada:
// distinguibles con daltonismo (ΔE ≥ 9) y con vista normal (ΔE ≥ 22).
// Se asignan en este orden fijo; lo que pase de 6 se agrupa en "Otras".
export const SERIES_GRAFICAS = [
  "#9F2241", // guinda
  "#2A78D6", // azul
  "#EDA100", // amarillo
  "#1BAF7A", // aqua
  "#4A3AA7", // violeta
  "#EB6834", // naranja
];
export const SERIE_OTRAS = "#94A3B8"; // gris neutro para "Otras"

// Colores por estado de solicitud (texto -700 sobre fondo -100: ≥ 4.8:1 ✓)
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
