// src/components/solicitudes/Checklist.jsx
import { Check } from "lucide-react";
import { CHECKLIST } from "../../config/solicitudes";

/**
 * Accesorios con los que llegó el vehículo.
 * value: { espejo_derecho: true, claxon: false, ... }  (true = sí llegó)
 */
export default function Checklist({ value = {}, onChange, disabled = false }) {
  const toggle = (key) => onChange({ ...value, [key]: !value[key] });

  const marcarGrupo = (items, marcado) => {
    const next = { ...value };
    items.forEach((i) => { next[i.key] = marcado; });
    onChange(next);
  };

  return (
    <div className="space-y-5">
      {CHECKLIST.map(({ grupo, items }) => (
        <div key={grupo}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">
              {grupo}
            </p>
            {!disabled && (
              <div className="flex gap-3 text-[11px]">
                <button type="button" onClick={() => marcarGrupo(items, true)}
                        className="text-[#9F2241] hover:underline">
                  Marcar todos
                </button>
                <button type="button" onClick={() => marcarGrupo(items, false)}
                        className="text-slate-500 hover:underline">
                  Ninguno
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {items.map((item) => {
              const checked = Boolean(value[item.key]);
              return (
                <button
                  type="button"
                  key={item.key}
                  onClick={() => !disabled && toggle(item.key)}
                  disabled={disabled}
                  aria-pressed={checked}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left text-sm transition
                    ${checked
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-white text-slate-600"}
                    ${disabled ? "cursor-default" : "hover:border-[#9F2241]/40"}`}
                >
                  <span
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0
                      ${checked ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-white"}`}
                  >
                    {checked && <Check size={14} strokeWidth={3} />}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  <span className={`text-[11px] font-semibold ${checked ? "text-emerald-700" : "text-slate-400"}`}>
                    {checked ? "SÍ" : "NO"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
