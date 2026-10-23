// src/pages/Inicio.jsx
// PÁGINA DE INICIO (pública). Solo explica cómo pedir servicio: no muestra
// áreas, vehículos ni solicitudes reales. Cada área entra con su propia cuenta
// (la crea el administrador) y solo ve lo de su área.
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  KeyRound, ClipboardList, CarFront, Search, ArrowRight, Building2, Info,
} from "lucide-react";
import { MarcaAgua } from "../components/ui";
import EncabezadoPublico from "../components/publico/EncabezadoPublico";
import PiePublico from "../components/publico/PiePublico";

const PASOS = [
  {
    icono: <KeyRound size={22} />,
    titulo: "Ingreso con la cuenta del área",
    texto: "Cada área cuenta con un usuario propio, asignado por la Coordinación de Parque Vehicular.",
  },
  {
    icono: <ClipboardList size={22} />,
    titulo: "Solicitud del servicio",
    texto: "Se elige el vehículo y se capturan los materiales requeridos, con nombre y firma de quien solicita.",
  },
  {
    icono: <CarFront size={22} />,
    titulo: "Entrega de la unidad en el taller",
    texto: "El taller firma de recibido y registra el diagnóstico y el ingreso de la unidad.",
  },
  {
    icono: <Search size={22} />,
    titulo: "Seguimiento con el folio",
    texto: "Con el folio de la solicitud se consulta en qué etapa va el servicio hasta su entrega.",
  },
];

export default function Inicio() {
  const navigate = useNavigate();
  const { hash } = useLocation();

  // El enlace «Cómo funciona» puede venir de otra página (/#como-funciona)
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans text-slate-800">
      <EncabezadoPublico />

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

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10
                          px-3.5 py-1.5 text-xs font-semibold tracking-wide">
              <Building2 size={14} className="text-white/80" />
              Gobierno Municipal de Atlacomulco
            </p>

            <h1 className="mt-6 text-4xl sm:text-5xl font-bold leading-[1.1] tracking-tight">
              Sistema de Control de Parque Vehicular
            </h1>
            <div className="mx-auto mt-6 h-1 w-16 rounded-full bg-white/70" />

            <p className="mt-6 text-lg sm:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
              Solicitudes de servicio, seguimiento por folio y formatos del taller municipal en un solo lugar.
            </p>
            <p className="mt-3 text-sm text-white/70">
              Acceso exclusivo para el personal autorizado del H. Ayuntamiento de Atlacomulco.
            </p>

            <button
              onClick={() => navigate("/login")}
              className="group mt-10 inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg
                         bg-white text-institucional font-bold text-base shadow-md
                         hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40 transition"
            >
              Ingresar al sistema
              <ArrowRight size={19} className="group-hover:translate-x-1 transition" />
            </button>
          </div>
        </div>
      </section>

      {/* ══════════ CÓMO FUNCIONA ══════════ */}
      <section id="como-funciona" className="scroll-mt-20 py-20 sm:py-24 bg-fondo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
              Del área al taller en cuatro pasos
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-500">
              Todo el proceso queda registrado, sin formatos en papel.
            </p>
          </div>

          <ol className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PASOS.map((p, i) => (
              <li key={p.titulo} className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <span className="w-12 h-12 rounded-lg flex items-center justify-center bg-institucional/10 text-institucional">
                    {p.icono}
                  </span>
                  <span className="text-sm font-semibold text-slate-500 tabular-nums">Paso {i + 1}</span>
                </div>
                <h3 className="mt-5 text-base font-semibold text-slate-900">{p.titulo}</h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">{p.texto}</p>
              </li>
            ))}
          </ol>

          <p className="mt-10 mx-auto max-w-2xl flex items-start sm:items-center justify-center gap-2.5
                        rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            <Info size={18} className="shrink-0 text-institucional" />
            ¿Su área aún no cuenta con usuario? Solicítelo en la Coordinación de Parque Vehicular.
          </p>
        </div>
      </section>

      <PiePublico />
    </div>
  );
}
