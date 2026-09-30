// src/components/solicitudes/IngresoFields.jsx
import { CAMPOS_INGRESO } from "../../config/solicitudes";
import { Field, inputClass } from "./ui";

/** Datos del vehículo/maquinaria tal como llegó al taller. */
export default function IngresoFields({ value = {}, onChange, disabled = false }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {CAMPOS_INGRESO.map((c) => (
        <Field key={c.key} label={c.label}>
          <input
            value={value[c.key] || ""}
            onChange={(e) => onChange({ ...value, [c.key]: e.target.value })}
            disabled={disabled}
            className={`${inputClass} ${c.mono ? "font-mono" : ""}`}
          />
        </Field>
      ))}
    </div>
  );
}
