// src/pages/dashboards/MecanicoDashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import { MECANICO_MENU, MECANICO_SECONDARY_MENU } from "../../config/menus";
import KpiCard from "../../components/dashboard/KpiCard";
import SolicitudesTable from "../../components/solicitudes/SolicitudesTable";
import { solicitudesApi } from "../../api/solicitudes";
import {
  Wrench, CheckCircle2, ClipboardList, Stethoscope, Loader2, Plus,
} from "lucide-react";

const ACTIVAS = ["recibida", "diagnostico", "reparacion"];
const SIETE_DIAS = 7 * 24 * 60 * 60 * 1000;

export default function MecanicoDashboard() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // El backend ya devuelve solo las solicitudes asignadas a este mecánico
    solicitudesApi
      .listar()
      .then(setItems)
      .catch((e) => setError(e.message || "No se pudieron cargar tus reparaciones"))
      .finally(() => setLoading(false));
  }, []);

  const activas = items.filter((s) => ACTIVAS.includes(s.estado));
  const porDiagnosticar = items.filter((s) => ["recibida", "diagnostico"].includes(s.estado)).length;
  const enReparacion = items.filter((s) => s.estado === "reparacion").length;
  const terminadasSemana = items.filter(
    (s) =>
      ["completada", "entregada"].includes(s.estado) &&
      Date.now() - new Date(`${s.updated_at}Z`).getTime() < SIETE_DIAS
  ).length;

  return (
    <DashboardLayout
      menu={MECANICO_MENU}
      secondaryMenu={MECANICO_SECONDARY_MENU}
      title="Panel de control"
      subtitle="Tus reparaciones asignadas"
    >
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 size={28} className="animate-spin" />
          <span className="ml-3 text-sm">Cargando...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg">
          {error}
        </div>
      ) : (
        <>
          <div className="stagger grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <KpiCard
              label="Reparaciones activas"
              value={activas.length}
              accent="#9F2241"
              icon={<ClipboardList size={22} />}
              status="Asignadas a ti"
              statusType="info"
            />
            <KpiCard
              label="Por diagnosticar"
              value={porDiagnosticar}
              accent="#F59E0B"
              icon={<Stethoscope size={22} />}
              status="Recibidas o en diagnóstico"
              statusType="warning"
            />
            <KpiCard
              label="En reparación"
              value={enReparacion}
              accent="#2563EB"
              icon={<Wrench size={22} />}
              status="Trabajando en ellas"
              statusType="info"
            />
            <KpiCard
              label="Terminadas"
              value={terminadasSemana}
              accent="#16A34A"
              icon={<CheckCircle2 size={22} />}
              status="Últimos 7 días"
              statusType="success"
            />
          </div>

          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Mis reparaciones activas</h3>
              <p className="text-xs text-slate-500">Haz clic en una para capturar su avance</p>
            </div>
            <button
              onClick={() => navigate("/mecanico/reparaciones/nueva")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg
                         bg-[#9F2241] hover:bg-[#7d1a33] text-white text-sm font-semibold transition"
            >
              <Plus size={16} />
              Nuevo ingreso a taller
            </button>
          </div>

          <SolicitudesTable
            items={activas}
            basePath="/mecanico/reparaciones"
            mostrarMecanico={false}
            vacio="No tienes reparaciones activas"
          />
        </>
      )}
    </DashboardLayout>
  );
}
