// src/pages/Inicio.jsx
// PÁGINA DE INICIO (pública). Solo explica cómo pedir servicio: no muestra
// áreas, vehículos ni solicitudes reales. Cada área entra con su propia cuenta
// (la crea el administrador) y solo ve lo de su área.
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LogIn, LayoutDashboard, KeyRound, ClipboardList, CarFront, ArrowRight, ShieldCheck,
  FileCheck2, Timer, Ticket, CheckCircle2, Building2, Sparkles,
} from "lucide-react";

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

const BENEFICIOS = [
  {
    icono: <ShieldCheck size={22} />,
    titulo: "Seguro por área",
    texto: "Cada área ve únicamente sus vehículos. Nadie más puede pedir por tus unidades.",
  },
  {
    icono: <FileCheck2 size={22} />,
    titulo: "Sin papeleo",
    texto: "La solicitud queda registrada al instante, sin formatos impresos ni firmas.",
  },
  {
    icono: <Timer size={22} />,
    titulo: "Atención por prioridad",
    texto: "El taller atiende primero las solicitudes que llevan más tiempo esperando.",
  },
  {
    icono: <Ticket size={22} />,
    titulo: "Folio de seguimiento",
    texto: "Cada solicitud recibe un folio único para identificarla en el taller.",
  },
];

export default function Inicio() {
  const navigate = useNavigate();
  const { user, homePath } = useAuth();

  const entrar = () => navigate(user ? homePath : "/login");
  const textoEntrar = user ? "Ir a mi panel" : "Iniciar sesión";

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

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#como-funciona" className="hover:text-institucional transition">Cómo funciona</a>
            <a href="#beneficios" className="hover:text-institucional transition">Beneficios</a>
          </nav>

          <button
            onClick={entrar}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold
                       bg-institucional text-white hover:bg-institucional-dark
                       shadow-[0_6px_16px_-6px_rgba(159,34,65,0.6)]
                       focus:outline-none focus-visible:ring-4 focus-visible:ring-institucional/25 transition"
          >
            {user ? <LayoutDashboard size={16} /> : <LogIn size={16} />}
            {textoEntrar}
          </button>
        </div>
      </header>

      {/* ══════════ PORTADA ══════════ */}
      <section id="inicio" className="relative overflow-hidden text-white isolate">
        {/* Fondo: degradado guinda, retícula de puntos y luces difuminadas */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#3B0B18] via-institucional-dark to-institucional" />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-[0.18]"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage: "radial-gradient(ellipse 70% 70% at 50% 40%, black 30%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 50% 40%, black 30%, transparent 75%)",
          }}
        />
        <div aria-hidden className="absolute -top-32 -left-24 w-[28rem] h-[28rem] -z-10 rounded-full bg-rose-400/25 blur-3xl" />
        <div aria-hidden className="absolute top-10 -right-32 w-[24rem] h-[24rem] -z-10 rounded-full bg-rose-300/15 blur-3xl" />
        <div aria-hidden className="absolute -bottom-40 right-0 w-[32rem] h-[32rem] -z-10 rounded-full bg-amber-300/20 blur-3xl" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-32 sm:pb-40 text-center">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10
                          backdrop-blur px-3.5 py-1.5 text-xs font-semibold tracking-wide">
              <Sparkles size={14} className="text-amber-200" />
              Gobierno Municipal de Atlacomulco
            </p>

            <h1 className="mt-6 text-4xl sm:text-5xl xl:text-6xl font-extrabold leading-[1.05] tracking-tight">
              Solicita materiales para tu vehículo,{" "}
              <span className="bg-gradient-to-r from-amber-200 via-rose-100 to-white bg-clip-text text-transparent">
                sin papeleo.
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
              La Coordinación de Parque Vehicular recibe en línea las solicitudes de cada área y las
              atiende en el taller municipal por orden de prioridad.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-3">
              <button
                onClick={entrar}
                className="group inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl
                           bg-white text-institucional font-bold text-base
                           shadow-[0_18px_40px_-12px_rgba(0,0,0,0.5)] hover:-translate-y-0.5 hover:shadow-[0_22px_48px_-12px_rgba(0,0,0,0.55)]
                           focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40 transition"
              >
                {user ? "Ir a mi panel" : "Hacer una solicitud"}
                <ArrowRight size={19} className="group-hover:translate-x-1 transition" />
              </button>
              <a
                href="#como-funciona"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl
                           border border-white/25 bg-white/5 backdrop-blur text-white font-semibold
                           hover:bg-white/10 transition"
              >
                ¿Cómo funciona?
              </a>
            </div>

            <ul className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/80">
              {["Solo ves tu área", "Fecha y hora automáticas", "Folio de seguimiento"].map((t) => (
                <li key={t} className="inline-flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-300" />
                  {t}
                </li>
              ))}
            </ul>
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
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-400 text-[11px] font-bold
                                   text-slate-900 flex items-center justify-center ring-2 ring-white">
                    {i + 1}
                  </span>
                </span>
                <h3 className="mt-6 text-lg font-bold text-slate-800 max-w-xs mx-auto">{p.titulo}</h3>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ══════════ BENEFICIOS ══════════ */}
      <section id="beneficios" className="scroll-mt-20 py-20 sm:py-24 bg-fondo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Titulo
            etiqueta="Beneficios"
            titulo="Más orden en el parque vehicular"
            texto="Un solo lugar para pedir, priorizar y atender lo que necesita cada unidad."
          />

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {BENEFICIOS.map((b) => (
              <div
                key={b.titulo}
                className="group relative overflow-hidden rounded-3xl bg-white border border-slate-200/80 p-6
                           shadow-[0_1px_3px_rgba(15,23,42,0.04)]
                           hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_rgba(15,23,42,0.25)] transition"
              >
                <span
                  aria-hidden
                  className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-institucional/5
                             group-hover:bg-institucional/10 transition"
                />
                <span className="relative w-12 h-12 rounded-2xl bg-institucional/10 text-institucional
                                 flex items-center justify-center group-hover:bg-institucional group-hover:text-white transition">
                  {b.icono}
                </span>
                <h3 className="relative mt-5 text-base font-bold text-slate-800">{b.titulo}</h3>
                <p className="relative mt-2 text-sm text-slate-500 leading-relaxed">{b.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ LLAMADO FINAL ══════════ */}
      <section className="py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[2rem] px-6 py-12 sm:px-14 sm:py-16 text-white isolate
                          bg-gradient-to-br from-institucional-dark via-institucional to-institucional-light">
            <div
              aria-hidden
              className="absolute inset-0 -z-10 opacity-20"
              style={{
                backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)",
                backgroundSize: "20px 20px",
                maskImage: "linear-gradient(to left, black, transparent 70%)",
                WebkitMaskImage: "linear-gradient(to left, black, transparent 70%)",
              }}
            />
            <div aria-hidden className="absolute -right-16 -bottom-24 w-80 h-80 -z-10 rounded-full bg-amber-300/25 blur-3xl" />

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
                {textoEntrar}
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
