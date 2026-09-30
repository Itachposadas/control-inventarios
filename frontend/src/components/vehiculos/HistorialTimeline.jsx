// src/components/vehiculos/HistorialTimeline.jsx
import { Wrench, CheckCircle2, Clock, DollarSign, User, ChevronRight } from "lucide-react";
import { formatFecha } from "../../config/solicitudes";

const TIPO_CONFIG = {
  Preventivo: { bg: "bg-blue-100",  text: "text-blue-700",  dot: "bg-blue-500" },
  Correctivo: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  Emergencia: { bg: "bg-red-100",   text: "text-red-700",   dot: "bg-red-500" },
};

// onItemClick (opcional): abre el servicio al hacer clic en la tarjeta
export default function HistorialTimeline({ items = [], onItemClick }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <Wrench size={40} className="mx-auto text-slate-300" />
        <p className="mt-3 text-sm font-medium text-slate-700">
          Sin servicios registrados
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Este vehículo aún no tiene historial de mantenimiento
        </p>
      </div>
    );
  }

  return (
    <ul className="relative space-y-5">
      {items.map((item, i) => {
        const tipoCfg = TIPO_CONFIG[item.tipo] || TIPO_CONFIG.Correctivo;
        const completado = item.estado === "Completado";

        return (
          <li key={item.id} className="relative pl-8">
            {/* Línea vertical */}
            {i < items.length - 1 && (
              <span className="absolute left-3 top-8 bottom-[-20px] w-px bg-slate-200" />
            )}

            {/* Dot */}
            <span
              className={`absolute left-0 top-1.5 w-6 h-6 rounded-full
                          flex items-center justify-center text-white
                          ${tipoCfg.dot} shadow-sm`}
            >
              <Wrench size={11} />
            </span>

            <div
              onClick={onItemClick ? () => onItemClick(item) : undefined}
              className={`bg-white rounded-xl border border-slate-200
                          shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4
                          ${onItemClick ? "cursor-pointer hover:border-[#9F2241]/40 transition" : ""}`}
            >
              {/* Encabezado */}
              <div className="flex items-start justify-between gap-3">
                {onItemClick && (
                  <ChevronRight size={18} className="order-last text-slate-300 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800">
                      {item.folio}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tipoCfg.bg} ${tipoCfg.text}`}
                    >
                      {item.tipo}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full
                        ${completado ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                    >
                      {completado ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                      {item.estado}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                    {item.descripcion}
                  </p>
                </div>
              </div>

              {/* Metadata */}
              <div className="mt-3 pt-3 border-t border-slate-100
                              grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-slate-400">Fecha</p>
                  <p className="mt-0.5 font-medium text-slate-700">
                    {formatFecha(item.fecha)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Mecánico</p>
                  <p className="mt-0.5 font-medium text-slate-700 inline-flex items-center gap-1">
                    <User size={11} />
                    {item.mecanico}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Costo</p>
                  <p className="mt-0.5 font-medium text-slate-700 inline-flex items-center gap-1">
                    <DollarSign size={11} />
                    ${(item.costo || 0).toLocaleString("es-MX")}
                  </p>
                </div>
              </div>

              {/* Refacciones */}
              {item.refacciones && item.refacciones.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                    Refacciones utilizadas
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.refacciones.map((r, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] px-2 py-0.5 rounded-md
                                   bg-slate-100 text-slate-600 font-medium"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}