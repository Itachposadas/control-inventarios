// src/api/auth.js
import { request, TOKEN_KEY } from "./client";

const CURRENT_KEY = "current_user";

export const authApi = {
  async login({ identifier, password }) {
    // auth: false → un 401 aquí es "credenciales inválidas", no sesión expirada
    const data = await request("/auth/login", {
      method: "POST",
      body: { identifier, password },
      auth: false,
    });
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(CURRENT_KEY, JSON.stringify(data.user));
    return data;
  },

  async me() {
    if (!localStorage.getItem(TOKEN_KEY)) {
      const err = new Error("Sin sesión");
      err.response = { status: 401 };
      throw err;
    }
    const data = await request("/auth/me");
    localStorage.setItem(CURRENT_KEY, JSON.stringify(data));
    return data;
  },

  // Responde { msg, user } con la cuenta ya sin contraseña temporal
  cambiarPassword: (actual, nueva) =>
    request("/auth/password", { method: "PUT", body: { actual, nueva } }),

  // Token nuevo para seguir con la sesión abierta
  async renovar() {
    const data = await request("/auth/renovar", { method: "POST" });
    localStorage.setItem(TOKEN_KEY, data.access_token);
    return data.access_token;
  },

  guardarUsuario(user) {
    localStorage.setItem(CURRENT_KEY, JSON.stringify(user));
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CURRENT_KEY);
  },
};
