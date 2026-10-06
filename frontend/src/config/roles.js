// src/config/roles.js

export const ROLES = {
  ADMIN: "admin",
  MECANICO: "mecanico",
  AREA: "area", // cuenta de un área: hace y consulta las solicitudes de su área
};

// Ruta inicial a la que entra cada rol al loguearse
export const HOME_BY_ROLE = {
  [ROLES.ADMIN]: "/admin",
  [ROLES.MECANICO]: "/mecanico",
  [ROLES.AREA]: "/area",
};

// Catálogo de vehículos (solo el admin lo tiene)
export const VEHICULOS_BASE = {
  [ROLES.ADMIN]: "/admin/vehiculos",
};

// Nombre legible del rol (para mostrar en la UI)
export const ROLE_LABEL = {
  [ROLES.ADMIN]: "Administrador",
  [ROLES.MECANICO]: "Mecánico",
  [ROLES.AREA]: "Área",
};

// Color del badge por rol (para la UI)
export const ROLE_COLOR = {
  [ROLES.ADMIN]: "bg-institucional",
  [ROLES.MECANICO]: "bg-emerald-700",
  [ROLES.AREA]: "bg-sky-700",
};