// src/components/publico/EncabezadoPublico.jsx
// Encabezado de las páginas públicas (inicio y aviso de privacidad): barra
// flotante en forma de píldora, blanca translúcida sobre el contenido.
// Es fija, así que cada página deja espacio arriba (pt-28 aprox.).
// En pantallas angostas los enlaces pasan a un menú desplegable (botón ☰).
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogIn, Menu, X, ChevronRight } from "lucide-react";

const ENLACES = [
  { to: "/#como-funciona", label: "Cómo funciona" },
  { to: "/aviso-privacidad", label: "Aviso de privacidad" },
];

const ENLACE = `hidden lg:inline-flex whitespace-nowrap px-3.5 py-2 rounded-full text-sm font-medium text-slate-600
                hover:bg-institucional/5 hover:text-institucional transition-colors
                focus:outline-none focus-visible:ring-2 focus-visible:ring-institucional/30`;

export default function EncabezadoPublico() {
  const navigate = useNavigate();
  const { pathname, hash } = useLocation();
  const [abierto, setAbierto] = useState(false);
  const caja = useRef(null);

  // Se cierra al cambiar de página o de sección, con Esc y al tocar fuera
  useEffect(() => {
    setAbierto(false);
  }, [pathname, hash]);

  useEffect(() => {
    if (!abierto) return undefined;
    const fuera = (e) => {
      if (caja.current && !caja.current.contains(e.target)) setAbierto(false);
    };
    const esc = (e) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", esc);
    };
  }, [abierto]);

  return (
    <header className="fixed inset-x-0 top-2.5 sm:top-3.5 z-40">
      <div ref={caja} className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div
          className="flex items-center gap-2 sm:gap-4 rounded-full border border-white/60 bg-white/95
                     py-1.5 sm:py-2 pl-3.5 pr-1.5 sm:pl-5 sm:pr-2 backdrop-blur-md backdrop-saturate-150
                     shadow-[0_8px_30px_-10px_rgba(74,15,31,0.35)]"
        >
          <Link to="/" className="flex items-center gap-3.5 min-w-0 mr-auto">
            <img
              src="/logo-atlacomulco.png"
              alt="H. Ayuntamiento de Atlacomulco"
              className="h-8 sm:h-[38px] w-auto object-contain shrink-0"
            />
            <span aria-hidden className="hidden sm:block w-px h-[30px] bg-slate-200 shrink-0" />
            <span className="hidden sm:block min-w-0">
              <span className="block text-sm font-bold tracking-tight text-slate-900 leading-tight truncate">
                Sistema de Control de Parque Vehicular
              </span>
              <span className="block text-xs font-medium text-institucional truncate">
                H. Ayuntamiento de Atlacomulco
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-1" aria-label="Principal">
            {ENLACES.map((e) => (
              <Link key={e.to} to={e.to} className={ENLACE}>{e.label}</Link>
            ))}
          </nav>

          <button
            onClick={() => navigate("/login")}
            className="group inline-flex items-center gap-2 shrink-0 rounded-full px-4 sm:px-5 py-2.5 sm:py-3
                       bg-institucional text-white text-sm font-bold
                       shadow-[0_6px_18px_-6px_rgba(159,34,65,0.7)]
                       hover:bg-institucional-dark hover:-translate-y-px active:translate-y-0 active:scale-[0.98]
                       focus:outline-none focus-visible:ring-4 focus-visible:ring-institucional/25
                       transition-[transform,background-color] duration-200"
          >
            <LogIn size={17} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            {/* En celular el texto corto deja espacio al botón del menú */}
            <span className="sm:hidden">Ingresar</span>
            <span className="hidden sm:inline">Ingresar al sistema</span>
          </button>

          {/* Menú para pantallas angostas */}
          <button
            onClick={() => setAbierto((a) => !a)}
            aria-expanded={abierto}
            aria-controls="menu-publico"
            aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
            className="lg:hidden w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-full flex items-center justify-center
                       text-slate-700 hover:bg-slate-100 active:scale-[0.94]
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-institucional/30 transition"
          >
            {abierto ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {abierto && (
          <nav
            id="menu-publico"
            aria-label="Menú"
            className="lg:hidden mt-2 rounded-3xl border border-slate-200 bg-white p-2
                       shadow-[0_16px_40px_-14px_rgba(74,15,31,0.4)] animate-pop origin-top"
          >
            {/* En celular el nombre del sistema no cabe en la barra: va aquí */}
            <p className="sm:hidden px-4 pt-2.5 pb-3 border-b border-slate-100 mb-1">
              <span className="block text-sm font-bold text-slate-900">Sistema de Control de Parque Vehicular</span>
              <span className="block text-xs font-medium text-institucional">H. Ayuntamiento de Atlacomulco</span>
            </p>
            {ENLACES.map((e) => (
              <Link
                key={e.to}
                to={e.to}
                onClick={() => setAbierto(false)}
                className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl text-[15px] font-medium
                           text-slate-700 hover:bg-institucional/5 hover:text-institucional active:bg-institucional/10 transition-colors"
              >
                {e.label}
                <ChevronRight size={18} className="text-slate-400" />
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
