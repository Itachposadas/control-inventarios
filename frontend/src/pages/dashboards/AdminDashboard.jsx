// src/pages/dashboards/AdminDashboard.jsx
import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { ADMIN_MENU, ADMIN_SECONDARY_MENU } from "../../config/menus";
import KpiCard from "../../components/dashboard/KpiCard";
import LineChartCard from "../../components/dashboard/LineChartCard";
import DonutCard from "../../components/dashboard/DonutCard";
import DataTable from "../../components/dashboard/DataTable";
import ActivityFeed from "../../components/dashboard/ActivityFeed";
import QuickActions from "../../components/dashboard/QuickActions";
import SolicitudesTable from "../../components/solicitudes/SolicitudesTable";
import { dashboardApi } from "../../api/dashboard";
import { solicitudesApi } from "../../api/solicitudes";
import { formatFecha } from "../../config/solicitudes";
import {
  ClipboardList, Wrench, CarFront, Loader2,
} from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [porEntregar, setPorEntregar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    dashboardApi
      .stats()
      .then(setStats)
      .catch((e) => {
        console.error("Error al cargar dashboard:", e);
        setError("No se pudieron cargar las estadísticas");
      })
      .finally(() => setLoading(false));

    // Servicios que el mecánico ya terminó: el admin captura costo y entrega
    solicitudesApi
      .listar({ estado: "completada" })
      .then(setPorEntregar)
      .catch(() => setPorEntregar([]));
  }, []);

  // Valores por defecto mientras carga
  const kpis = stats?.kpis || {
    solicitudes_abiertas: 0,
    en_reparacion: 0,
    total_vehiculos: 0,
    activos: 0,
    en_mantenimiento: 0,
  };

  const topAreas = stats?.top_areas?.slice(0, 6) || [];
  const porAnio = stats?.por_anio || [];
  const vehiculosPorArea = stats?.vehiculos_por_area || [];

  // Actividad real: últimos movimientos en solicitudes
  const activities = (stats?.actividad || []).map((e) => ({
    user: e.usuario,
    action: `${e.accion} · ${e.folio}`,
    time: formatFecha(e.fecha, true),
    dot: /Entregada|Completada/.test(e.accion)
      ? "bg-emerald-500"
      : e.accion.startsWith("Registró")
      ? "bg-[#9F2241]"
      : "bg-blue-500",
  }));

  return (
    <DashboardLayout
      menu={ADMIN_MENU}
      secondaryMenu={ADMIN_SECONDARY_MENU}
      title="Panel de control"
      subtitle="Resumen general del parque vehicular"
    >
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 size={28} className="animate-spin" />
          <span className="ml-3 text-sm">Cargando estadísticas...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg">
          {error}
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="stagger grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <KpiCard
              label="Servicios abiertos"
              value={kpis.solicitudes_abiertas}
              accent="#9F2241"
              icon={<ClipboardList size={20} />}
              status={
                kpis.por_entregar > 0
                  ? `${kpis.por_entregar} listas para entregar`
                  : `${kpis.en_reparacion} en reparación`
              }
              statusType={kpis.por_entregar > 0 ? "success" : "info"}
            />
            <KpiCard
              label="Vehículos en mantenimiento"
              value={kpis.en_mantenimiento}
              accent="#F59E0B"
              icon={<Wrench size={20} />}
              status={
                kpis.en_mantenimiento > 0
                  ? `${kpis.en_mantenimiento} en taller`
                  : "Sin vehículos en taller"
              }
              statusType="warning"
            />
            <KpiCard
              label="Vehículos activos"
              value={kpis.activos}
              accent="#16A34A"
              icon={<CarFront size={20} />}
              status={`${kpis.total_vehiculos} en total`}
              statusType="success"
            />
          </div>

          {/* Servicios listos para entregar */}
          {porEntregar.length > 0 && (
            <div className="mb-5">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-slate-800">
                  Servicios listos para entregar
                </h3>
                <p className="text-xs text-slate-500">
                  El mecánico ya los terminó. Ábrelos para capturar el costo y registrar la entrega.
                </p>
              </div>
              <SolicitudesTable items={porEntregar} basePath="/admin/solicitudes" />
            </div>
          )}

          {/* Acciones rápidas */}
          <div className="mb-5">
            <QuickActions />
          </div>

          {/* Gráficas */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
            <div className="xl:col-span-2">
              <LineChartCard data={porAnio} sinAnio={stats?.sin_anio || 0} />
            </div>
            <div>
              <DonutCard data={vehiculosPorArea} />
            </div>
          </div>

          {/* Tabla + actividad */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2">
              <DataTable
                title="Áreas con más vehículos"
                subtitle="Ranking por cantidad de unidades"
                rows={topAreas}
              />
            </div>
            <div>
              <ActivityFeed items={activities} />
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}