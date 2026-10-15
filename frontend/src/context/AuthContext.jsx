// src/context/AuthContext.jsx
// Sesión del usuario. Además de entrar y salir:
//  - Renueva el token sola mientras la persona sigue trabajando (la sesión dura
//    1 hora desde el último uso, no desde que entró).
//  - Si no hay actividad, avisa 2 minutos antes de cerrar la sesión.
//  - Si el backend pide cambiar la contraseña, lo marca para mandar a esa pantalla.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { authApi } from "../api/auth";
import { AUTH_EXPIRED_EVENT, CAMBIAR_PASSWORD_EVENT, venceToken } from "../api/client";
import { HOME_BY_ROLE, ROLES } from "../config/roles";
import AvisoSesion from "../components/AvisoSesion";

const AuthContext = createContext(null);

const MINUTO = 60 * 1000;
const RENOVAR_ANTES = 15 * MINUTO;  // se renueva si faltan menos de 15 min y hubo actividad
const ACTIVO_HACE = 15 * MINUTO;    // "trabajando" = hubo actividad en los últimos 15 min
const AVISAR_ANTES = 2 * MINUTO;    // si no hay actividad, se avisa 2 min antes de cerrar
const REVISAR_CADA = 20 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aviso, setAviso] = useState(null); // ms (epoch) en que se cerrará la sesión
  const ultimaActividad = useRef(Date.now());
  const renovando = useRef(false);

  useEffect(() => {
    authApi
      .me()
      .then((u) => setUser(u))
      .catch(() => authApi.logout())
      .finally(() => setLoading(false));
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
    setAviso(null);
  }, []);

  // Si cualquier petición responde 401 (token vencido o cuenta desactivada),
  // se cierra la sesión y RoleRoute manda al login.
  useEffect(() => {
    const onExpired = () => logout();
    // El backend exige cambiar la contraseña: RoleRoute manda a esa pantalla
    const onCambiar = () => setUser((u) => (u ? { ...u, debe_cambiar_password: true } : u));
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    window.addEventListener(CAMBIAR_PASSWORD_EVENT, onCambiar);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
      window.removeEventListener(CAMBIAR_PASSWORD_EVENT, onCambiar);
    };
  }, [logout]);

  const renovar = useCallback(async () => {
    if (renovando.current) return;
    renovando.current = true;
    try {
      await authApi.renovar();
      setAviso(null);
    } catch {
      // si ya no se pudo (sesión vencida), el 401 cierra la sesión
    } finally {
      renovando.current = false;
    }
  }, []);

  // Actividad del usuario (teclado, clic, toque, desplazamiento)
  useEffect(() => {
    if (!user) return;
    const marcar = () => {
      ultimaActividad.current = Date.now();
    };
    const eventos = ["mousedown", "keydown", "touchstart", "scroll"];
    eventos.forEach((e) => window.addEventListener(e, marcar, { passive: true }));
    return () => eventos.forEach((e) => window.removeEventListener(e, marcar));
  }, [user]);

  // Revisión periódica del vencimiento del token
  useEffect(() => {
    if (!user) return;
    const revisar = () => {
      const vence = venceToken();
      if (!vence) return;
      const ahora = Date.now();
      const resta = vence - ahora;
      if (resta <= 0) return logout();
      const activo = ahora - ultimaActividad.current < ACTIVO_HACE;
      if (resta < RENOVAR_ANTES && activo && !aviso) return renovar();
      if (resta < AVISAR_ANTES && !activo) setAviso(vence);
    };
    revisar();
    const timer = setInterval(revisar, REVISAR_CADA);
    return () => clearInterval(timer);
  }, [user, aviso, logout, renovar]);

  const login = async (identifier, password) => {
    const { user } = await authApi.login({ identifier, password });
    ultimaActividad.current = Date.now();
    setUser(user);
    return user;
  };

  // Datos de la cuenta actualizados (ej. después de cambiar la contraseña)
  const actualizarUsuario = useCallback((u) => {
    authApi.guardarUsuario(u);
    setUser(u);
  }, []);

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
        actualizarUsuario,
        isAdmin,
        isMecanico,
        homePath,
      }}
    >
      {children}
      {aviso && user && <AvisoSesion vence={aviso} onSeguir={renovar} onSalir={logout} />}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
};
