// src/components/vehiculos/VehiculoCard.jsx
import { Car, Wrench, } from "lucide-react";

export default function VehiculoCard({ vehiculo, serviciosCount = 0, onClick }) {
  const estadoConfig = {
    activo:        { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", label: "Activo" },
    mantenimiento: { dot: "bg-amber-500",   text: "text-amber-700",   bg: "bg-amber-50",   label: "En mantenimiento" },
    baja:          { dot: "bg-red-500",     text: "text-red-700",     bg: "bg-red-50",     label: "Baja" },
  };
  const estado = estadoConfig[vehiculo.estado] || estadoConfig.activo;

  return (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-2xl border border-slate-200
                 shadow-[0_1px_3px_rgba(15,23,42,0.04)]
                 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)]
                 hover:border-institucional/30 hover:-translate-y-0.5
                 transition-all duration-200 overflow-hidden group"
    >
      {/* Encabezado */}
      <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500 font-mono truncate">
            {vehiculo.noInventario}
          </p>
          <p className="mt-1 text-base font-bold text-slate-800 leading-tight truncate">
            {vehiculo.numeroEconomico || vehiculo.unidad || "Sin unidad"}
          </p>
          <p className="text-xs text-slate-500 truncate mt-0.5">
            {vehiculo.marca} {vehiculo.modelo && `· ${vehiculo.modelo}`}
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center
                        text-slate-500 group-hover:bg-institucional/10
                        group-hover:text-institucional transition shrink-0">
          <Car size={20} />
        </div>
      </div>

      {/* Info */}
      <div className="px-5 py-4 space-y-2.5">
        {/* Área */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
            Área
          </span>
          <span className="text-xs font-medium text-slate-700 truncate">
            {vehiculo.area}
          </span>
        </div>


        {/* Estado + servicios */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${estado.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${estado.dot}`} />
            {estado.label}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <Wrench size={12} />
            {serviciosCount} {serviciosCount === 1 ? "servicio" : "servicios"}
          </span>
        </div>
      </div>
    </button>
  );
}