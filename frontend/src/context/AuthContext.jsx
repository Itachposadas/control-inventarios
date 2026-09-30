// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { authApi } from "../api/auth";
import { AUTH_EXPIRED_EVENT } from "../api/client";
import { HOME_BY_ROLE, ROLES } from "../config/roles";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi
      .me()
      .then((u) => setUser(u))
      .catch(() => authApi.logout())
      .finally(() => setLoading(false));
  }, []);

  // Si cualquier petición responde 401 (token vencido o cuenta desactivada),
  // se cierra la sesión y RoleRoute manda al login.
  useEffect(() => {
    const onExpired = () => {
      authApi.logout();
      setUser(null);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const login = async (identifier, password) => {
    const { user } = await authApi.login({ identifier, password });
    setUser(user);
    return user;
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  // ─── Derivados del rol ───
  const role = user?.role || null;
  const isAdmin = role === ROLES.ADMIN;
  const isMecanico = role === ROLES.MECANICO;
  const homePath = role ? HOME_BY_ROLE[role] : "/login";

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        login,
        logout,
        isAdmin,
        isMecanico,
        homePath,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
};