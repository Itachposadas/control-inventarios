// src/config/password.js
// Reglas de contraseñas: las mismas que valida el backend (backend/seguridad.py).
// Se muestran como lista de requisitos mientras se escribe.

export const LONGITUD_MINIMA = 8;

// Contraseñas demasiado comunes aunque cumplan las reglas
const COMUNES = new Set([
  "12345678", "123456789", "1234567890", "password", "password1", "contraseña",
  "contrasena1", "qwerty123", "abc12345", "abcd1234", "atlacomulco", "atlacomulco1",
  "admin123", "admin1234", "usuario1", "parque123", "taller123",
]);

/** Requisitos con su estado: [{ texto, cumple }] */
export function reglasPassword(password = "", usuario = "") {
  const reglas = [
    { texto: `Al menos ${LONGITUD_MINIMA} caracteres`, cumple: password.length >= LONGITUD_MINIMA },
    { texto: "Al menos una letra", cumple: /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(password) },
    { texto: "Al menos un número", cumple: /\d/.test(password) },
  ];
  if (usuario) {
    reglas.push({
      texto: "Que no contenga el nombre de usuario",
      cumple: !!password && !password.toLowerCase().includes(usuario.toLowerCase()),
    });
  }
  return reglas;
}

/** Mensaje de error o null si la contraseña cumple */
export function errorPassword(password = "", usuario = "") {
  const falta = reglasPassword(password, usuario).find((r) => !r.cumple);
  if (falta) return `La contraseña no cumple: ${falta.texto.toLowerCase()}`;
  if (COMUNES.has(password.toLowerCase())) return "Esa contraseña es muy común; elige otra";
  return null;
}
