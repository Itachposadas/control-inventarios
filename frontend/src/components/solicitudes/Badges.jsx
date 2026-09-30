// src/components/solicitudes/Badges.jsx
import { ESTADO_STYLES, PRIORIDAD_STYLES } from "../../config/colors";
import { ESTADO_LABEL, PRIORIDAD_LABEL } from "../../config/solicitudes";

export function EstadoBadge({ estado }) {
  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-full
                  ${ESTADO_STYLES[estado] || "bg-slate-100 text-slate-700"}`}
    >
      {ESTADO_LABEL[estado] || estado}
    </span>
  );
}

export function PrioridadBadge({ prioridad }) {
  const cfg = PRIORIDAD_STYLES[prioridad] || PRIORIDAD_STYLES.media;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${cfg.text}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      {PRIORIDAD_LABEL[prioridad] || prioridad}
    </span>
  );
}
