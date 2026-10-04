// src/components/solicitudes/DatosVehiculo.jsx
// Datos del vehículo en SOLO LECTURA. Vienen del catálogo; si algo está mal,
// lo corrige el administrador en Vehículos → Editar.
import { Info } from "lucide-react";
import { CAMPOS_INGRESO } from "../../config/solicitudes";

/** Convierte un vehículo del catálogo al mismo formato que `solicitud.ingreso` */
export function datosDesdeVehiculo(v) {
  return {
    unidad: v.unidad || v.descripcion,
    marca: v.marca,
    modelo: v.modelo,
    placas: v.placas,
    color: v.color,
    area: v.area,
    serie: v.serie,
    no_inventario: v.noInventario,
  };
}

// campos: qué datos mostrar y en qué orden (por defecto, los del formato de ingreso)
export default function DatosVehiculo({ datos = {}, nota = true, campos = CAMPOS_INGRESO }) {
  return (
    <div>
      <dl className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
        {campos.map((c) => (
          <div key={c.key} className="min-w-0">
            <dt className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">{c.label}</dt>
            <dd className={`mt-0.5 text-sm text-slate-800 break-words ${c.mono ? "font-mono" : ""}`}>
              {datos[c.key] || <span className="text-slate-500">—</span>}
            </dd>
          </div>
        ))}
      </dl>
      {nota && (
        <p className="mt-4 flex items-start gap-1.5 text-xs text-slate-500">
          <Info size={14} className="shrink-0 mt-px" />
          Estos datos vienen del catálogo de vehículos. Si alguno está mal, pide al administrador que lo corrija.
        </p>
      )}
    </div>
  );
}
