// src/components/layout/SystemStatus.jsx
import { useSystemHealth } from "../../hooks/useSystemHealth";

const STATUS_CONFIG = {
  online: {
    label: "Sistema en línea",
    dot: "bg-emerald-500",
    ping: "bg-emerald-400",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
  },
  degraded: {
    label: "Sistema con latencia",
    dot: "bg-amber-500",
    ping: "bg-amber-400",
    text: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-100",
  },
  offline: {
    label: "Sistema desconectado",
    dot: "bg-red-500",
    ping: "bg-red-400",
    text: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-100",
  },
  checking: {
    label: "Verificando...",
    dot: "bg-slate-400",
    ping: "bg-slate-300",
    text: "text-slate-600",
    bg: "bg-slate-50",
    border: "border-slate-200",
  },
};

export default function SystemStatus() {
  const { status, lastCheck, recheck } = useSystemHealth();
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.checking;

  const tooltip = lastCheck
    ? `Última verificación: ${lastCheck.toLocaleTimeString("es-MX")}`
    : "Verificando...";

  return (
    <button
      onClick={recheck}
      title={tooltip}
      className={`mx-4 mt-4 p-3 rounded-lg border text-left w-[calc(100%-2rem)]
                  transition hover:brightness-95 ${cfg.bg} ${cfg.border}`}
    >
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          {status === "online" && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${cfg.ping}`}
            />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${cfg.dot}`} />
        </span>
        <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
      </div>

      {lastCheck && (
        <p className="mt-1 text-[10px] text-slate-500 pl-4">
          {lastCheck.toLocaleTimeString("es-MX", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </button>
  );
}