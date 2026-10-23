// src/pages/dashboards/AdminDashboard.jsx
// Panel de control del admin. Contesta primero "¿qué tengo que atender?":
// estado del taller en una franja y, debajo, lo que espera una acción
// (órdenes de compra y solicitudes de las áreas). Al final, las gráficas del
// parque vehicular (vehículos por año y por área).
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAutoActualizar } from "../../hooks/useAutoActualizar";
import DashboardLayout from "../../layouts/DashboardLayout";
import { ADMIN_MENU, ADMIN_SECONDARY_MENU } from "../../config/menus";
import ActivityFeed from "../../components/dashboard/ActivityFeed";
import LineChartCard from "../../components/dashboard/LineChartCard";
import DonutCard from "../../components/dashboard/DonutCard";
import DataTable from "../../components/dashboard/DataTable";
import AvisosPreventivo from "../../components/dashboard/AvisosPreventivo";
import { dashboardApi } from "../../api/dashboard";
import { ordenesCompraApi } from "../../api/ordenesCompra";
import { ESTADOS, formatFecha } from "../../config/solicitudes";
import { PRIORIDADES_ESPERA, prioridadPorEspera, tiempoEsperando } from "../../config/espera";
import { moneda } from "../../config/reportes";
import { Alerta } from "../../components/ui";
import { Loader2, ShoppingCart, ChevronRight, CheckCircle2 } from "lucide-react";

