// src/config/roles.js

export const ROLES = {
  ADMIN: "admin",
  MECANICO: "mecanico",
};

// Ruta inicial a la que entra cada rol al loguearse
export const HOME_BY_ROLE = {
  [ROLES.ADMIN]: "/admin",
  [ROLES.MECANICO]: "/mecanico",
};

// Catálogo de vehículos según el rol (admin lo administra, mecánico lo consulta)
export const VEHICULOS_BASE = {
  [ROLES.ADMIN]: "/admin/vehiculos",
  [ROLES.MECANICO]: "/mecanico/vehiculos",
};

// Nombre legible del rol (para mostrar en la UI)
export const ROLE_LABEL = {
  [ROLES.ADMIN]: "Administrador",
  [ROLES.MECANICO]: "Mecánico",
};

// Color del badge por rol (para la UI)
export const ROLE_COLOR = {
  [ROLES.ADMIN]: "bg-institucional",
  [ROLES.MECANICO]: "bg-emerald-700",
};