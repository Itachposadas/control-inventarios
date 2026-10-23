// src/components/dashboard/AvisosPreventivo.jsx
// Unidades que deben volver a revisión (mantenimiento preventivo por fecha):
// vencidas y las que tocan pronto. Si no hay ninguna, no se muestra nada.
//   <AvisosPreventivo historial="/admin/historial" />
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { historialApi } from "../../api/historial";
import { formatFecha } from "../../config/solicitudes";
import { CalendarClock, ChevronRight } from "lucide-react";

const MOSTRAR = 5;

function cuando(a) {
  if (a.dias < 0) return `Vencido hace ${-a.dias} ${a.dias === -1 ? "día" : "días"}`;
  if (a.dias === 0) return "Toca hoy";
  return `En ${a.dias} ${a.dias === 1 ? "día" : "días"}`;
}

export default function AvisosPreventivo({ historial }) {
  const navigate = useNavigate();
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    historialApi.preventivo().then(setDatos).catch(() => setDatos(null));
  }, []);

  if (!datos || datos.avisos.length === 0) return null;

  return (
    <div className="mb-5 bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Mantenimiento preventivo</h2>
          <p className="text-xs text-slate-500">
            Cada unidad debe revisarse {datos.meses} meses después de su último servicio entregado.
          </p>
        </div>
        <div className="flex gap-2 text-xs font-semibold">
          {datos.vencidos > 0 && (
            <span className="px-2 py-1 rounded-full bg-red-100 text-red-700">
              {datos.vencidos} {datos.vencidos === 1 ? "vencido" : "vencidos"}
            </span>
          )}
          {datos.proximos > 0 && (
            <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-900">
              {datos.proximos} {datos.proximos === 1 ? "próximo" : "próximos"}
            </span>
          )}
        </div>
      </div>
      <ul className="divide-y divide-slate-100">
        {datos.avisos.slice(0, MOSTRAR).map((a) => {
          const vencido = a.estado === "vencido";
          return (
            <li key={a.id}>
              <button
                onClick={() => navigate(`${historial}?vehiculo=${a.id}`)}
                className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-slate-50 transition"
              >
                <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0
                  ${vencido ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-900"}`}>
                  <CalendarClock size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-800 truncate">{a.nombre}</span>
                  <span className="block text-xs text-slate-500 truncate">
                    {[a.area, a.placas].filter(Boolean).join(" · ")} · Último servicio {formatFecha(a.ultimo_servicio)}
                  </span>
                </span>
                <span className={`text-xs font-semibold shrink-0 ${vencido ? "text-red-700" : "text-amber-900"}`}>
                  {cuando(a)}
                </span>
                <ChevronRight size={18} className="text-slate-300 shrink-0" />
              </button>
            </li>
          );
        })}
      </ul>
      {datos.avisos.length > MOSTRAR && (
        <button
          onClick={() => navigate(`${historial}?preventivo=avisos`)}
          className="w-full px-5 py-3 text-sm font-medium text-institucional hover:bg-slate-50 border-t border-slate-100 rounded-b-2xl"
        >
          Ver las {datos.avisos.length} unidades con aviso
        </button>
      )}
    </div>
  );
}