// Los primeros 4 pasos del servicio (el 5.º, entregada, ya no está en taller)
const PASOS_TALLER = ESTADOS.filter((e) => e.value !== "entregada");

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
        setError("No se pudo cargar el panel de control");
      })
      .finally(() => setLoading(false));

    // Órdenes de compra que mandó parque vehicular y falta atender
    ordenesCompraApi
      .listar({ estado: "enviada" })
      .then(setPorAtender)
      .catch(() => setPorAtender([]));
  }, []);

  // Se actualiza solo con lo que hacen los demás usuarios
  useAutoActualizar(() =>
    Promise.all([
      dashboardApi.stats().then(setStats),
      ordenesCompraApi.listar({ estado: "enviada" }).then(setPorAtender),
    ]).catch(() => {})
  );

  const kpis = stats?.kpis || {};
  const pendientes = stats?.pendientes || [];
  const totalPendientes = kpis.pendientes || 0;

  // Cuántas pendientes hay de cada prioridad (por días de espera)
  const porPrioridad = {};
  (stats?.fechas_pendientes || []).forEach((f) => {
    const p = prioridadPorEspera(f);
    porPrioridad[p.valor] = (porPrioridad[p.valor] || 0) + 1;
  });

  const pasos = stats?.en_taller_por_paso || {};
  const mes = stats?.mes;

  return (
    <DashboardLayout
      menu={ADMIN_MENU}
      secondaryMenu={ADMIN_SECONDARY_MENU}
      title="Panel de control"
      subtitle="Lo que espera atención en el taller"
    >
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 size={28} className="animate-spin" />
          <span className="ml-3 text-sm">Cargando panel...</span>
        </div>
      ) : error ? (
        <Alerta>{error}</Alerta>
      ) : (
        <>
          {/* ─── Estado del taller: una franja, cuatro cifras distintas ─── */}
          {/* Rejilla de 1 px: el fondo gris asoma entre las celdas blancas como divisor */}
          <section aria-label="Estado del taller" className="mb-5 rounded-2xl border border-slate-200 overflow-hidden
                     grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200">
            <Cifra
              etiqueta="Solicitudes pendientes"
              valor={totalPendientes}
              onClick={() => navigate("/admin/solicitudes-areas")}
              detalle={
                totalPendientes === 0 ? "Ninguna en espera" : (
                  <span className="flex flex-wrap gap-x-3 gap-y-1">
                    {PRIORIDADES_ESPERA.filter((p) => porPrioridad[p.valor]).map((p) => (
                      <span key={p.valor} className="inline-flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${p.punto}`} />
                        {porPrioridad[p.valor]} {p.label.toLowerCase()}
                      </span>
                    ))}
                  </span>
                )
              }
            />
            <Cifra
              etiqueta="Vehículos en taller"
              valor={kpis.solicitudes_abiertas || 0}
              detalle={
                kpis.solicitudes_abiertas
                  ? PASOS_TALLER.filter((p) => pasos[p.value]).map((p) => `${pasos[p.value]} en ${p.label.toLowerCase()}`).join(" · ")
                  : "Ninguno en este momento"
              }
            />
            <Cifra
              etiqueta="Órdenes de compra por atender"
              valor={porAtender.length}
              onClick={() => navigate("/admin/ordenes-compra")}
              detalle={porAtender.length ? "Esperan proveedor y precios" : "Ninguna pendiente"}
            />
            <Cifra
              etiqueta="Gasto del mes"
              valor={mes ? moneda(mes.gasto_total, 0) : "—"}
              onClick={() => navigate("/admin/reportes")}
              detalle={mes ? `${mes.servicios} ${mes.servicios === 1 ? "servicio ingresado" : "servicios ingresados"} · ${mes.terminados} ${mes.terminados === 1 ? "terminado" : "terminados"}` : ""}
            />
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
            <div className="xl:col-span-2 space-y-5">
              {/* ─── Requiere atención ─── */}
              <section className="bg-white rounded-2xl border border-slate-200">
                <div className="px-5 py-4 border-b border-slate-100 flex items-baseline justify-between gap-3">
                  <h2 className="text-base font-semibold text-slate-900">Requiere atención</h2>
                  {(porAtender.length + totalPendientes) > 0 && (
                    <span className="text-sm text-slate-500 tabular-nums">
                      {porAtender.length + totalPendientes} {porAtender.length + totalPendientes === 1 ? "pendiente" : "pendientes"}
                    </span>
                  )}
                </div>

                {porAtender.length === 0 && pendientes.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <CheckCircle2 size={28} className="mx-auto text-emerald-600" />
                    <p className="mt-3 text-sm font-semibold text-slate-800">Todo al día</p>
                    <p className="mt-1 text-sm text-slate-500">
                      No hay solicitudes de las áreas ni órdenes de compra esperando.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {/* Primero las órdenes de compra: detienen una reparación ya empezada */}
                    {porAtender.slice(0, 5).map((o) => (
                      <li key={`oc-${o.id}`}>
                        <Fila
                          onClick={() => navigate("/admin/ordenes-compra")}
                          marca={<ShoppingCart size={16} className="text-amber-900" />}
                          titulo={<><span className="font-mono text-[13px]">{o.folio}</span> · {o.vehiculo?.nombre}</>}
                          detalle={`Orden de compra · ${o.vehiculo?.area || ""} · ${o.piezas.length} ${o.piezas.length === 1 ? "refacción" : "refacciones"}`}
                          lado={<span className="text-amber-900">{formatFecha(o.fecha)}</span>}
                        />
                      </li>
                    ))}
                    {pendientes.map((p) => {
                      const prio = prioridadPorEspera(p.fecha);
                      return (
                        <li key={`pet-${p.id}`}>
                          <Fila
                            onClick={() => navigate("/admin/solicitudes-areas")}
                            marca={<span className={`w-2.5 h-2.5 rounded-full ${prio.punto}`} aria-hidden />}
                            titulo={<><span className="font-mono text-[13px]">{p.folio}</span> · {p.vehiculo}</>}
                            detalle={`Solicitud · ${p.area || ""} · ${p.materiales} ${p.materiales === 1 ? "material" : "materiales"}`}
                            lado={
                              <span className={prio.valor === "alta" ? "text-red-700" : prio.valor === "media" ? "text-amber-900" : "text-slate-500"}>
                                {tiempoEsperando(p.fecha)}
                                <span className="sr-only"> · prioridad {prio.label.toLowerCase()}</span>
                              </span>
                            }
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}

                {totalPendientes > pendientes.length && (
                  <button
                    onClick={() => navigate("/admin/solicitudes-areas")}
                    className="w-full px-5 py-3 text-sm font-medium text-institucional hover:bg-slate-50
                               border-t border-slate-100 rounded-b-2xl transition"
                  >
                    Ver las {totalPendientes} solicitudes pendientes
                  </button>
                )}
              </section>

              {/* Unidades que deben volver a revisión (solo aparece si hay alguna) */}
              <AvisosPreventivo historial="/admin/historial" />
            </div>

            <ActivityFeed
              items={(stats?.actividad || []).map((e) => ({
                id: e.id,
                accion: e.accion,
                folio: e.folio,
                usuario: e.usuario,
                fecha: formatFecha(e.fecha, true),
                onClick: () => navigate(`/admin/solicitudes/${e.solicitud_id}`),
              }))}
            />
          </div>

          {/* ─── Parque vehicular ─── */}
          <div className="mt-5 grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2">
              <LineChartCard data={stats?.por_anio || []} sinAnio={stats?.sin_anio || 0} />
            </div>
            <DonutCard data={stats?.vehiculos_por_area || []} />
          </div>
          <div className="mt-5">
            <DataTable
              title="Áreas con más vehículos"
              subtitle="Ranking por cantidad de unidades"
              rows={(stats?.top_areas || []).slice(0, 6)}
            />
          </div>
        </>
      )}
    </DashboardLayout>
  );
}

/* ───── Piezas ───── */

// Una cifra de la franja de estado. Si tiene destino, toda la celda es el enlace.
function Cifra({ etiqueta, valor, detalle, onClick }) {
  const contenido = (
    <>
      <span className="block text-sm text-slate-600">{etiqueta}</span>
      <span className="mt-1 block text-3xl font-semibold text-slate-900 tabular-nums tracking-tight">{valor}</span>
      {detalle && <span className="mt-1.5 block text-xs text-slate-500 leading-snug">{detalle}</span>}
    </>
  );
  const clase = "bg-white text-left px-5 py-4 min-w-0";
  return onClick ? (
    <button onClick={onClick} className={`${clase} hover:bg-slate-50 transition
                                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-institucional/40`}>
      {contenido}
    </button>
  ) : (
    <div className={clase}>{contenido}</div>
  );
}

function Fila({ onClick, marca, titulo, detalle, lado }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50 transition
                 focus-visible:outline-none focus-visible:bg-slate-50"
    >
      <span className="w-5 flex items-center justify-center shrink-0">{marca}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-800 truncate">{titulo}</span>
        <span className="block text-xs text-slate-500 truncate">{detalle}</span>
        {/* En celular el tiempo va abajo para no cortar el título */}
        <span className="sm:hidden block mt-0.5 text-xs font-medium">{lado}</span>
      </span>
      <span className="hidden sm:inline text-xs font-medium shrink-0 text-right">{lado}</span>
      <ChevronRight size={18} className="text-slate-400 shrink-0" aria-hidden />
    </button>
  );
}
