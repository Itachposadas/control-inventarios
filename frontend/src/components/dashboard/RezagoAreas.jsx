// src/components/dashboard/RezagoAreas.jsx
// Rezago de las áreas: envían la solicitud y no llevan la unidad al taller.
//  - Por vencer: solicitudes de 8 días o más que todavía no llegan (la primera vence antes).
//  - Áreas que dejaron vencer solicitudes en los últimos 30 días; desde 2 se marcan
//    como reincidentes para que Coordinación o el admin hablen con ellas.
//   <RezagoAreas bandeja="/mecanico/solicitudes-areas" />
//   <RezagoAreas bandeja="/admin/solicitudes-areas" sinPorVencer />  (el panel del admin ya las lista)
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarX, ChevronRight, Clock, CheckCircle2 } from "lucide-react";
import { peticionesApi } from "../../api/peticiones";
import { useAutoActualizar } from "../../hooks/useAutoActualizar";
import { textoVence, plazoDe, fechaCorta } from "../../config/espera";
import { formatFecha } from "../../config/solicitudes";

const MOSTRAR = 5;

export default function RezagoAreas({ bandeja, sinPorVencer = false }) {
  const navigate = useNavigate();
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    peticionesApi.rezago().then(setDatos).catch(() => setDatos(null));
  }, []);
  useAutoActualizar(() => peticionesApi.rezago().then(setDatos).catch(() => {}));

  if (!datos) return null;

  const porVencer = sinPorVencer ? [] : datos.por_vencer;
  const sinRezago = porVencer.length === 0 && datos.areas.length === 0;
  const maximo = Math.max(1, ...datos.areas.map((a) => a.vencidas));

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Rezago de las áreas</h2>
          <p className="text-xs text-slate-500">
            Solicitudes en las que el área no ha traído la unidad. A los {datos.dias_limite} días se cancelan solas.
          </p>
        </div>
        <div className="flex gap-2 text-xs font-semibold">
          {porVencer.length > 0 && (
            <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-900">
              {porVencer.length} por vencer
            </span>
          )}
          {datos.vencidas > 0 && (
            <span className="px-2 py-1 rounded-full bg-red-100 text-red-700">
              {datos.vencidas} {datos.vencidas === 1 ? "vencida" : "vencidas"} en {datos.dias} días
            </span>
          )}
        </div>
      </div>

      {sinRezago ? (
        <div className="px-5 py-8 text-center">
          <CheckCircle2 size={26} className="mx-auto text-emerald-600" />
          <p className="mt-2 text-sm font-semibold text-slate-800">Sin rezago</p>
          <p className="mt-0.5 text-sm text-slate-500">
            Ninguna solicitud está por vencer y ningún área dejó vencer solicitudes en {datos.dias} días.
          </p>
        </div>
      ) : (
        <div className={`grid grid-cols-1 ${!sinPorVencer ? "lg:grid-cols-2 lg:divide-x" : ""} divide-slate-100`}>
          {!sinPorVencer && (
            <div className="py-2">
              <h3 className="px-5 pt-2 pb-1 text-[11px] uppercase tracking-wide font-semibold text-slate-500">
                Por vencer · la unidad no ha llegado
              </h3>
              {porVencer.length === 0 ? (
                <p className="px-5 py-4 text-sm text-slate-500">Ninguna solicitud está por vencer.</p>
              ) : (
                <ul>
                  {porVencer.slice(0, MOSTRAR).map((p) => {
                    const { diasRestantes, vence } = plazoDe(p.fecha);
                    const urgente = diasRestantes <= 1;
                    return (
                      <li key={p.id}>
                        <button
                          onClick={() => navigate(bandeja)}
                          title={`Se cancela el ${fechaCorta(vence)}`}
                          className="w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-slate-50 transition"
                        >
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                            ${urgente ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-900"}`}>
                            <Clock size={16} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-slate-800 truncate">
                              <span className="font-mono text-[13px]">{p.folio}</span> · {p.vehiculo}
                            </span>
                            <span className="block text-xs text-slate-500 truncate">
                              {p.area} · enviada el {formatFecha(p.fecha)}
                            </span>
                          </span>
                          <span className={`text-xs font-semibold shrink-0 ${urgente ? "text-red-700" : "text-amber-900"}`}>
                            {textoVence(p.fecha)}
                          </span>
                          <ChevronRight size={16} className="text-slate-300 shrink-0" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {porVencer.length > MOSTRAR && (
                <button
                  onClick={() => navigate(bandeja)}
                  className="w-full px-5 py-2 text-sm font-medium text-institucional hover:bg-slate-50 transition text-left"
                >
                  Ver las {porVencer.length} por vencer
                </button>
              )}
            </div>
          )}

          <div className="py-2">
            <h3 className="px-5 pt-2 pb-1 text-[11px] uppercase tracking-wide font-semibold text-slate-500">
              Áreas que no trajeron la unidad · últimos {datos.dias} días
            </h3>
            {datos.areas.length === 0 ? (
              <p className="px-5 py-4 text-sm text-slate-500">Ningún área dejó vencer solicitudes.</p>
            ) : (
              <ul className="px-5 py-1 space-y-3">
                {datos.areas.slice(0, MOSTRAR).map((a) => (
                  <li key={a.area}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 min-w-0">
                        <CalendarX size={15} className="text-red-600 shrink-0" />
                        <span className="text-sm font-medium text-slate-800 truncate">{a.area}</span>
                        {a.reincidente && (
                          <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-semibold uppercase tracking-wide shrink-0">
                            Reincidente
                          </span>
                        )}
                      </span>
                      <span className="text-sm font-semibold text-slate-800 tabular-nums shrink-0">
                        {a.vencidas}
                        <span className="font-normal text-slate-500"> de {a.enviadas}</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden" aria-hidden>
                      <div
                        className={`h-full rounded-full ${a.reincidente ? "bg-red-500" : "bg-red-300"}`}
                        style={{ width: `${(a.vencidas / maximo) * 100}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">Última vencida el {formatFecha(a.ultima)}</p>
                  </li>
                ))}
              </ul>
            )}
            {datos.areas.length > MOSTRAR && (
              <p className="px-5 pt-2 text-xs text-slate-500">
                Y {datos.areas.length - MOSTRAR} {datos.areas.length - MOSTRAR === 1 ? "área más" : "áreas más"}.{sinPorVencer && " El detalle está en Reportes."}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
