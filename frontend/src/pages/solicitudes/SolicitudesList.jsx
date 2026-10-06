// src/pages/solicitudes/SolicitudesList.jsx
// Solicitudes del mecánico:
//  - /mecanico/reparaciones  (las suyas)
//  - /mecanico/historial     (las que ya terminó)
import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import SolicitudesTable from "../../components/solicitudes/SolicitudesTable";
import { inputClass, Alerta } from "../../components/ui";
import { solicitudesApi } from "../../api/solicitudes";
import { MECANICO_MENU, MECANICO_SECONDARY_MENU } from "../../config/menus";
import { ESTADOS, PRIORIDADES } from "../../config/solicitudes";
import { Search, Loader2 } from "lucide-react";

const BASE = "/mecanico/reparaciones";
const FILTROS_INICIALES = { q: "", estado: "", prioridad: "" };

export default function SolicitudesList({
  titulo = "Solicitudes",
  subtitulo = "Ingresos a taller y su seguimiento",
  estadoFijo = "",   // ej. "cerradas" para el historial del mecánico
}) {

  const [filters, setFilters] = useState(FILTROS_INICIALES);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError("");

    const timer = setTimeout(() => {
      solicitudesApi
        .listar({ ...filters, estado: estadoFijo || filters.estado })
        .then((data) => !cancel && setItems(data))
        .catch((e) => !cancel && setError(e.message || "Error al cargar solicitudes"))
        .finally(() => !cancel && setLoading(false));
    }, 250);

    return () => {
      cancel = true;
      clearTimeout(timer);
    };
  }, [filters, estadoFijo]);

  const set = (campo) => (e) => setFilters((f) => ({ ...f, [campo]: e.target.value }));

  return (
    <DashboardLayout
      menu={MECANICO_MENU}
      secondaryMenu={MECANICO_SECONDARY_MENU}
      title={titulo}
      subtitle={subtitulo}
    >
      <div className="bg-white rounded-2xl border border-slate-200
                      shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4 mb-5">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={filters.q}
              onChange={set("q")}
              placeholder="Buscar por folio, placas, No. inventario, No. económico..."
              className={`${inputClass} pl-9`}
            />
          </div>

          {!estadoFijo && (
            <select value={filters.estado} onChange={set("estado")} className={`${inputClass} lg:w-44`}>
              <option value="">Todos los estados</option>
              <option value="abiertas">Abiertas (sin entregar)</option>
              {ESTADOS.map((e) => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>
          )}

          <select value={filters.prioridad} onChange={set("prioridad")} className={`${inputClass} lg:w-40`}>
            <option value="">Toda prioridad</option>
            {PRIORIDADES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>

        </div>
      </div>

      {error && (
        <Alerta className="mb-4">{error}</Alerta>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 size={28} className="animate-spin" />
          <span className="ml-3 text-sm">Cargando solicitudes...</span>
        </div>
      ) : (
        <SolicitudesTable
          items={items}
          basePath={BASE}
          mostrarMecanico={false}
          vacio={estadoFijo ? "Aún no tienes servicios terminados" : "No se encontraron solicitudes"}
        />
      )}
    </DashboardLayout>
  );
}
