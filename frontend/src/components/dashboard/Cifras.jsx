// src/components/dashboard/Cifras.jsx
// Franja de cifras: cuatro datos en una sola tarjeta, separados por una línea
// de 1 px (el fondo gris asoma entre las celdas blancas). La usan el Panel de
// control y Reportes para que las cifras se lean igual en todo el sistema.
//   <Cifras etiqueta="Resumen">
//     <Cifra etiqueta="Servicios" valor={29} detalle="26 terminados" onClick={...} />
//   </Cifras>

export function Cifras({ etiqueta, children, className = "" }) {
  return (
    <section
      aria-label={etiqueta}
      className={`rounded-2xl border border-slate-200 overflow-hidden grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200 ${className}`}
    >
      {children}
    </section>
  );
}

// Una cifra. Si tiene destino, toda la celda es el enlace.
export function Cifra({ etiqueta, valor, detalle, onClick }) {
  const contenido = (
    <>
      <span className="block text-sm text-slate-600">{etiqueta}</span>
      <span className="mt-1 block text-2xl sm:text-3xl font-semibold text-slate-900 tabular-nums tracking-tight break-words">
        {valor}
      </span>
      {detalle && <span className="mt-1.5 block text-xs text-slate-500 leading-snug">{detalle}</span>}
    </>
  );
  const clase = "bg-white text-left px-4 sm:px-5 py-4 min-w-0";
  return onClick ? (
    <button
      onClick={onClick}
      className={`${clase} hover:bg-slate-50 transition
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-institucional/40`}
    >
      {contenido}
    </button>
  ) : (
    <div className={clase}>{contenido}</div>
  );
}
