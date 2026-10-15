// src/components/ui/Paginacion.jsx
// "Mostrando 11–20 de 57" y botones de página.
//   <Paginacion pagina={2} paginas={6} total={57} porPagina={10} onCambiar={setPagina} />
import { ChevronLeft, ChevronRight } from "lucide-react";

// Páginas a mostrar: la primera, la última y las vecinas de la actual (con "…")
function numeros(pagina, paginas) {
  const set = new Set([1, paginas, pagina - 1, pagina, pagina + 1]);
  const lista = [...set].filter((n) => n >= 1 && n <= paginas).sort((a, b) => a - b);
  const conHuecos = [];
  lista.forEach((n, i) => {
    if (i && n - lista[i - 1] > 1) conHuecos.push(`hueco-${n}`);
    conHuecos.push(n);
  });
  return conHuecos;
}

export default function Paginacion({ pagina, paginas, total, porPagina, onCambiar, className = "" }) {
  if (!total) return null;
  const desde = (pagina - 1) * porPagina + 1;
  const hasta = Math.min(total, pagina * porPagina);
  const boton = "min-w-[34px] h-[34px] px-2 rounded-lg text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <nav
      aria-label="Paginación"
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 ${className}`}
    >
      <p className="text-sm text-slate-600">
        Mostrando <span className="font-semibold text-slate-800">{desde}–{hasta}</span> de{" "}
        <span className="font-semibold text-slate-800">{total}</span>
      </p>
      {paginas > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onCambiar(pagina - 1)}
            disabled={pagina <= 1}
            aria-label="Página anterior"
            className={`${boton} text-slate-600 hover:bg-slate-100 inline-flex items-center justify-center`}
          >
            <ChevronLeft size={18} />
          </button>
          {numeros(pagina, paginas).map((n) =>
            typeof n === "string" ? (
              <span key={n} className="px-1 text-slate-500" aria-hidden>…</span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => onCambiar(n)}
                aria-current={n === pagina ? "page" : undefined}
                className={`${boton} ${n === pagina
                  ? "bg-institucional text-white"
                  : "text-slate-700 hover:bg-slate-100"}`}
              >
                {n}
              </button>
            )
          )}
          <button
            type="button"
            onClick={() => onCambiar(pagina + 1)}
            disabled={pagina >= paginas}
            aria-label="Página siguiente"
            className={`${boton} text-slate-600 hover:bg-slate-100 inline-flex items-center justify-center`}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </nav>
  );
}
