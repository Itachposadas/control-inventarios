// src/components/publico/PiePublico.jsx
// Pie de las páginas públicas (inicio y aviso de privacidad).
import { Link } from "react-router-dom";

export default function PiePublico() {
  return (
    <footer className="mt-auto bg-white border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-8 sm:py-10 flex flex-col md:flex-row
                      items-center justify-between gap-6 sm:gap-8">
        <div className="flex items-center gap-5 sm:gap-6">
          <img src="/gobierno-estado.png" alt="Gobierno del Estado de México" className="h-11 w-auto object-contain" />
          <span aria-hidden className="h-10 w-px bg-slate-200" />
          <img src="/logo-atlacomulco.png" alt="H. Ayuntamiento de Atlacomulco" className="h-11 w-auto object-contain" />
        </div>
        <div className="text-center md:text-right text-sm text-slate-500">
          <p className="font-semibold text-slate-800">Coordinación de Parque Vehicular</p>
          <p className="mt-0.5 text-pretty">H. Ayuntamiento de Atlacomulco · Administración 2025–2027</p>
          <p className="mt-3 text-xs flex flex-wrap items-center justify-center md:justify-end gap-x-2 gap-y-1">
            <Link to="/aviso-privacidad" className="font-medium text-institucional hover:underline">
              Aviso de privacidad
            </Link>
            <span aria-hidden className="hidden sm:inline text-slate-300">|</span>
            © {new Date().getFullYear()} H. Ayuntamiento de Atlacomulco
          </p>
        </div>
      </div>
    </footer>
  );
}
