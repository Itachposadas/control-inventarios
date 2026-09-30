// src/components/solicitudes/RefaccionesEditor.jsx
import { Plus, Trash2 } from "lucide-react";
import { inputClass } from "./ui";

/**
 * Lista editable de refacciones de un tipo ("utilizada" o "por_comprar").
 * `items` es la lista completa; aquí solo se muestran y editan las del `tipo` dado.
 */
export default function RefaccionesEditor({ items = [], tipo, onChange, disabled = false, vacio }) {
  const propias = items
    .map((r, index) => ({ ...r, index }))
    .filter((r) => r.tipo === tipo);

  const actualizar = (index, campo, valor) =>
    onChange(items.map((r, i) => (i === index ? { ...r, [campo]: valor } : r)));

  const quitar = (index) => onChange(items.filter((_, i) => i !== index));

  const agregar = () => onChange([...items, { tipo, descripcion: "", cantidad: 1 }]);

  if (disabled && propias.length === 0) {
    return <p className="text-sm text-slate-400">{vacio}</p>;
  }

  return (
    <div className="space-y-2">
      {propias.length > 0 && (
        <div className="grid grid-cols-[1fr_80px_36px] gap-2 text-[11px] uppercase tracking-wide text-slate-400 font-semibold">
          <span>Descripción</span>
          <span>Cantidad</span>
          <span />
        </div>
      )}

      {propias.map((r) => (
        <div key={r.index} className="grid grid-cols-[1fr_80px_36px] gap-2">
          <input
            value={r.descripcion}
            onChange={(e) => actualizar(r.index, "descripcion", e.target.value)}
            disabled={disabled}
            placeholder="Ej. Balatas delanteras"
            className={inputClass}
          />
          <input
            type="number"
            min="1"
            value={r.cantidad}
            onChange={(e) => actualizar(r.index, "cantidad", e.target.value)}
            disabled={disabled}
            className={inputClass}
          />
          {disabled ? (
            <span />
          ) : (
            <button
              type="button"
              onClick={() => quitar(r.index)}
              className="flex items-center justify-center rounded-lg text-slate-400
                         hover:bg-red-50 hover:text-red-600 transition"
              aria-label="Quitar"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ))}

      {!disabled && (
        <button
          type="button"
          onClick={agregar}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#9F2241] hover:underline"
        >
          <Plus size={15} />
          Agregar
        </button>
      )}
    </div>
  );
}
