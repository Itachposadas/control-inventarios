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

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CURRENT_KEY);
  },
};
