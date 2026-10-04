// src/components/solicitudes/Checklist.jsx
// "Accesorios y herramientas" del formato de ingreso: cada concepto se marca
// SI o NO (solo una opción), en dos columnas como el formato en papel.
// El concepto 40 (total de birlos) es numérico.
import { CHECKLIST_IZQUIERDA, CHECKLIST_DERECHA } from "../../config/solicitudes";
import { inputClass } from "./ui";

/**
 * value:        { espejo_derecho: true, claxon: false, ... }  (sin marcar = ausente)
 * birlos:       número o ""                                    (concepto 40)
 * resaltarFaltantes: marca en rojo los conceptos sin respuesta
 */
export default function Checklist({
  value = {},
  onChange,
  birlos = "",
  onBirlosChange,
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
        <div className="flex items-center justify-between mb-2 text-[11px]">
          <span className="uppercase tracking-wide text-slate-500 font-semibold">{titulo}</span>
          <span className="flex gap-3">
            <button type="button" onClick={() => marcarColumna(items, true)} className="text-emerald-700 hover:underline">
              Todos SI
            </button>
            <button type="button" onClick={() => marcarColumna(items, false)} className="text-slate-500 hover:underline">
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

  const faltaBirlos = resaltarFaltantes && (birlos === "" || birlos === null || birlos === undefined);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
      {columna(CHECKLIST_IZQUIERDA, "Conceptos 1 – 20")}
      <div>
        {columna(CHECKLIST_DERECHA, "Conceptos 21 – 40")}
        {/* 40. Total de número de birlos (numérico) */}
        <div
          className={`mt-2 flex items-center gap-3 px-3 py-2 rounded-xl border
            ${faltaBirlos ? "border-red-300 bg-red-50" : "border-slate-200"}`}
        >
          <span className="w-6 text-xs font-semibold text-slate-500 tabular-nums text-right">40.</span>
          <label htmlFor="total-birlos" className="flex-1 text-sm text-slate-700">
            Total de número de birlos
          </label>
          {disabled ? (
            <span className="text-sm font-semibold text-slate-800 tabular-nums">{birlos ?? "—"}</span>
          ) : (
            <input
              id="total-birlos"
              type="number"
              min="0"
              max="200"
              inputMode="numeric"
              value={birlos ?? ""}
              onChange={(e) => onBirlosChange(e.target.value)}
              placeholder="0"
              className={`${inputClass} !w-24 text-right`}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Concepto({ item, valor, onMarcar, disabled, faltante }) {
  return (
    <li
      className={`flex items-center gap-3 px-3 py-1.5 text-sm transition-colors
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
      className={`w-11 py-1 text-xs font-semibold transition-colors
        ${borde ? "border-l border-slate-200" : ""}
        ${activa ? clases : "bg-white text-slate-500"}
        ${disabled ? "cursor-default" : activa ? "" : "hover:bg-slate-50 hover:text-slate-600"}`}
    >
      {etiqueta}
    </button>
  );
}
