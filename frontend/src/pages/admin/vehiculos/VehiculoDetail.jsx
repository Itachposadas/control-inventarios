// src/pages/admin/vehiculos/VehiculoDetail.jsx
// Detalle + historial de servicios.
//  - Admin: edita/elimina el vehículo y abre los servicios para costo y entrega.
//  - Mecánico: consulta el historial y registra el ingreso a taller.
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../../../layouts/DashboardLayout";
import { menusForRole } from "../../../config/menus";
import { ROLES, VEHICULOS_BASE } from "../../../config/roles";
import { SOLICITUDES_BASE } from "../../../config/solicitudes";
import { useAuth } from "../../../context/AuthContext";
import StatsVehiculo from "../../../components/vehiculos/StatsVehiculo";
import HistorialTimeline from "../../../components/vehiculos/HistorialTimeline";
import VehiculoModal from "../../../components/vehiculos/VehiculoModal";
import ConfirmModal from "../../../components/ConfirmModal";
import { vehiculosApi } from "../../../api/vehiculos";
import {
  Car, ArrowLeft, CarFront, Hash, Tag, KeyRound, Wrench as WrenchIcon,
  CircleDot, Calendar, Loader2, Pencil, Trash2, ClipboardPlus, } from "lucide-react";

import { Boton } from "../../../components/ui";
export default function VehiculoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const { menu, secondaryMenu } = menusForRole(role);
  const esAdmin = role === ROLES.ADMIN;
  const esMecanico = role === ROLES.MECANICO;
  const basePath = VEHICULOS_BASE[role];

  const [vehiculo, setVehiculo] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, loading: false, error: "" });

  useEffect(() => {
    setLoading(true);
    setError("");

    Promise.all([
      vehiculosApi.obtener(id),
      vehiculosApi.historial(id).catch(() => []),
    ])
      .then(([v, h]) => {
        setVehiculo(v);
        setHistorial(h);
      })
      .catch((e) => {
        console.error("Error cargando vehículo:", e);
        setError("No se pudo cargar el vehículo");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async (payload) => {
    const actualizado = await vehiculosApi.editar(id, payload);
    setVehiculo(actualizado);
  };

  const handleDelete = async () => {
    setDeleteModal((s) => ({ ...s, loading: true, error: "" }));
    try {
      await vehiculosApi.eliminar(id);
      navigate(basePath, { replace: true });
    } catch (e) {
      setDeleteModal((s) => ({
        ...s,
        loading: false,
        error: e?.response?.data?.msg || "Error al eliminar el vehículo",
      }));
    }
  };

  // Stats calculados desde el historial real
  const stats = {
    total: historial.length,
    completados: historial.filter((h) => h.estado === "Completado").length,
    enProceso: historial.filter((h) => h.estado === "En proceso").length,
    costoTotal: historial.reduce((s, h) => s + (h.costo || 0), 0),
  };

  if (loading) {
    return (
      <DashboardLayout menu={menu} secondaryMenu={secondaryMenu} title="Vehículo">
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 size={28} className="animate-spin" />
          <span className="ml-3 text-sm">Cargando vehículo...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !vehiculo) {
    return (
      <DashboardLayout menu={menu} secondaryMenu={secondaryMenu} title="Vehículo">
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <CarFront size={48} className="mx-auto text-slate-300" />
          <p className="mt-4 text-sm font-medium text-slate-700">
            {error || "Vehículo no encontrado"}
          </p>
          <button
            onClick={() => navigate(basePath)}
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium
                       text-institucional hover:underline"
          >
            <ArrowLeft size={14} />
            Volver al catálogo
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const estadoConfig = {
    activo:        { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", label: "Activo" },
    mantenimiento: { dot: "bg-amber-500",   text: "text-amber-700",   bg: "bg-amber-50",   label: "En mantenimiento" },
    baja:          { dot: "bg-red-500",     text: "text-red-700",     bg: "bg-red-50",     label: "Baja" },
  };
  const estado = estadoConfig[vehiculo.estado] || estadoConfig.activo;

  // Ficha técnica SIN kilometraje
  const ficha = [
    { label: "N.P.",            value: vehiculo.np ?? "—",                icon: <Hash size={14} />, mono: true },
    { label: "No. Inventario",  value: vehiculo.noInventario || "—",      icon: <Hash size={14} />, mono: true },
    { label: "No. Económico",   value: vehiculo.numeroEconomico || "—",   icon: <Tag size={14} />, mono: true },
    { label: "Unidad",          value: vehiculo.unidad || "—",            icon: <Car size={14} /> },
    { label: "Marca",           value: vehiculo.marca || "—",             icon: <Car size={14} /> },
    { label: "Modelo / Año",    value: vehiculo.modelo || "—",            icon: <Calendar size={14} /> },
    { label: "Serie (VIN)",     value: vehiculo.serie || "—",             icon: <KeyRound size={14} />, mono: true },
    { label: "No. Motor",       value: vehiculo.noMotor || "—",           icon: <WrenchIcon size={14} />, mono: true },
    { label: "Placas",          value: vehiculo.placas || "S/P",          icon: <CircleDot size={14} />, mono: true },
  ];

  return (
    <DashboardLayout
      menu={menu}
      secondaryMenu={secondaryMenu}
      title="Detalle del vehículo"
      subtitle={vehiculo.numeroEconomico || vehiculo.unidad}
    >
      <button
        onClick={() => navigate(basePath)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium
                   text-slate-600 hover:text-institucional transition"
      >
        <ArrowLeft size={16} />
        Volver al catálogo
      </button>

      {/* Encabezado del vehículo */}
      <div className="bg-white rounded-2xl border border-slate-200
                      shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-6 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-institucional/10
                          flex items-center justify-center text-institucional shrink-0">
            <CarFront size={32} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-slate-800">
                {vehiculo.numeroEconomico || vehiculo.unidad || "Sin unidad"}
              </h2>
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${estado.bg} ${estado.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${estado.dot}`} />
                {estado.label}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500 truncate">
              {vehiculo.descripcion}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Área: <span className="font-medium text-slate-600">{vehiculo.area}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Solo el mecánico registra el ingreso a taller */}
            {esMecanico && vehiculo.estado === "activo" && (
              <Boton
                onClick={() => navigate(`/mecanico/reparaciones/nueva?vehiculo=${vehiculo.id}`)}
                icono={<ClipboardPlus size={15} />}
              >
                Registrar ingreso a taller
              </Boton>
            )}
            {esMecanico && vehiculo.estado === "mantenimiento" && (
              <span className="text-xs font-medium text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                Ya está en el taller
              </span>
            )}
            {esAdmin && (
              <>
                <button
                  onClick={() => setModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg
                             border border-slate-200 text-sm font-medium text-slate-700
                             hover:bg-slate-50 hover:text-institucional transition"
                >
                  <Pencil size={15} />
                  Editar
                </button>
                <button
                  onClick={() => setDeleteModal({ open: true, loading: false, error: "" })}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg
                             border border-red-200 text-sm font-medium text-red-600
                             hover:bg-red-50 transition"
                >
                  <Trash2 size={15} />
                  Eliminar
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Ficha técnica */}
        <div className="lg:col-span-1 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200
                          shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">Ficha técnica</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Datos de identificación del vehículo
              </p>
            </div>
            <ul className="divide-y divide-slate-100">
              {ficha.map((row) => (
                <li key={row.label} className="px-5 py-3 flex items-start gap-3">
                  <span className="w-8 h-8 rounded-lg bg-slate-100
                                   flex items-center justify-center text-slate-500 shrink-0 mt-0.5">
                    {row.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
                      {row.label}
                    </p>
                    <p className={`mt-0.5 text-sm text-slate-800 break-all ${row.mono ? "font-mono" : ""}`}>
                      {row.value}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Stats + historial */}
        <div className="lg:col-span-2 space-y-5">
          <StatsVehiculo stats={stats} />

          <div className="bg-white rounded-2xl border border-slate-200
                          shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  Historial de servicios
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {esAdmin
                    ? "Abre un servicio para capturar el costo y registrar la entrega"
                    : "Abre un servicio para ver su detalle"}
                </p>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full
                               bg-slate-100 text-slate-600">
                {historial.length} {historial.length === 1 ? "registro" : "registros"}
              </span>
            </div>
            <div className="p-5">
              <HistorialTimeline
                items={historial}
                onItemClick={(h) => navigate(`${SOLICITUDES_BASE[role]}/${h.solicitudId}`)}
              />
            </div>
          </div>
        </div>
      </div>

      {esAdmin && (
        <VehiculoModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          vehiculo={vehiculo}
        />
      )}

      <ConfirmModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, loading: false, error: "" })}
        onConfirm={handleDelete}
        loading={deleteModal.loading}
        title="¿Eliminar vehículo?"
      >
        Vas a eliminar{" "}
        <strong className="text-slate-700">
          {vehiculo.numeroEconomico || vehiculo.noInventario}
        </strong>
        . Esta acción no se puede deshacer.
        {deleteModal.error && (
          <p className="mt-3 text-red-600">{deleteModal.error}</p>
        )}
      </ConfirmModal>
    </DashboardLayout>
  );
}