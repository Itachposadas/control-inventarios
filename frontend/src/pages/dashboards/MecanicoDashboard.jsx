// src/pages/dashboards/MecanicoDashboard.jsx
// Inicio del mecánico: botones grandes para lo que más hace y, por cada
// vehículo que tiene en el taller, qué le toca hacer ahora.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import { MECANICO_MENU, MECANICO_SECONDARY_MENU } from "../../config/menus";
import { EstadoBadge } from "../../components/solicitudes/Badges";
import { solicitudesApi } from "../../api/solicitudes";
import { pasoSiguiente } from "../../config/solicitudes";
import { useAuth } from "../../context/AuthContext";
import {
  ClipboardPlus, Camera, Hammer, Loader2, CarFront, ChevronRight, CheckCircle2,
} from "lucide-react";

import { Alerta } from "../../components/ui";
const ACTIVAS = ["recibida", "diagnostico", "reparacion"];

const ACCIONES = [
  {
    to: "/mecanico/reparaciones/nueva",
    icon: <ClipboardPlus size={28} />,
    titulo: "Llegó un vehículo",
    texto: "Registrar ingreso a taller",
    principal: true,
  },
  {
    to: "/mecanico/evidencia",
    icon: <Camera size={28} />,
    titulo: "Tomar fotos",
    texto: "Llegada, reparación y final",
  },
  {
    to: "/mecanico/herramientas",
    icon: <Hammer size={28} />,
    titulo: "Prestar herramientas",
    texto: "Anotar o recibir herramientas",
  },
];

export default function MecanicoDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // El backend ya devuelve solo los servicios asignados a este mecánico
    solicitudesApi
      .listar()
      .then(setItems)
      .catch((e) => setError(e.message || "No se pudieron cargar tus reparaciones"))
      .finally(() => setLoading(false));
  }, []);

  const activas = items.filter((s) => ACTIVAS.includes(s.estado));
  const nombre = (user?.nombre_completo || user?.username || "").split(" ")[0];

  return (
    <DashboardLayout
      menu={MECANICO_MENU}
      secondaryMenu={MECANICO_SECONDARY_MENU}
      title={nombre ? `Hola, ${nombre}` : "Inicio"}
      subtitle="¿Qué vas a hacer?"
    >
      <div className="stagger grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {ACCIONES.map((a) => (
          <button
            key={a.to}
            onClick={() => navigate(a.to)}
            className={`flex items-center gap-4 p-5 rounded-2xl text-left transition border-2
              ${a.principal
                ? "bg-institucional border-institucional text-white hover:bg-institucional-dark"
                : "bg-white border-slate-200 text-slate-800 hover:border-institucional/40"}`}
          >
            <span
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0
                ${a.principal ? "bg-white/15" : "bg-institucional/10 text-institucional"}`}
            >
              {a.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-lg font-bold leading-tight">{a.titulo}</span>
              <span className={`block text-sm mt-0.5 ${a.principal ? "text-white/85" : "text-slate-500"}`}>
                {a.texto}
              </span>
            </span>
          </button>
        ))}
      </div>

      <h3 className="text-base font-bold text-slate-800">Mis vehículos en el taller</h3>
      <p className="text-sm text-slate-500 mb-3">Toca uno para seguir con su reparación</p>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 size={28} className="animate-spin" />
          <span className="ml-3 text-sm">Cargando...</span>
        </div>
      ) : error ? (
        <Alerta>{error}</Alerta>
      ) : activas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <CheckCircle2 size={40} className="mx-auto text-emerald-600" />
          <p className="mt-3 text-base font-medium text-slate-700">No tienes vehículos pendientes</p>
          <p className="mt-1 text-sm text-slate-500">Cuando llegue uno, toca “Llegó un vehículo”.</p>
        </div>
      ) : (
        <ul className="stagger grid grid-cols-1 lg:grid-cols-2 gap-3">
          {activas.map((s) => {
            const n = (s.fotos_tipos || []).length;
            return (
              <li key={s.id}>
                <button
                  onClick={() => navigate(`/mecanico/reparaciones/${s.id}`)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-200
                             text-left hover:border-institucional/40 hover:shadow-sm transition"
                >
                  <span className="w-12 h-12 rounded-xl bg-institucional/10 text-institucional flex items-center justify-center shrink-0">
                    <CarFront size={24} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-slate-800 truncate">
                        {s.vehiculo?.numeroEconomico || s.vehiculo?.unidad || s.vehiculo?.noInventario}
                      </span>
                      <EstadoBadge estado={s.estado} />
                    </span>
                    <span className="block text-sm text-institucional font-medium mt-1">
                      {pasoSiguiente(s).texto}
                    </span>
                    <span className="block text-xs text-slate-500 mt-0.5">
                      {[s.vehiculo?.placas, s.vehiculo?.area].filter(Boolean).join(" · ")}
                      {" · "}
                      <Camera size={11} className="inline -mt-px" /> {n} de 3 fotos
                    </span>
                  </span>
                  <ChevronRight size={20} className="text-slate-300 shrink-0" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardLayout>
  );
}
