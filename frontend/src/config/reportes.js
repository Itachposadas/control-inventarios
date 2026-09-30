// src/config/reportes.js
// Utilidades compartidas por la página de reportes y el PDF.

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/** "2026-09" → "Sep 2026" */
export function etiquetaMes(aaaamm) {
  const [y, m] = aaaamm.split("-").map(Number);
  return `${MESES[m - 1]} ${y}`;
}

export function moneda(v, decimales = 2) {
  return Number(v || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

/** "2026-09-01" → "01/09/2026" (sin convertir zona horaria) */
export function fechaCorta(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function iso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// Periodos rápidos
export const PERIODOS = [
  { value: "mes", label: "Este mes" },
  { value: "mes_pasado", label: "Mes pasado" },
  { value: "3meses", label: "Últimos 3 meses" },
  { value: "anio", label: "Este año" },
  { value: "personalizado", label: "Personalizado" },
];

export function rangoDePeriodo(periodo, hoy = new Date()) {
  const y = hoy.getFullYear();
  const m = hoy.getMonth();
  switch (periodo) {
    case "mes_pasado":
      return { desde: iso(new Date(y, m - 1, 1)), hasta: iso(new Date(y, m, 0)) };
    case "3meses":
      return { desde: iso(new Date(y, m - 2, 1)), hasta: iso(hoy) };
    case "anio":
      return { desde: iso(new Date(y, 0, 1)), hasta: iso(hoy) };
    case "mes":
    default:
      return { desde: iso(new Date(y, m, 1)), hasta: iso(hoy) };
  }
}
