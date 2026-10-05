// src/components/solicitudes/SolicitudesTable.jsx
import { useNavigate } from "react-router-dom";
import { ClipboardList, ChevronRight } from "lucide-react";
import { EstadoBadge, PrioridadBadge } from "./Badges";
import { TIPO_LABEL, formatFecha } from "../../config/solicitudes";

export default function SolicitudesTable({
  items = [],
  basePath,
  mostrarMecanico = true,
  vacio = "No hay solicitudes",
}) {
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <ClipboardList size={44} className="mx-auto text-slate-300" />
        <p className="mt-4 text-sm font-medium text-slate-700">{vacio}</p>
      </div>
    );
  }

  const nombre = (s) => s.vehiculo?.numeroEconomico || s.vehiculo?.unidad || s.vehiculo?.noInventario;

  return (
    <>
    {/* Celular: una tarjeta por servicio (sin tabla que se tenga que deslizar) */}
    <ul className="sm:hidden space-y-2">
      {items.map((s) => (
        <li key={s.id}>
          <button
            onClick={() => navigate(`${basePath}/${s.id}`)}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white border border-slate-200 text-left
                       active:bg-slate-50 transition"
          >
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold text-slate-800 truncate">{nombre(s)}</span>
                <EstadoBadge estado={s.estado} />
              </span>
              <span className="block text-xs text-slate-500 mt-1">
                {[s.vehiculo?.placas, s.vehiculo?.area].filter(Boolean).join(" · ")}
              </span>
              <span className="block text-xs text-slate-500 mt-0.5">
                Ingresó {formatFecha(s.fecha_ingreso)}
                {mostrarMecanico && ` · ${s.mecanico?.nombre_completo || s.mecanico?.username || "Sin mecánico"}`}
              </span>
            </span>
            <ChevronRight size={20} className="text-slate-300 shrink-0" />
          </button>
        </li>
      ))}
    </ul>

    <div className="hidden sm:block bg-white rounded-2xl border border-slate-200
                    shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
              <th className="text-left font-medium px-5 py-3">Folio</th>
              <th className="text-left font-medium px-5 py-3">Vehículo</th>
              <th className="text-left font-medium px-5 py-3">Tipo</th>
              <th className="text-left font-medium px-5 py-3">Prioridad</th>
              <th className="text-left font-medium px-5 py-3">Estado</th>
              {mostrarMecanico && (
                <th className="text-left font-medium px-5 py-3">Mecánico</th>
              )}
              <th className="text-left font-medium px-5 py-3">Ingreso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((s) => (
              <tr
                key={s.id}
                onClick={() => navigate(`${basePath}/${s.id}`)}
                className="hover:bg-slate-50 transition cursor-pointer"
              >
                <td className="px-5 py-3.5 font-mono text-xs font-semibold text-institucional whitespace-nowrap">
                  {s.folio}
                </td>
                <td className="px-5 py-3.5">
                  <p className="font-semibold text-slate-800">{nombre(s)}</p>
                  <p className="text-xs text-slate-500">
                    {[s.vehiculo?.placas, s.vehiculo?.area].filter(Boolean).join(" · ")}
                  </p>
                </td>
                <td className="px-5 py-3.5 text-slate-600">{TIPO_LABEL[s.tipo]}</td>
                <td className="px-5 py-3.5 whitespace-nowrap">
                  <PrioridadBadge prioridad={s.prioridad} />
                </td>
                <td className="px-5 py-3.5 whitespace-nowrap">
                  <EstadoBadge estado={s.estado} />
                </td>
                {mostrarMecanico && (
                  <td className="px-5 py-3.5 text-slate-600">
                    {s.mecanico?.nombre_completo || s.mecanico?.username || "—"}
                  </td>
                )}
                <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                  {formatFecha(s.fecha_ingreso)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
}
