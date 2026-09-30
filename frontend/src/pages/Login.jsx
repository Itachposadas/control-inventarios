// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { HOME_BY_ROLE } from "../config/roles";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [savedAccount, setSavedAccount] = useState(() => {
    const raw = localStorage.getItem("saved_account");
    return raw ? JSON.parse(raw) : null;
  });

  const [showForm, setShowForm] = useState(!savedAccount);
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const u = await login(form.identifier.trim(), form.password);
      localStorage.setItem("saved_account", JSON.stringify(u));
      navigate(HOME_BY_ROLE[u.role] || "/login", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.msg || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSaved = () => {
    localStorage.removeItem("saved_account");
    setSavedAccount(null);
    setShowForm(true);
  };

  const handleUseSaved = () => {
    setForm({
      identifier: savedAccount.username || savedAccount.email,
      password: "",
    });
    setShowForm(true);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ══════════ PANEL ROJO ══════════ */}
      <aside
        className="relative flex overflow-hidden bg-[#9F2241] text-white
                   w-full h-44 sm:h-48
                   lg:h-auto lg:w-[42%]"
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(120% 120% at 30% 20%, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.45) 100%)",
          }}
        />

        <div className="relative z-10 w-full flex flex-col justify-center items-end
                        text-right px-8 sm:px-10 lg:px-14 xl:px-16 py-6 lg:py-10">
          <div className="max-w-xl">
            <p className="text-[10px] sm:text-xs lg:text-sm xl:text-base
                          uppercase tracking-[0.15em] sm:tracking-[0.2em]
                          lg:tracking-[0.25em] xl:tracking-[0.3em]
                          text-white/70 lg:text-white/80 xl:text-white
                          font-medium mb-1.5 sm:mb-2 lg:mb-4">
              Bienvenido
            </p>

            <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl
                           font-bold leading-tight drop-shadow-sm">
              Coordinación de Parque Vehicular
            </h1>

            <p className="mt-2 lg:mt-3 xl:mt-4
                          text-sm sm:text-base lg:text-lg xl:text-xl
                          font-medium text-white/95">
              Atlacomulco
            </p>

            <div className="ml-auto mt-5 sm:mt-6 lg:mt-10 h-1 w-16 lg:w-20 bg-white rounded-full" />
          </div>

          <div className="hidden lg:block absolute bottom-6 right-14 xl:right-16 text-xs text-white/60">
            © {new Date().getFullYear()} · Todos los derechos reservados
          </div>
        </div>
      </aside>

      {/* ══════════ PANEL BLANCO ══════════ */}
      <main
        className="relative flex-1 lg:w-[58%] bg-[#faf9f8]
                   px-6 sm:px-8 lg:px-12 xl:px-20 py-8 lg:py-10
                   overflow-y-auto"
      >
        <div className="w-full max-w-lg mx-auto flex flex-col min-h-full">
          <div className="flex items-center justify-end lg:justify-between
                          gap-4 mb-10 lg:mb-14">
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

          <div className="flex-1 flex flex-col justify-center pb-4">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold
                           text-slate-800 tracking-tight">
              Inicia sesión
            </h1>
            <p className="mt-2 text-sm lg:text-base text-slate-500">
              Accede al sistema de control del parque vehicular
            </p>

            {!showForm && savedAccount ? (
              <div className="mt-6 sm:mt-8 border border-slate-200 rounded-lg bg-white">
                <button
                  onClick={handleUseSaved}
                  className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition text-left"
                >
                  <Avatar name={savedAccount.username} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-500">Bienvenido de nuevo,</p>
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {savedAccount.username}
                    </p>
                  </div>
                </button>
                <div className="border-t border-slate-200 px-4 py-2 text-right">
                  <button
                    onClick={handleRemoveSaved}
                    className="text-sm text-[#9F2241] hover:underline"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 sm:mt-8 space-y-4 sm:space-y-5">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
                    {error}
                  </div>
                )}

                {savedAccount && (
                  <div className="flex items-center gap-3 border border-slate-200 rounded-lg bg-white p-3">
                    <Avatar name={savedAccount.username} size={32} />
                    <span className="text-sm text-slate-700 flex-1 truncate">
                      {savedAccount.username}
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveSaved}
                      className="text-xs text-[#9F2241] hover:underline shrink-0"
                    >
                      Eliminar
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Usuario o Email
                  </label>
                  <input
                    name="identifier"
                    value={form.identifier}
                    onChange={handleChange}
                    autoComplete="username"
                    required
                    className="w-full px-3 py-3
                               border-b-2 border-slate-300
                               bg-white/50
                               text-slate-800
                               focus:outline-none
                               focus:border-[#9F2241]
                               focus:bg-white
                               transition
                               text-base"
                    placeholder="admin@demo.com"
                  />
                </div>

                {/* ─── CONTRASEÑA CON OJO ─── */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={handleChange}
                      autoComplete="current-password"
                      required
                      className="w-full px-3 py-3 pr-11
                                 border-b-2 border-slate-300
                                 bg-white/50
                                 text-slate-800
                                 focus:outline-none
                                 focus:border-[#9F2241]
                                 focus:bg-white
                                 transition
                                 text-base"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={
                        showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                      }
                      title={
                        showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                      }
                      className="absolute right-0 top-1/2 -translate-y-1/2
                                 p-2 mr-1
                                 text-slate-400 hover:text-[#9F2241]
                                 focus:outline-none focus:text-[#9F2241]
                                 transition rounded"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2
                             py-3.5 rounded-md
                             bg-[#9F2241]
                             hover:bg-[#7d1a33]
                             text-white font-semibold text-sm
                             disabled:bg-slate-300
                             disabled:cursor-not-allowed
                             transition"
                >
                  {loading ? "Ingresando..." : "Iniciar sesión"}
                  {!loading && (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  )}
                </button>
              </form>
            )}

            {!showForm && savedAccount && (
              <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center
                              justify-between gap-3">
                <button
                  onClick={() => {
                    setForm({ identifier: "", password: "" });
                    setShowForm(true);
                  }}
                  className="text-sm text-slate-600 hover:underline text-center sm:text-left"
                >
                  Iniciar con otra cuenta
                </button>
                <button
                  onClick={handleUseSaved}
                  className="flex items-center justify-center gap-1 px-4 py-2 rounded-md
                             bg-[#9F2241] hover:bg-[#7d1a33] text-white text-sm font-medium transition"
                >
                  Entrar
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 text-center text-xs text-slate-500">
            ¿Problemas para acceder? Contacta al administrador del sistema.
          </div>
        </div>
      </main>
    </div>
  );
}

/* ───── Sub-componentes ───── */

function Avatar({ name = "?", size = 40 }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  return (
    <div
      className="rounded-full bg-gradient-to-br from-slate-300 to-slate-400
                 flex items-center justify-center text-white font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {initial}
    </div>
  );
}