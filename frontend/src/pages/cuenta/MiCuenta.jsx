// src/pages/cuenta/MiCuenta.jsx
// Datos del usuario y cambio de su propia contraseña (admin y mecánico).
import { useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { Section, Field, inputClass } from "../../components/solicitudes/ui";
import { authApi } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import { menusForRole } from "../../config/menus";
import { ROLE_COLOR, ROLE_LABEL } from "../../config/roles";
import { formatFecha } from "../../config/solicitudes";
import {
  User as UserIcon, Mail, Shield, Calendar, Clock, Eye, EyeOff, CheckCircle2, AlertCircle,
} from "lucide-react";

const VACIO = { actual: "", nueva: "", confirmar: "" };

export default function MiCuenta() {
  const { user, role } = useAuth();
  const { menu, secondaryMenu } = menusForRole(role);

  const [form, setForm] = useState(VACIO);
  const [ver, setVer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const set = (campo) => (e) => {
    setForm((f) => ({ ...f, [campo]: e.target.value }));
    setError("");
    setExito("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setExito("");

    if (form.nueva.length < 6) return setError("La nueva contraseña debe tener al menos 6 caracteres");
    if (form.nueva !== form.confirmar) return setError("La confirmación no coincide con la nueva contraseña");

    setSaving(true);
    try {
      await authApi.cambiarPassword(form.actual, form.nueva);
      setForm(VACIO);
      setExito("Tu contraseña se actualizó correctamente");
    } catch (err) {
      setError(err.message || "No se pudo cambiar la contraseña");
    } finally {
      setSaving(false);
    }
  };

  const tipoInput = ver ? "text" : "password";
  const nombre = user?.nombre_completo || user?.username;

  return (
    <DashboardLayout menu={menu} secondaryMenu={secondaryMenu} title="Mi cuenta" subtitle="Tus datos y tu contraseña">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 max-w-5xl">
        {/* Datos */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-6 text-center">
            <div
              className={`w-20 h-20 mx-auto rounded-full ${ROLE_COLOR[role] || "bg-slate-500"}
                          flex items-center justify-center text-white text-3xl font-bold`}
            >
              {(user?.username || "?").charAt(0).toUpperCase()}
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-800">{nombre}</h2>
            <p className="text-sm text-slate-500">{ROLE_LABEL[role]}</p>
          </div>

          <Section title="Información">
            <ul className="space-y-3 text-sm">
              <Dato icon={<UserIcon size={15} />} label="Usuario" value={user?.username} />
              <Dato icon={<Mail size={15} />} label="Correo" value={user?.email} />
              <Dato icon={<Shield size={15} />} label="Rol" value={ROLE_LABEL[role]} />
              <Dato icon={<Calendar size={15} />} label="Cuenta creada" value={formatFecha(user?.created_at)} />
              <Dato icon={<Clock size={15} />} label="Último acceso" value={formatFecha(user?.ultimo_acceso, true)} />
            </ul>
            <p className="mt-4 text-xs text-slate-400">
              Para cambiar tu nombre, correo o rol, pídeselo al administrador.
            </p>
          </Section>
        </div>

        {/* Cambiar contraseña */}
        <div className="lg:col-span-2">
          <Section title="Cambiar contraseña" subtitle="Usa al menos 6 caracteres. Evita contraseñas fáciles como 123456.">
            <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
              {error && (
                <div role="alert" className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl">
                  <AlertCircle size={18} className="shrink-0 mt-px" />
                  {error}
                </div>
              )}
              {exito && (
                <div role="status" className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-3 rounded-xl">
                  <CheckCircle2 size={18} className="shrink-0 mt-px" />
                  {exito}
                </div>
              )}

              <Field label="Contraseña actual" required>
                <input
                  type={tipoInput}
                  value={form.actual}
                  onChange={set("actual")}
                  autoComplete="current-password"
                  required
                  className={inputClass}
                />
              </Field>
              <Field label="Nueva contraseña" required>
                <input
                  type={tipoInput}
                  value={form.nueva}
                  onChange={set("nueva")}
                  autoComplete="new-password"
                  required
                  className={inputClass}
                />
              </Field>
              <Field label="Confirmar nueva contraseña" required>
                <input
                  type={tipoInput}
                  value={form.confirmar}
                  onChange={set("confirmar")}
                  autoComplete="new-password"
                  required
                  className={inputClass}
                />
              </Field>

              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setVer((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#9F2241] transition"
                >
                  {ver ? <EyeOff size={16} /> : <Eye size={16} />}
                  {ver ? "Ocultar contraseñas" : "Mostrar contraseñas"}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-[#9F2241] hover:bg-[#7d1a33]
                             text-white disabled:bg-slate-300 disabled:cursor-not-allowed transition"
                >
                  {saving ? "Guardando..." : "Cambiar contraseña"}
                </button>
              </div>
            </form>
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
        <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">{label}</p>
        <p className="text-slate-800 truncate">{value || "—"}</p>
      </div>
    </li>
  );
}
