// src/pages/Login.jsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { HOME_BY_ROLE } from "../config/roles";
import { useSystemHealth } from "../hooks/useSystemHealth";
import { MarcaAgua } from "../components/ui";
import {
  Eye, EyeOff, User, Lock, ArrowRight, ArrowLeft, Loader2, AlertCircle, ArrowBigUp,
} from "lucide-react";

export default function Login() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  // Siempre se piden usuario y contraseña: al abrir el login se cierra la
  // sesión que hubiera y se borra la "cuenta recordada" de versiones anteriores.
  useEffect(() => {
    logout();
    try {
      localStorage.removeItem("saved_account");
    } catch {
      /* sin acceso a localStorage: no hay nada que borrar */
    }
  }, [logout]);

  const [form, setForm] = useState({ identifier: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  // Detecta Bloq Mayús mientras se escribe la contraseña
  const revisarCapsLock = (e) => setCapsLock(e.getModifierState?.("CapsLock") ?? false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const u = await login(form.identifier.trim(), form.password);
      navigate(u.debe_cambiar_password ? "/cambiar-password" : HOME_BY_ROLE[u.role] || "/login", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.msg || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-sans">
      {/* ══════════ PANEL GUINDA (solo escritorio) ══════════ */}
      <aside className="relative hidden lg:flex overflow-hidden bg-institucional text-white lg:w-[42%]">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(120% 120% at 30% 20%, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.45) 100%)",
          }}
        />
        {/* Logotipo municipal en trazo blanco, muy tenue */}
        <MarcaAgua className="bg-white opacity-[0.07] h-[88%] -left-28 -bottom-12 rotate-[8deg]" />

        <div className="relative z-10 w-full flex flex-col justify-center items-end
                        text-right px-14 xl:px-16 py-10">
          <div className="max-w-xl">
            <h1 className="text-3xl xl:text-4xl 2xl:text-5xl font-bold leading-tight drop-shadow-sm">
              Coordinación de Parque Vehicular
            </h1>
            <p className="mt-3 xl:mt-4 text-lg xl:text-xl font-medium text-white/95">
              Atlacomulco
            </p>
            <div className="ml-auto mt-10 h-1 w-20 bg-white rounded-full" />
          </div>

          <div className="absolute bottom-6 right-14 xl:right-16 text-xs text-white/60">
            © {new Date().getFullYear()} · Todos los derechos reservados
          </div>
        </div>
      </aside>

      {/* ══════════ PANEL DEL FORMULARIO ══════════ */}
      <main className="relative flex-1 lg:w-[58%] bg-fondo overflow-y-auto">
        {/* Logotipo municipal como marca de agua, detrás del formulario */}
        <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
          <MarcaAgua
            className="bg-institucional opacity-[0.06] h-[70%] -right-20 -bottom-10 rotate-[-8deg]
                       lg:h-[92%] lg:-right-24 lg:-bottom-16"
          />
        </div>

        {/* Franja institucional (solo celular) */}
        <div className="relative lg:hidden h-1.5 bg-institucional" />

        <div className="relative w-full max-w-md mx-auto min-h-full flex flex-col
                        px-5 sm:px-8 pt-6 pb-6 lg:py-10">
          {/* Logos */}
          {/* Logos (PNG con fondo transparente: se ven sobre el fondo y la marca de agua) */}
          <div className="flex items-center justify-between gap-4 mb-6 lg:mb-12">
            <img
              src="/gobierno-estado.png"
              alt="Gobierno del Estado de México"
              className="h-11 sm:h-14 lg:h-16 w-auto max-w-[47%] object-contain"
            />
            <img
              src="/logo-atlacomulco.png"
              alt="Logo Atlacomulco"
              className="h-11 sm:h-14 lg:h-16 w-auto max-w-[47%] object-contain"
            />
          </div>

          {/* Título compacto (solo celular; en escritorio está en el panel guinda) */}
          <div className="lg:hidden mb-6">
            <p className="text-lg font-bold text-slate-800 leading-tight">
              Coordinación de Parque Vehicular
            </p>
            <p className="text-sm font-medium text-institucional">Atlacomulco</p>
          </div>

          <div className="flex-1 flex flex-col lg:justify-center">
            <Link
              to="/"
              className="self-start mb-3 inline-flex items-center gap-1.5 text-sm font-medium
                         text-slate-600 hover:text-institucional transition"
            >
              <ArrowLeft size={16} />
              Volver al inicio
            </Link>

            {/* ─── Tarjeta ─── */}
            <div
              className="animate-fade-up bg-white rounded-2xl border border-slate-200/80
                         shadow-[0_10px_40px_-12px_rgba(15,23,42,0.12)]
                         p-6 sm:p-8"
            >
              <h2 className="text-2xl sm:text-[1.7rem] font-semibold text-slate-800 tracking-tight">
                Inicia sesión
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                Accede al sistema de control del parque vehicular
              </p>

              {/* ─── Formulario ─── */}
              {/* Sin autocompletar: el navegador no debe rellenar usuario ni contraseña */}
              <form onSubmit={handleSubmit} autoComplete="off" className="mt-6 space-y-4">
                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700
                               text-sm p-3 rounded-xl"
                  >
                    <AlertCircle size={18} className="shrink-0 mt-px" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Usuario */}
                <div>
                  <label htmlFor="identifier" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Usuario o correo
                  </label>
                  <InputConIcono icon={<User size={18} />}>
                    <input
                      id="identifier"
                      name="identifier"
                      value={form.identifier}
                      onChange={handleChange}
                      autoComplete="off"
                      autoFocus
                      required
                      placeholder="Tu usuario o correo"
                      className={inputClass}
                    />
                  </InputConIcono>
                </div>

                {/* Contraseña */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Contraseña
                  </label>
                  <InputConIcono icon={<Lock size={18} />}>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={handleChange}
                      onKeyUp={revisarCapsLock}
                      onKeyDown={revisarCapsLock}
                      onBlur={() => setCapsLock(false)}
                      autoComplete="new-password"
                      required
                      placeholder="Tu contraseña"
                      className={`${inputClass} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg
                                 text-slate-500 hover:text-institucional hover:bg-slate-100
                                 focus:outline-none focus-visible:ring-2 focus-visible:ring-institucional/30 transition"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </InputConIcono>
                  {capsLock && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-900">
                      <ArrowBigUp size={14} />
                      Bloq Mayús está activado
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group w-full flex items-center justify-center gap-2 mt-2
                             py-3 rounded-xl bg-institucional hover:bg-institucional-dark active:bg-institucional-dark
                             text-white font-semibold text-sm
                             shadow-[0_6px_16px_-6px_rgba(159,34,65,0.55)]
                             disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed
                             focus:outline-none focus-visible:ring-4 focus-visible:ring-institucional/25
                             transition"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Ingresando...
                    </>
                  ) : (
                    <>
                      Iniciar sesión
                      <ArrowRight size={17} className="group-hover:translate-x-0.5 transition" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Estado del sistema + ayuda */}
            <div className="mt-5 flex flex-col items-center gap-1.5 text-xs text-slate-500 text-center">
              <EstadoSistema />
              <span>¿Problemas para acceder? Contacta al administrador.</span>
            </div>
          </div>

          {/* Pie (solo celular; en escritorio está en el panel guinda) */}
          <p className="lg:hidden mt-8 text-center text-[11px] text-slate-500">
            © {new Date().getFullYear()} · Coordinación de Parque Vehicular · Atlacomulco
          </p>
        </div>
      </main>
    </div>
  );
}

/* ───── Sub-componentes ───── */

const inputClass = `
  w-full pl-10 pr-3 py-3 rounded-xl
  border border-slate-200 bg-white
  text-[15px] text-slate-800 placeholder-slate-400
  focus:outline-none focus:border-institucional/60 focus:ring-4 focus:ring-institucional/10
  transition
`;

function InputConIcono({ icon, children }) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
        {icon}
      </span>
      {children}
    </div>
  );
}


const ESTADO = {
  online:   { dot: "bg-emerald-500", label: "Sistema en línea" },
  degraded: { dot: "bg-amber-500",   label: "Sistema con problemas" },
  offline:  { dot: "bg-red-500",     label: "Sin conexión con el servidor" },
  checking: { dot: "bg-slate-300",   label: "Verificando conexión..." },
};

function EstadoSistema() {
  const { status } = useSystemHealth();
  const cfg = ESTADO[status] || ESTADO.checking;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative flex h-2 w-2">
        {status === "online" && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${cfg.dot}`} />
      </span>
      {cfg.label}
    </span>
  );
}
