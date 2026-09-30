// src/components/dashboard/ActivityFeed.jsx
export default function ActivityFeed({
  title = "Actividad reciente",
  subtitle = "Últimos movimientos del sistema",
  items = [],
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200
                    shadow-[0_1px_3px_rgba(15,23,42,0.04)] h-full">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        )}
      </div>

      {items.length === 0 && (
        <p className="p-5 text-sm text-slate-400">Sin movimientos todavía</p>
      )}

      <ul className="p-5 space-y-4">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3 relative">
            {/* Línea vertical del timeline */}
            {i < items.length - 1 && (
              <span className="absolute left-[7px] top-5 bottom-[-16px] w-px bg-slate-200" />
            )}

            {/* Dot */}
            <span
              className={`relative z-10 mt-1.5 w-3.5 h-3.5 rounded-full
                          border-2 border-white shadow-sm shrink-0
                          ${item.dot || "bg-[#9F2241]"}`}
            />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800 leading-tight">
                {item.user}
              </p>
              <p className="text-xs text-slate-500 mt-1">{item.action}</p>
              <p className="text-[11px] text-slate-400 mt-1">{item.time}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}