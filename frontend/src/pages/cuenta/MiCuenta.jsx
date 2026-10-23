// src/pages/cuenta/MiCuenta.jsx
// Datos del usuario y cambio de su propia contraseña (admin y mecánico).
import DashboardLayout from "../../layouts/DashboardLayout";
import { Section } from "../../components/ui";
import FormCambiarPassword from "../../components/cuenta/FormCambiarPassword";
import { useAuth } from "../../context/AuthContext";
import { menusForRole } from "../../config/menus";
import { ROLE_COLOR, ROLE_LABEL } from "../../config/roles";
import { formatFecha } from "../../config/solicitudes";
import {
  User as UserIcon, Mail, Shield, Calendar, Clock,
} from "lucide-react";

export default function MiCuenta() {
  const { user, role } = useAuth();
  const { menu, secondaryMenu } = menusForRole(role);
  const nombre = user?.nombre_completo || user?.username;

  return (
    <DashboardLayout menu={menu} secondaryMenu={secondaryMenu} title="Mi cuenta" subtitle="Tus datos y tu contraseña">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 max-w-5xl">
        {/* Datos */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-6 text-center">
            <div
              className={`w-20 h-20 mx-auto rounded-full ${ROLE_COLOR[role] || "bg-slate-500"}
                          flex items-center justify-center text-white text-3xl font-semibold`}
            >
              {(user?.username || "?").charAt(0).toUpperCase()}
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-800">{nombre}</h2>
            <p className="text-sm text-slate-500">{user?.rol_nombre || ROLE_LABEL[role]}</p>
          </div>

          <Section title="Información">
            <ul className="space-y-3 text-sm">
              <Dato icon={<UserIcon size={15} />} label="Usuario" value={user?.username} />
              <Dato icon={<Mail size={15} />} label="Correo" value={user?.email} />
              <Dato icon={<Shield size={15} />} label="Rol" value={user?.rol_nombre || ROLE_LABEL[role]} />
              <Dato icon={<Calendar size={15} />} label="Cuenta creada" value={formatFecha(user?.created_at)} />
              <Dato icon={<Clock size={15} />} label="Último acceso" value={formatFecha(user?.ultimo_acceso, true)} />
            </ul>
            <p className="mt-4 text-xs text-slate-500">
              Para cambiar tu nombre, correo o rol, pídeselo al administrador.
            </p>
          </Section>
        </div>

        {/* Cambiar contraseña */}
        <div className="lg:col-span-2">
          <Section title="Cambiar contraseña" subtitle="Usa una contraseña que solo tú conozcas; evita las fáciles como 123456.">
            <FormCambiarPassword />
          </Section>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Dato({ icon, label, value }) {
  return (
    <li className="flex items-center gap-3">
      <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">{label}</p>
        <p className="text-slate-800 truncate">{value || "—"}</p>
      </div>
    </li>
  );
}
