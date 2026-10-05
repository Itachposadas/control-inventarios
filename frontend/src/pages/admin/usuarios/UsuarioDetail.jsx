// src/pages/admin/usuarios/UsuarioDetail.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../../../layouts/DashboardLayout";
import { ADMIN_MENU, ADMIN_SECONDARY_MENU } from "../../../config/menus";
import UsuarioModal from "../../../components/usuarios/UsuarioModal";
import { usuariosApi } from "../../../api/usuarios";
import {
  Users, ArrowLeft, Mail, User as UserIcon, Shield, Package, Wrench,
  Calendar, CheckCircle2, XCircle, Loader2, Pencil,
} from "lucide-react";

const ROLE_CONFIG = {
  admin:    { label: "Administrador", color: "bg-institucional/10 text-institucional", icon: <Shield size={16} /> },
  // Rol retirado; solo para mostrar cuentas antiguas
  almacen:  { label: "Almacén (sin acceso)", color: "bg-slate-100 text-slate-500", icon: <Package size={16} /> },
  mecanico: { label: "Mecánico",      color: "bg-emerald-100 text-emerald-700", icon: <Wrench size={16} /> },
};

export default function UsuarioDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    usuariosApi
      .obtener(id)
      .then(setUsuario)
      .catch(() => setError("No se pudo cargar el usuario"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async (payload) => {
    await usuariosApi.editar(id, payload);
    const actualizado = await usuariosApi.obtener(id);
    setUsuario(actualizado);
  };

  if (loading) {
    return (
      <DashboardLayout menu={ADMIN_MENU} secondaryMenu={ADMIN_SECONDARY_MENU} title="Usuario">
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 size={28} className="animate-spin" />
          <span className="ml-3 text-sm">Cargando usuario...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !usuario) {
    return (
      <DashboardLayout menu={ADMIN_MENU} secondaryMenu={ADMIN_SECONDARY_MENU} title="Usuario">
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Users size={48} className="mx-auto text-slate-300" />
          <p className="mt-4 text-sm font-medium text-slate-700">
            {error || "Usuario no encontrado"}
          </p>
          <button
            onClick={() => navigate("/admin/usuarios")}
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium
                       text-institucional hover:underline"
          >
            <ArrowLeft size={14} />
            Volver a la lista
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const cfg = ROLE_CONFIG[usuario.role] || ROLE_CONFIG.mecanico;
  const inicial = usuario.username.charAt(0).toUpperCase();
  const fechaAlta = usuario.created_at
    ? new Date(usuario.created_at).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";

  return (
    <DashboardLayout
      menu={ADMIN_MENU}
      secondaryMenu={ADMIN_SECONDARY_MENU}
      title="Detalle del usuario"
      subtitle={usuario.username}
    >
      <button
        onClick={() => navigate("/admin/usuarios")}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium
                   text-slate-600 hover:text-institucional transition"
      >
        <ArrowLeft size={16} />
        Volver a la lista
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200
                          shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-6 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-institucional
                            flex items-center justify-center
                            text-white text-3xl font-bold">
              {inicial}
            </div>
            <h2 className="mt-4 text-xl font-bold text-slate-800">
              {usuario.username}
            </h2>
            {usuario.nombre_completo && (
              <p className="mt-1 text-sm text-slate-500">
                {usuario.nombre_completo}
              </p>
            )}
            <span className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1
                              rounded-full text-xs font-medium ${cfg.color}`}>
              {cfg.icon}
              {usuario.rol_nombre || cfg.label}
            </span>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200
                          shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">
                Información de la cuenta
              </h3>
              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                           text-xs font-medium bg-institucional hover:bg-institucional-dark
                           text-white transition"
              >
                <Pencil size={12} />
                Editar
              </button>
            </div>
            <ul className="divide-y divide-slate-100">
              <InfoRow icon={<UserIcon size={16} />} label="Usuario" value={usuario.username} />
              <InfoRow icon={<Mail size={16} />} label="Email" value={usuario.email} />
              <InfoRow icon={cfg.icon} label="Rol" value={usuario.rol_nombre || cfg.label} />
              <InfoRow
                icon={usuario.activo ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                label="Estado"
                value={usuario.activo ? "Activo" : "Inactivo"}
                valueClass={usuario.activo ? "text-emerald-700" : "text-red-600"}
              />
              <InfoRow icon={<Calendar size={16} />} label="Fecha de alta" value={fechaAlta} />
            </ul>
          </div>
        </div>
      </div>

      {/* Modal de edición */}
      <UsuarioModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        usuario={usuario}
      />
    </DashboardLayout>
  );
}

function InfoRow({ icon, label, value, valueClass = "" }) {
  return (
    <li className="px-5 py-3 flex items-center gap-3">
      <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center
                       text-slate-500 shrink-0">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
          {label}
        </p>
        <p className={`mt-0.5 text-sm text-slate-800 ${valueClass}`}>{value}</p>
      </div>
    </li>
  );
}