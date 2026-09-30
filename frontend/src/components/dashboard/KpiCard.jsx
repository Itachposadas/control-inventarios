// src/components/dashboard/KpiCard.jsx
import { TrendingUp, TrendingDown, AlertCircle, Clock } from "lucide-react";

export default function KpiCard({
  label,
  value,
  icon,
  accent = "#9F2241",
  trend,          // ej: "8.2" (positivo) o "-3.4" (negativo) → muestra flecha
  trendLabel = "vs. mes anterior",
  status,         // ej: "2 requieren atención hoy" → muestra punto + texto
  statusType = "warning",  // "warning" | "info" | "success" | "danger"
}) {
  const isPositive = trend && !String(trend).startsWith("-");

  const statusColorMap = {
    warning: { dot: "bg-amber-500", text: "text-amber-700" },
    info:    { dot: "bg-blue-500",  text: "text-blue-700" },
    success: { dot: "bg-emerald-500", text: "text-emerald-700" },
    danger:  { dot: "bg-red-500",   text: "text-red-700" },
  };

  const statusColors = statusColorMap[statusType] || statusColorMap.info;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4
                    shadow-[0_1px_3px_rgba(15,23,42,0.04)]
                    hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)]
                    transition-all duration-200 relative overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {label}
          </p>
          <p className="mt-1.5 text-2xl sm:text-3xl font-bold text-slate-800 leading-none">
            {value}
          </p>

          {/* Línea secundaria — siempre una sola, con misma estructura */}
          <div className="mt-2.5 flex items-center gap-1.5 text-xs h-4">
            {trend && (
              <>
                {isPositive ? (
                  <TrendingUp size={13} className="text-emerald-600 shrink-0" />
                ) : (
                  <TrendingDown size={13} className="text-red-600 shrink-0" />
                )}
                <span
                  className={`font-semibold ${
                    isPositive ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {isPositive ? "+" : ""}
                  {trend}%
                </span>
                <span className="text-slate-400 truncate">{trendLabel}</span>
              </>
            )}

            {!trend && status && (
              <>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusColors.dot}`} />
                <span className={`truncate ${statusColors.text}`}>{status}</span>
              </>
            )}
          </div>
        </div>

        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${accent}14`, color: accent }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}