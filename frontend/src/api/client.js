// src/api/client.js
// Cliente único para hablar con el backend Flask.

// Se puede cambiar con VITE_API_URL en frontend/.env (ej. al subir a un servidor)
export const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:5000/api";

export const TOKEN_KEY = "token";

// Evento que avisa a AuthContext que la sesión expiró o ya no es válida
export const AUTH_EXPIRED_EVENT = "auth:expired";

// Evento que avisa que el backend exige cambiar la contraseña antes de seguir
export const CAMBIAR_PASSWORD_EVENT = "auth:cambiar-password";

/** Milisegundos (epoch) en que vence el token guardado, o null si no hay. */
export function venceToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function apiError(status, data) {
  const err = new Error(data?.msg || "Error inesperado");
  // Compatible con el `err.response.data.msg` que ya usan las pantallas
  err.response = { status, data };
  return err;
}

/**
 * Hace una petición al backend y devuelve el JSON.
 * - Agrega el token automáticamente (salvo `auth: false`).
 * - Si el backend responde 401, dispara AUTH_EXPIRED_EVENT.
 * - Nunca truena si la respuesta no es JSON (ej. error 500 en HTML).
 * - `body` puede ser un objeto (se envía como JSON) o un FormData (archivos).
 * - `blob: true` devuelve el contenido binario (ej. una foto) en lugar de JSON.
 */
export async function request(path, { method = "GET", body, auth = true, blob = false } = {}) {
  const esFormData = body instanceof FormData;
  // Con FormData el navegador pone el Content-Type (multipart) por sí mismo
  const headers = esFormData ? {} : { "Content-Type": "application/json" };
  if (auth) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let r;
  try {
    r = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : esFormData ? body : JSON.stringify(body),
    });
  } catch {
    throw apiError(0, { msg: "No se pudo conectar con el servidor" });
  }

  if (blob && r.ok) return r.blob();

  const text = await r.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!r.ok) {
    if (r.status === 401 && auth) {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    if (r.status === 403 && data?.codigo === "cambiar_password") {
      window.dispatchEvent(new Event(CAMBIAR_PASSWORD_EVENT));
    }
    throw apiError(r.status, data || { msg: `Error del servidor (${r.status})` });
  }

  return data;
}

/** Arma "?a=1&b=2" ignorando valores vacíos. */
export function toQuery(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== "" && v !== null && v !== undefined) qs.set(k, v);
  });
  const s = qs.toString();
  return s ? `?${s}` : "";
}
