// src/pages/foraneas/OrdenesForaneas.jsx
// Apartado "Taller foráneo": órdenes de reparación en taller externo.
// Mecánico: ve las suyas y genera nuevas a partir de un ingreso a taller.
// Admin: consulta todas.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import { EstadoBadge } from "../../components/solicitudes/Badges";
import { inputClass } from "../../components/solicitudes/ui";
import { foraneasApi } from "../../api/foraneas";
import { solicitudesApi } from "../../api/solicitudes";
import { useAuth } from "../../context/AuthContext";
import { menusForRole } from "../../config/menus";
import { ROLES } from "../../config/roles";
import { TALLERES_FORANEOS, FORANEO_BASE } from "../../config/solicitudes";
import { fechaCorta } from "../../config/reportes";
import { Plus, Search, Loader2, Truck, X, CarFront, ChevronRight } from "lucide-react";

export default function OrdenesForaneas() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { menu, secondaryMenu } = menusForRole(role);
  const base = FORANEO_BASE[role];
  const esMecanico = role === ROLES.MECANICO;

  const [q, setQ] = useState("");
  const [entregadas, setEntregadas] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [eligiendo, setEligiendo] = useState(false);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    const timer = setTimeout(() => {
      foraneasApi
        .listar({ q, entregadas })
        .then((d) => !cancel && setItems(d))
        .catch((e) => !cancel && setError(e.message || "No se pudieron cargar las órdenes"))
        .finally(() => !cancel && setLoading(false));
    }, 250);
    return () => {
      cancel = true;
      clearTimeout(timer);
    };
  }, [q, entregadas]);

  return (
    <DashboardLayout
      menu={menu}
      secondaryMenu={secondaryMenu}
      title="Taller foráneo"
      subtitle="Órdenes de reparación en talleres externos"
    >
      <div className="mb-5 inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200">
        {[
          { valor: false, label: "En proceso" },
          { valor: true, label: "Entregadas" },
        ].map((t) => (
          <button
            key={t.label}
            onClick={() => setEntregadas(t.valor)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              entregadas === t.valor ? "bg-white text-institucional shadow-sm" : "text-slate-600 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por folio, vehículo, placas o taller..."
              className={`${inputClass} pl-9`}
            />
          </div>
          {esMecanico && (
            <button
              onClick={() => setEligiendo(true)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg
                         bg-institucional hover:bg-institucional-dark text-white text-sm font-semibold transition shrink-0"
            >
              <Plus size={16} />
              Nueva orden
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 size={28} className="animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Truck size={44} className="mx-auto text-slate-300" />
          <p className="mt-4 text-sm font-medium text-slate-700">
            {q
              ? "No se encontraron órdenes"
              : entregadas
              ? "Aún no hay órdenes de vehículos entregados"
              : "No hay órdenes de taller foráneo en proceso"}
          </p>
          {esMecanico && !q && !entregadas && (
            <p className="mt-1 text-xs text-slate-500">
              Se generan a partir de un ingreso a taller cuando la unidad se tiene que mandar a un taller externo.
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
                  <th className="text-left font-medium px-5 py-3">Folio</th>
                  <th className="text-left font-medium px-5 py-3">Vehículo</th>
                  <th className="text-left font-medium px-5 py-3">Remitido a</th>
                  <th className="text-left font-medium px-5 py-3">Ingreso</th>
                  <th className="text-left font-medium px-5 py-3">Fecha de remisión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => navigate(`${base}/${o.id}`)}
                    className="hover:bg-slate-50 transition cursor-pointer"
                  >
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-institucional whitespace-nowrap">{o.folio}</td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-800">{o.vehiculo.nombre}</p>
                      <p className="text-xs text-slate-500">
                        {[o.vehiculo.no_inventario, o.vehiculo.placas].filter(Boolean).join(" · ")}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {TALLERES_FORANEOS.filter((t) => o.talleres[t.key]).map((t) => (
                          <span key={t.key} className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            <span className="font-semibold">{t.label}:</span> {o.talleres[t.key]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="font-mono text-xs text-slate-500 mr-2">{o.solicitud.folio}</span>
                      <EstadoBadge estado={o.solicitud.estado} />
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">{fechaCorta(o.fecha_remision)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {eligiendo && <ElegirIngreso onClose={() => setEligiendo(false)} onElegir={(id) => navigate(`${base}/nueva?servicio=${id}`)} />}
    </DashboardLayout>
  );
}

// Ventana para elegir de qué ingreso a taller (en proceso) sale la orden
function ElegirIngreso({ onClose, onElegir }) {
  const [lista, setLista] = useState(null);

  useEffect(() => {
    solicitudesApi.listar({ estado: "en_taller" }).then(setLista).catch(() => setLista([]));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 animate-fade-in" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-pop bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col"
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-800">¿De qué ingreso a taller sale?</h3>
            <p className="text-xs text-slate-500 mt-0.5">Los datos del vehículo se toman de ese ingreso</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-2">
          {lista === null ? (
            <div className="flex justify-center py-10 text-slate-500"><Loader2 size={22} className="animate-spin" /></div>
          ) : lista.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500">
              No tienes vehículos en el taller. Primero registra el ingreso a taller.
            </p>
          ) : (
            <ul className="space-y-1">
              {lista.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => onElegir(s.id)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left hover:bg-slate-50 transition"
                  >
                    <span className="w-10 h-10 rounded-xl bg-institucional/10 text-institucional flex items-center justify-center shrink-0">
                      <CarFront size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-800 truncate">
                        {s.vehiculo?.numeroEconomico || s.vehiculo?.unidad || s.vehiculo?.noInventario}
                      </span>
                      <span className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-mono text-slate-500">{s.folio}</span>
                        <EstadoBadge estado={s.estado} />
                      </span>
                    </span>
                    <ChevronRight size={16} className="text-slate-300 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
