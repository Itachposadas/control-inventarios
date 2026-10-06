// src/components/solicitudes/Badges.jsx
import { ESTADO_STYLES, PRIORIDAD_STYLES } from "../../config/colors";
import { ESTADO_LABEL, PRIORIDAD_LABEL } from "../../config/solicitudes";
import { Insignia } from "../ui";

export function EstadoBadge({ estado }) {
  return <Insignia tono={ESTADO_STYLES[estado] || "gris"}>{ESTADO_LABEL[estado] || estado}</Insignia>;
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
