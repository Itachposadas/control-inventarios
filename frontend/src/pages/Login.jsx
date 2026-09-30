// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { HOME_BY_ROLE } from "../config/roles";
import { useSystemHealth } from "../hooks/useSystemHealth";
import {
  Eye, EyeOff, User, Lock, ArrowRight, Loader2, AlertCircle, ArrowBigUp,
} from "lucide-react";

const SAVED_KEY = "saved_account";

function leerCuentaGuardada() {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [savedAccount, setSavedAccount] = useState(leerCuentaGuardada);
  const [showForm, setShowForm] = useState(!savedAccount);
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
      // Solo se recuerda lo necesario para el saludo (sin correo ni rol)
      localStorage.setItem(
        SAVED_KEY,
        JSON.stringify({ username: u.username, nombre_completo: u.nombre_completo })
      );
      navigate(HOME_BY_ROLE[u.role] || "/login", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.msg || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSaved = () => {
    localStorage.removeItem(SAVED_KEY);
    setSavedAccount(null);
    setForm({ identifier: "", password: "" });
    setShowForm(true);
  };

  const handleUseSaved = () => {
    setForm({ identifier: savedAccount.username, password: "" });
    setShowForm(true);
  };

  const handleOtraCuenta = () => {
    setForm({ identifier: "", password: "" });
    setSavedAccount(null);
    setShowForm(true);
  };

  const nombreGuardado = savedAccount?.nombre_completo || savedAccount?.username;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-sans">
      {/* ══════════ PANEL GUINDA (solo escritorio) ══════════ */}
      <aside className="relative hidden lg:flex overflow-hidden bg-[#9F2241] text-white lg:w-[42%]">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(120% 120% at 30% 20%, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.45) 100%)",
          }}
        />

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
      <main className="relative flex-1 lg:w-[58%] bg-[#faf9f8] overflow-y-auto">
        {/* Franja institucional (solo celular) */}
        <div className="lg:hidden h-1.5 bg-[#9F2241]" />

        <div className="w-full max-w-md mx-auto min-h-full flex flex-col
                        px-5 sm:px-8 pt-6 pb-6 lg:py-10">
          {/* Logos */}
          <div className="flex items-center justify-between gap-4 mb-6 lg:mb-12">
            <img
              src="/gobierno-estado.png"
              alt="Gobierno del Estado de México"
              className="h-10 sm:h-12 lg:h-14 w-auto object-contain"
            />
            <img
              src="/logo-atlacomulco.png"
              alt="Logo Atlacomulco"
              className="h-10 sm:h-12 lg:h-14 w-auto object-contain"
            />
          </div>

          {/* Título compacto (solo celular; en escritorio está en el panel guinda) */}
          <div className="lg:hidden mb-6">
            <p className="text-lg font-bold text-slate-800 leading-tight">
              Coordinación de Parque Vehicular
            </p>
            <p className="text-sm font-medium text-[#9F2241]">Atlacomulco</p>
          </div>

          <div className="flex-1 flex flex-col lg:justify-center">
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

              {!showForm && savedAccount ? (
                /* ─── Cuenta recordada ─── */
                <div className="mt-6 space-y-3">
                  <button
                    onClick={handleUseSaved}
                    className="group w-full flex items-center gap-3 p-4 rounded-xl border border-slate-200
                               hover:border-[#9F2241]/40 hover:bg-[#9F2241]/[0.03] transition text-left"
                  >
                    <Avatar name={nombreGuardado} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500">Continuar como</p>
                      <p className="text-sm font-semibold text-slate-800 truncate">{nombreGuardado}</p>
                    </div>
                    <ArrowRight
                      size={18}
                      className="text-slate-300 group-hover:text-[#9F2241] group-hover:translate-x-0.5 transition"
                    />
                  </button>

                  <div className="flex items-center justify-between text-sm">
                    <button onClick={handleOtraCuenta} className="text-slate-600 hover:text-[#9F2241] transition">
                      Usar otra cuenta
                    </button>
                    <button onClick={handleRemoveSaved} className="text-slate-400 hover:text-red-600 transition">
                      Quitar de este equipo
                    </button>
                  </div>
                </div>
              ) : (
                /* ─── Formulario ─── */
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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

                  {savedAccount && (
                    <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 p-2.5 pr-3">
                      <Avatar name={nombreGuardado} size={32} />
                      <span className="text-sm font-medium text-slate-700 flex-1 truncate">
                        {nombreGuardado}
                      </span>
                      <button
                        type="button"
                        onClick={handleOtraCuenta}
                        className="text-xs font-medium text-[#9F2241] hover:underline shrink-0"
                      >
                        No soy yo
                      </button>
                    </div>
                  )}

                  {/* Usuario (se oculta si ya se eligió la cuenta recordada) */}
                  <div className={savedAccount ? "hidden" : ""}>
                    <label htmlFor="identifier" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Usuario o correo
                    </label>
                    <InputConIcono icon={<User size={18} />}>
                      <input
                        id="identifier"
                        name="identifier"
                        value={form.identifier}
                        onChange={handleChange}
                        autoComplete="username"
                        autoFocus={!savedAccount}
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
                        autoComplete="current-password"
                        autoFocus={Boolean(savedAccount)}
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
                                   text-slate-400 hover:text-[#9F2241] hover:bg-slate-100
                                   focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9F2241]/30 transition"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </InputConIcono>
                    {capsLock && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-700">
                        <ArrowBigUp size={14} />
                        Bloq Mayús está activado
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="group w-full flex items-center justify-center gap-2 mt-2
                               py-3 rounded-xl bg-[#9F2241] hover:bg-[#8a1d38] active:bg-[#7d1a33]
                               text-white font-semibold text-sm
                               shadow-[0_6px_16px_-6px_rgba(159,34,65,0.55)]
                               disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed
                               focus:outline-none focus-visible:ring-4 focus-visible:ring-[#9F2241]/25
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
              )}
            </div>

            {/* Estado del sistema + ayuda */}
            <div className="mt-5 flex flex-col items-center gap-1.5 text-xs text-slate-500 text-center">
              <EstadoSistema />
              <span>¿Problemas para acceder? Contacta al administrador.</span>
            </div>
          </div>

          {/* Pie (solo celular; en escritorio está en el panel guinda) */}
          <p className="lg:hidden mt-8 text-center text-[11px] text-slate-400">
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
  focus:outline-none focus:border-[#9F2241]/60 focus:ring-4 focus:ring-[#9F2241]/10
  transition
`;

function InputConIcono({ icon, children }) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
        {icon}
      </span>
      {children}
    </div>
  );
}

function Avatar({ name = "?", size = 40 }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  return (
    <div
      className="rounded-full bg-gradient-to-br from-[#b83a58] to-[#7d1a33]
                 flex items-center justify-center text-white font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initial}
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
