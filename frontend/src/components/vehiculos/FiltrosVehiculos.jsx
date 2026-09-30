// src/components/vehiculos/FiltrosVehiculos.jsx
import { Search, X } from "lucide-react";

export default function FiltrosVehiculos({
  filters,
  onChange,
  onClear,
  total = 0,
  areasFromApi = [],
}) {
  const hasFilters = filters.q || filters.area || filters.estado;

  return (
    <div className="bg-white rounded-2xl border border-slate-200
                    shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Buscador */}
        <div className="md:col-span-6">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={filters.q}
              onChange={(e) => onChange({ ...filters, q: e.target.value })}
              placeholder="Buscar por No. inventario, económico, placas, marca..."
              className="w-full pl-9 pr-3 py-2 rounded-lg
                         border border-slate-200 bg-slate-50
                         text-sm text-slate-700 placeholder-slate-400
                         focus:outline-none focus:bg-white focus:border-[#9F2241]
                         focus:ring-2 focus:ring-[#9F2241]/15 transition"
            />
          </div>
        </div>

        {/* Área */}
        <div className="md:col-span-4">
          <select
            value={filters.area}
            onChange={(e) => onChange({ ...filters, area: e.target.value })}
            className="w-full px-3 py-2 rounded-lg
                       border border-slate-200 bg-slate-50
                       text-sm text-slate-700
                       focus:outline-none focus:bg-white focus:border-[#9F2241]
                       focus:ring-2 focus:ring-[#9F2241]/15 transition cursor-pointer"
          >
            <option value="">Todas las áreas ({areasFromApi.length})</option>
            {areasFromApi.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {/* Estado */}
        <div className="md:col-span-2">
          <select
            value={filters.estado}
            onChange={(e) => onChange({ ...filters, estado: e.target.value })}
            className="w-full px-3 py-2 rounded-lg
                       border border-slate-200 bg-slate-50
                       text-sm text-slate-700
                       focus:outline-none focus:bg-white focus:border-[#9F2241]
                       focus:ring-2 focus:ring-[#9F2241]/15 transition cursor-pointer"
          >
            <option value="">Todos</option>
            <option value="activo">Activo</option>
            <option value="mantenimiento">En mantenimiento</option>
            <option value="baja">Baja</option>
          </select>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-slate-500">
          Mostrando <span className="font-semibold text-slate-700">{total}</span>{" "}
          {total === 1 ? "vehículo" : "vehículos"}
          {filters.area && (
            <> en <span className="font-semibold text-[#9F2241]">{filters.area}</span></>
          )}
        </p>

        {hasFilters && (
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1 text-xs font-medium
                       text-[#9F2241] hover:underline"
          >
            <X size={14} />
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}