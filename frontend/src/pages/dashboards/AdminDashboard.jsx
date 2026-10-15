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
import { useNavigate } from "react-router-dom";
import { dashboardApi } from "../../api/dashboard";
import { ordenesCompraApi } from "../../api/ordenesCompra";
import { formatFecha } from "../../config/solicitudes";
import {
  ClipboardList, Wrench, CarFront, Loader2, ShoppingCart, ChevronRight,
} from "lucide-react";
import { COLORS } from "../../config/colors";

import { Alerta } from "../../components/ui";
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [porAtender, setPorAtender] = useState([]);
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

    // Órdenes de compra que mandó parque vehicular y falta atender
    ordenesCompraApi
      .listar({ estado: "enviada" })
      .then(setPorAtender)
      .catch(() => setPorAtender([]));
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
    dot: /Entregada|Completada|entrega/.test(e.accion)
      ? "bg-emerald-500"
      : e.accion.startsWith("Registró")
      ? "bg-institucional"
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
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 size={28} className="animate-spin" />
          <span className="ml-3 text-sm">Cargando estadísticas...</span>
        </div>
      ) : error ? (
        <Alerta>{error}</Alerta>
      ) : (
        <>
          {/* KPIs */}
          <div className="stagger grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <KpiCard
              label="Servicios abiertos"
              value={kpis.solicitudes_abiertas}
              accent={COLORS.institucional}
              icon={<ClipboardList size={20} />}
              status={
                kpis.ordenes_por_atender > 0
                  ? `${kpis.ordenes_por_atender} ${kpis.ordenes_por_atender === 1 ? "orden de compra" : "órdenes de compra"} por atender`
                  : `${kpis.en_reparacion} en reparación`
              }
              statusType={kpis.ordenes_por_atender > 0 ? "warning" : "info"}
            />
            <KpiCard
              label="Vehículos en mantenimiento"
              value={kpis.en_mantenimiento}
              accent={COLORS.warning}
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
              accent={COLORS.success}
              icon={<CarFront size={20} />}
              status={`${kpis.total_vehiculos} en total`}
              statusType="success"
            />
          </div>

          {/* Órdenes de compra por atender */}
          {porAtender.length > 0 && (
            <div className="mb-5 bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800">Órdenes de compra por atender</h3>
                <p className="text-xs text-slate-500">
                  Parque vehicular espera el proveedor y los precios para seguir con la reparación.
                </p>
              </div>
              <ul className="divide-y divide-slate-100">
                {porAtender.slice(0, 5).map((o) => (
                  <li key={o.id}>
                    <button
                      onClick={() => navigate("/admin/ordenes-compra")}
                      className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-slate-50 transition"
                    >
                      <span className="w-9 h-9 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                        <ShoppingCart size={17} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-800">
                          <span className="font-mono">{o.folio}</span> · {o.vehiculo?.nombre}
                        </span>
                        <span className="block text-xs text-slate-500 truncate">
                          {o.vehiculo?.area} · {o.piezas.length} {o.piezas.length === 1 ? "refacción" : "refacciones"} · {formatFecha(o.fecha, true)}
                        </span>
                      </span>
                      <ChevronRight size={18} className="text-slate-300 shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
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