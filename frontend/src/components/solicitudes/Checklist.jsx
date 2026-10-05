// src/components/solicitudes/Checklist.jsx
// "Accesorios y herramientas" del formato de ingreso: cada concepto se marca
// SI o NO (solo una opción), en dos columnas como el formato en papel.
import { CHECKLIST_IZQUIERDA, CHECKLIST_DERECHA } from "../../config/solicitudes";

/**
 * value:        { espejo_derecho: true, claxon: false, ... }  (sin marcar = ausente)
 * resaltarFaltantes: marca en rojo los conceptos sin respuesta
 */
export default function Checklist({
  value = {},
  onChange,
  disabled = false,
  resaltarFaltantes = false,
}) {
  const marcar = (key, si) => onChange({ ...value, [key]: si });

  const marcarColumna = (items, si) => {
    const next = { ...value };
    items.forEach((i) => { next[i.key] = si; });
    onChange(next);
  };

  const columna = (items, titulo) => (
    <div>
      {!disabled && (
        <div className="flex items-center justify-between mb-2 text-xs">
          <span className="uppercase tracking-wide text-slate-500 font-semibold">{titulo}</span>
          <span className="flex gap-3">
            <button type="button" onClick={() => marcarColumna(items, true)} className="px-2 py-1 rounded-md font-semibold text-emerald-700 hover:bg-emerald-50">
              Todos SI
            </button>
            <button type="button" onClick={() => marcarColumna(items, false)} className="px-2 py-1 rounded-md font-semibold text-slate-600 hover:bg-slate-100">
              Todos NO
            </button>
          </span>
        </div>
      )}
      <ul className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
        {items.map((item) => (
          <Concepto
            key={item.key}
            item={item}
            valor={value[item.key]}
            onMarcar={(si) => marcar(item.key, si)}
            disabled={disabled}
            faltante={resaltarFaltantes && typeof value[item.key] !== "boolean"}
          />
        ))}
      </ul>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
      {columna(CHECKLIST_IZQUIERDA, "Conceptos 1 – 20")}
      {columna(CHECKLIST_DERECHA, "Conceptos 21 – 40")}
    </div>
  );
}

function Concepto({ item, valor, onMarcar, disabled, faltante }) {
  return (
    <li
      className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors
        ${faltante ? "bg-red-50" : ""}`}
    >
      <span className="w-6 text-xs font-semibold text-slate-500 tabular-nums text-right shrink-0">{item.n}.</span>
      <span className={`flex-1 ${faltante ? "text-red-700" : "text-slate-700"}`}>{item.label}</span>

      {/* SI / NO: solo una opción */}
      <div role="radiogroup" aria-label={item.label} className="flex rounded-lg border border-slate-200 overflow-hidden shrink-0">
        <Opcion
          etiqueta="SI"
          activa={valor === true}
          clases="bg-emerald-700 text-white"
          onClick={() => onMarcar(true)}
          disabled={disabled}
        />
        <Opcion
          etiqueta="NO"
          activa={valor === false}
          clases="bg-red-600 text-white"
          onClick={() => onMarcar(false)}
          disabled={disabled}
          borde
        />
      </div>
    </li>
  );
}

function Opcion({ etiqueta, activa, clases, onClick, disabled, borde = false }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={activa}
      onClick={onClick}
      disabled={disabled}
      className={`w-14 py-2 text-sm font-bold transition-colors
        ${borde ? "border-l border-slate-200" : ""}
        ${activa ? clases : "bg-white text-slate-500"}
        ${disabled ? "cursor-default" : activa ? "" : "hover:bg-slate-50 hover:text-slate-600"}`}
    >
      {etiqueta}
    </button>
  );
}
