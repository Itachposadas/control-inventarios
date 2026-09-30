// src/api/client.js
// Cliente único para hablar con el backend Flask.

// Se puede cambiar con VITE_API_URL en frontend/.env (ej. al subir a un servidor)
export const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:5000/api";

export const TOKEN_KEY = "token";

// Evento que avisa a AuthContext que la sesión expiró o ya no es válida
export const AUTH_EXPIRED_EVENT = "auth:expired";

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
 */
export async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let r;
  try {
    r = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw apiError(0, { msg: "No se pudo conectar con el servidor" });
  }

  const text = await r.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!r.ok) {
    if (r.status === 401 && auth) {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
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
