// src/config/menus.jsx
// Menús del sidebar por rol. Se definen una sola vez aquí
// para que todas las páginas muestren exactamente lo mismo.
import {
  LayoutDashboard, Car, Users, BarChart3,
  UserCog, HelpCircle,
  Wrench, History, Camera, Truck,
} from "lucide-react";
import { ROLES } from "./roles";

// ─── Admin ───
// El admin no llena solicitudes: consulta el historial desde Vehículos
export const ADMIN_MENU = [
  { label: "Panel de control", to: "/admin", icon: <LayoutDashboard size={18} /> },
  { label: "Vehículos", to: "/admin/vehiculos", icon: <Car size={18} /> },
  { label: "Taller foráneo", to: "/admin/foraneo", icon: <Truck size={18} /> },
  { label: "Usuarios", to: "/admin/usuarios", icon: <Users size={18} /> },
  { label: "Reportes", to: "/admin/reportes", icon: <BarChart3 size={18} /> },
];

export const ADMIN_SECONDARY_MENU = [
  { label: "Mi cuenta", to: "/admin/mi-cuenta", icon: <UserCog size={18} /> },
  { label: "Ayuda", to: "/admin/ayuda", icon: <HelpCircle size={18} /> },
];

// ─── Mecánico ───
export const MECANICO_MENU = [
  { label: "Panel de control", to: "/mecanico", icon: <LayoutDashboard size={18} /> },
  { label: "Vehículos", to: "/mecanico/vehiculos", icon: <Car size={18} /> },
  { label: "Mis reparaciones", to: "/mecanico/reparaciones", icon: <Wrench size={18} /> },
  { label: "Evidencia fotográfica", to: "/mecanico/evidencia", icon: <Camera size={18} /> },
  { label: "Taller foráneo", to: "/mecanico/foraneo", icon: <Truck size={18} /> },
  { label: "Historial", to: "/mecanico/historial", icon: <History size={18} /> },
];

export const MECANICO_SECONDARY_MENU = [
  { label: "Mi cuenta", to: "/mecanico/mi-cuenta", icon: <UserCog size={18} /> },
  { label: "Ayuda", to: "/mecanico/ayuda", icon: <HelpCircle size={18} /> },
];

// Menús según el rol (para páginas que comparten admin y mecánico)
export function menusForRole(role) {
  if (role === ROLES.MECANICO) return { menu: MECANICO_MENU, secondaryMenu: MECANICO_SECONDARY_MENU };
  return { menu: ADMIN_MENU, secondaryMenu: ADMIN_SECONDARY_MENU };
}
