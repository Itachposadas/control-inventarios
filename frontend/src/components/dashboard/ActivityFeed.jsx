// src/components/dashboard/ActivityFeed.jsx
// Últimos movimientos de los servicios. Lo que pasó va primero (acción y
// folio); quién lo hizo y cuándo, debajo y en gris.
//   items = [{ id, accion, folio, usuario, fecha, onClick }]
export default function ActivityFeed({
  title = "Actividad reciente",
  items = [],
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      </div>

      {items.length === 0 ? (
        <p className="p-5 text-sm text-slate-500">Sin movimientos todavía</p>
      ) : (
        <ul className="py-2">
          {items.map((item) => (
            <li key={item.id}>
              <button
                onClick={item.onClick}
                disabled={!item.onClick}
                className="w-full text-left px-5 py-2.5 hover:bg-slate-50 transition disabled:hover:bg-transparent
                           focus-visible:outline-none focus-visible:bg-slate-50"
              >
                <span className="block text-sm text-slate-800 leading-snug">
                  {item.accion}
                  {item.folio && <span className="text-slate-500"> · <span className="font-mono text-[13px] whitespace-nowrap">{item.folio}</span></span>}
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {[item.fecha, item.usuario].filter(Boolean).join(" · ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
