// src/components/dashboard/DataTable.jsx
export default function DataTable({
  title = "Top áreas con más vehículos",
  subtitle = "",
  rows = [],
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200
                    shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
              <th className="text-left font-medium px-5 py-3">#</th>
              <th className="text-left font-medium px-5 py-3">Área</th>
              <th className="text-right font-medium px-5 py-3">Vehículos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, i) => (
              <tr
                key={`${row.area}-${i}`}
                className="hover:bg-slate-50 transition"
              >
                <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">
                  {String(i + 1).padStart(2, "0")}
                </td>
                <td className="px-5 py-3.5 font-semibold text-slate-800">
                  {row.area}
                </td>
                <td className="px-5 py-3.5 text-right font-semibold text-slate-700">
                  {row.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}