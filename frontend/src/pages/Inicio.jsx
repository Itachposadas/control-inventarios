// src/pages/Inicio.jsx
// PÁGINA DE INICIO (pública). Solo explica cómo pedir servicio: no muestra
// áreas, vehículos ni solicitudes. Cada área entra con su propia cuenta
// (la crea el administrador) y solo ve lo de su área.
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Boton } from "../components/ui";
import {
  LogIn, LayoutDashboard, Wrench, KeyRound, ClipboardList, CarFront, ArrowRight, ShieldCheck,
} from "lucide-react";

export default function Inicio() {
  const navigate = useNavigate();
  const { user, homePath } = useAuth();

  const entrar = () => navigate(user ? homePath : "/login");

  return (
    <div className="min-h-screen flex flex-col bg-fondo font-sans">
      {/* ══════════ ENCABEZADO ══════════ */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/logo-atlacomulco.png" alt="Logo Atlacomulco" className="h-10 w-auto object-contain shrink-0" />
            <div className="min-w-0 hidden sm:block">
              <p className="text-sm font-bold text-slate-800 leading-tight truncate">Coordinación de Parque Vehicular</p>
              <p className="text-xs font-medium text-institucional">Atlacomulco</p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <img
              src="/gobierno-estado.png"
              alt="Gobierno del Estado de México"
              className="hidden md:block h-9 w-auto object-contain"
            />
            <Boton
              variante="secundario"
              onClick={entrar}
              icono={user ? <LayoutDashboard size={16} /> : <LogIn size={16} />}
            >
              {user ? "Ir a mi panel" : "Iniciar sesión"}
            </Boton>
          </div>
        </div>
      </header>

      {/* ══════════ PORTADA GUINDA ══════════ */}
      <section className="relative overflow-hidden bg-institucional text-white">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(120% 120% at 20% 0%, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.4) 100%)",
          }}
        />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider
                        bg-white/10 border border-white/20 rounded-full px-3 py-1">
            <Wrench size={13} />
            Taller municipal
          </p>
          <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight max-w-2xl">
            Solicitud de materiales para tu vehículo
          </h1>
          <p className="mt-3 text-base sm:text-lg text-white/90 max-w-xl">
            Entra con la cuenta de tu área, elige el vehículo y anota los materiales que necesita.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              onClick={entrar}
              className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl
                         bg-white text-institucional font-semibold text-base shadow-lg
                         hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40 transition"
            >
              {user ? "Ir a mi panel" : "Hacer una solicitud"}
              <ArrowRight size={18} className="group-hover:translate-x-0.5 transition" />
            </button>
          </div>
          <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-white/80">
            <ShieldCheck size={15} />
            Cada área solo ve sus propios vehículos y solicitudes.
          </p>
        </div>
      </section>

      {/* ══════════ CÓMO FUNCIONA ══════════ */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">¿Cómo funciona?</h2>
        <ol className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Paso
            n={1}
            icono={<KeyRound size={20} />}
            titulo="Entra con la cuenta de tu área"
            texto="El administrador del parque vehicular le da a cada área su usuario y contraseña."
          />
          <Paso
            n={2}
            icono={<ClipboardList size={20} />}
            titulo="Elige el vehículo y los materiales"
            texto="Solo aparecen las unidades de tu área. La fecha y la hora se registran solas."
          />
          <Paso
            n={3}
            icono={<CarFront size={20} />}
            titulo="Lleva la unidad al taller"
            texto="Menciona tu folio. El mecánico atiende tu solicitud al recibir la unidad."
          />
        </ol>

        <p className="mt-8 text-sm text-slate-500">
          ¿Tu área todavía no tiene cuenta? Pídela al administrador del parque vehicular.
        </p>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 text-xs text-slate-500 text-center sm:text-left">
          © {new Date().getFullYear()} · Coordinación de Parque Vehicular · Atlacomulco
        </div>
      </footer>
    </div>
  );
}

function Paso({ n, icono, titulo, texto }) {
  return (
    <li className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-institucional/10 text-institucional flex items-center justify-center">
          {icono}
        </span>
        <span className="text-xs font-semibold text-slate-500">Paso {n}</span>
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-800">{titulo}</p>
      <p className="mt-1 text-xs text-slate-500 leading-relaxed">{texto}</p>
    </li>
  );
}
