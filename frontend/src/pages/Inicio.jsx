// src/pages/Inicio.jsx
// PÁGINA DE INICIO (pública). Solo explica cómo pedir servicio: no muestra
// áreas, vehículos ni solicitudes reales. Cada área entra con su propia cuenta
// (la crea el administrador) y solo ve lo de su área.
import { useNavigate } from "react-router-dom";
import {
  LogIn, KeyRound, ClipboardList, CarFront, ArrowRight, Building2,
} from "lucide-react";
import { MarcaAgua } from "../components/ui";

const PASOS = [
  {
    icono: <KeyRound size={22} />,
    titulo: "Entra con la cuenta de tu área",
  },
  {
    icono: <ClipboardList size={22} />,
    titulo: "Elige el vehículo y los materiales",
  },
  {
    icono: <CarFront size={22} />,
    titulo: "Lleva la unidad al taller",
  },
];

export default function Inicio() {
  const navigate = useNavigate();
  // Siempre lleva al login: cada vez se piden usuario y contraseña
  const entrar = () => navigate("/login");

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans text-slate-800">
      {/* ══════════ ENCABEZADO ══════════ */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <a href="#inicio" className="flex items-center gap-3 min-w-0">
            <img src="/logo-atlacomulco.png" alt="Logo Atlacomulco" className="h-10 w-auto object-contain shrink-0" />
            <span className="hidden sm:block min-w-0 border-l border-slate-200 pl-3">
              <span className="block text-sm font-bold text-slate-800 leading-tight truncate">
                Parque Vehicular
              </span>
              <span className="block text-xs font-medium text-institucional">Atlacomulco</span>
            </span>
          </a>

          <button
            onClick={entrar}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold
                       bg-institucional text-white hover:bg-institucional-dark
                       shadow-[0_6px_16px_-6px_rgba(159,34,65,0.6)]
                       focus:outline-none focus-visible:ring-4 focus-visible:ring-institucional/25 transition"
          >
            <LogIn size={16} />
            Iniciar sesión
          </button>
        </div>
      </header>

      {/* ══════════ PORTADA ══════════ */}
      <section id="inicio" className="relative overflow-hidden text-white isolate">
        {/* Fondo: guinda sólido con sombreado suave y el logotipo municipal como
            marca de agua (mismo estilo que el panel guinda del login) */}
        <div className="absolute inset-0 -z-10 bg-institucional" />
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.42) 100%)",
          }}
        />
        <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
          <MarcaAgua className="bg-white opacity-[0.07] h-[115%] -right-24 -bottom-16 rotate-[-8deg]
                                sm:h-[130%] sm:right-[4%]" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-32 sm:pb-40 text-center">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10
                          px-3.5 py-1.5 text-xs font-semibold tracking-wide">
              <Building2 size={14} className="text-white/80" />
              Gobierno Municipal de Atlacomulco
            </p>

            <h1 className="mt-6 text-4xl sm:text-5xl xl:text-6xl font-extrabold leading-[1.05] tracking-tight">
              Bienvenido al Sistema de Control Vehicular
            </h1>
            <div className="mx-auto mt-6 h-1 w-16 rounded-full bg-white/70" />

            <p className="mt-6 text-lg sm:text-xl text-white/85 max-w-2xl mx-auto leading-relaxed">
              Acceso exclusivo para el personal autorizado del H. Ayuntamiento de Atlacomulco.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-3">
              <button
                onClick={entrar}
                className="group inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl
                           bg-white text-institucional font-bold text-base
                           shadow-[0_18px_40px_-12px_rgba(0,0,0,0.5)] hover:-translate-y-0.5 hover:shadow-[0_22px_48px_-12px_rgba(0,0,0,0.55)]
                           focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40 transition"
              >
                Realizar solicitud
                <ArrowRight size={19} className="group-hover:translate-x-1 transition" />
              </button>
            </div>

          </div>
        </div>

        {/* Curva inferior */}
        <svg
          aria-hidden
          viewBox="0 0 1440 90"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 w-full h-12 sm:h-20 text-white"
        >
          <path fill="currentColor" d="M0,64 C240,96 480,96 720,72 C960,48 1200,16 1440,40 L1440,90 L0,90 Z" />
        </svg>
      </section>

      {/* ══════════ CÓMO FUNCIONA ══════════ */}
      <section id="como-funciona" className="scroll-mt-20 py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Titulo
            etiqueta="Cómo funciona"
            titulo="Tres pasos y listo"
            texto="Desde tu oficina hasta el taller, sin formatos en papel."
          />

          <ol className="relative mt-14 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
            {/* Línea que une los pasos (escritorio) */}
            <span
              aria-hidden
              className="hidden md:block absolute top-8 left-[16%] right-[16%] h-0.5
                         bg-gradient-to-r from-institucional/10 via-institucional/40 to-institucional/10"
            />
            {PASOS.map((p, i) => (
              <li key={p.titulo} className="relative text-center px-4">
                <span
                  className="relative mx-auto w-16 h-16 rounded-2xl flex items-center justify-center text-white
                             bg-gradient-to-br from-institucional-light to-institucional-dark
                             shadow-[0_12px_24px_-10px_rgba(159,34,65,0.7)] ring-8 ring-white"
                >
                  {p.icono}
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-800 text-[11px] font-bold
                                   text-white flex items-center justify-center ring-2 ring-white">
                    {i + 1}
                  </span>
                </span>
                <h3 className="mt-6 text-lg font-bold text-slate-800 max-w-xs mx-auto">{p.titulo}</h3>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ══════════ LLAMADO FINAL ══════════ */}
      <section className="py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[2rem] px-6 py-12 sm:px-14 sm:py-16 text-white isolate
                          bg-institucional">
            <div
              aria-hidden
              className="absolute inset-0 -z-10"
              style={{
                background:
                  "radial-gradient(120% 120% at 20% 0%, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.4) 100%)",
              }}
            />
            <MarcaAgua className="-z-10 bg-white opacity-[0.07] h-[150%] -right-10 -bottom-20 rotate-[-8deg]" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="max-w-xl">
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">¿Tu vehículo necesita algo?</h2>
                <p className="mt-3 text-white/80 text-lg">
                  Entra con la cuenta de tu área y envía tu solicitud en menos de un minuto.
                </p>
                <p className="mt-4 inline-flex items-center gap-2 text-sm text-white/70">
                  <Building2 size={16} />
                  ¿Tu área no tiene cuenta? Pídela al administrador del parque vehicular.
                </p>
              </div>
              <button
                onClick={entrar}
                className="group shrink-0 inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl
                           bg-white text-institucional font-bold text-base shadow-xl
                           hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40 transition"
              >
                Iniciar sesión
                <ArrowRight size={19} className="group-hover:translate-x-1 transition" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ PIE ══════════ */}
      <footer className="mt-auto bg-slate-900 text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row
                        items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <span className="bg-white rounded-xl p-2">
              <img src="/logo-atlacomulco.png" alt="Logo Atlacomulco" className="h-9 w-auto object-contain" />
            </span>
            <span className="bg-white rounded-xl p-2">
              <img src="/gobierno-estado.png" alt="Gobierno del Estado de México" className="h-9 w-auto object-contain" />
            </span>
          </div>
          <div className="text-center md:text-right text-sm">
            <p className="font-semibold text-slate-200">Coordinación de Parque Vehicular · Atlacomulco</p>
            <p className="mt-1 text-xs">© {new Date().getFullYear()} · Todos los derechos reservados</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ───── Piezas ───── */

function Titulo({ etiqueta, titulo, texto }) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-institucional">{etiqueta}</p>
      <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">{titulo}</h2>
      <p className="mt-4 text-base sm:text-lg text-slate-500">{texto}</p>
    </div>
  );
}
