// src/components/layout/SystemStatus.jsx
// Indicador discreto de conexión con el servidor (una sola línea).
import { useSystemHealth } from "../../hooks/useSystemHealth";

const STATUS_CONFIG = {
  online:   { label: "Sistema en línea",      dot: "bg-emerald-500", ping: "bg-emerald-400" },
  degraded: { label: "Sistema con latencia",  dot: "bg-amber-500",   ping: "bg-amber-400" },
  offline:  { label: "Sistema desconectado",  dot: "bg-red-500",     ping: "bg-red-400" },
  checking: { label: "Verificando...",        dot: "bg-slate-400",   ping: "bg-slate-300" },
};

export default function SystemStatus() {
  const { status, lastCheck, recheck } = useSystemHealth();
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.checking;

  const tooltip = lastCheck
    ? `Última verificación: ${lastCheck.toLocaleTimeString("es-MX")} · Clic para verificar`
    : "Verificando...";

  return (
    <button
      onClick={recheck}
      title={tooltip}
      className="mx-5 mt-5 flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 transition"
    >
      <span className="relative flex h-2 w-2">
        {status === "online" && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${cfg.ping}`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${cfg.dot}`} />
      </span>
      {cfg.label}
    </button>
  );
}
