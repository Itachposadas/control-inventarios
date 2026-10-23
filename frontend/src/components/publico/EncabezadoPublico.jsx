// src/components/publico/EncabezadoPublico.jsx
// Encabezado de las páginas públicas (inicio y aviso de privacidad).
import { Link, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";

export default function EncabezadoPublico() {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 min-w-0">
          <img src="/logo-atlacomulco.png" alt="H. Ayuntamiento de Atlacomulco" className="h-10 w-auto object-contain shrink-0" />
          <span className="hidden sm:block min-w-0 border-l border-slate-200 pl-3">
            <span className="block text-sm font-bold text-slate-800 leading-tight truncate">
              Sistema de Control de Parque Vehicular
            </span>
            <span className="block text-xs font-medium text-institucional">H. Ayuntamiento de Atlacomulco</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            to="/#como-funciona"
            className="hidden md:inline-flex px-3 py-2 rounded-lg text-sm font-medium text-slate-600
                       hover:text-institucional hover:bg-slate-50 transition"
          >
            Cómo funciona
          </Link>
          <Link
            to="/aviso-privacidad"
            className="hidden md:inline-flex px-3 py-2 rounded-lg text-sm font-medium text-slate-600
                       hover:text-institucional hover:bg-slate-50 transition"
          >
            Aviso de privacidad
          </Link>
          <button
            onClick={() => navigate("/login")}
            className="ml-1 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
                       bg-institucional text-white hover:bg-institucional-dark
                       focus:outline-none focus-visible:ring-4 focus-visible:ring-institucional/25 transition"
          >
            <LogIn size={16} />
            Ingresar al sistema
          </button>
        </nav>
      </div>
    </header>
  );
}
