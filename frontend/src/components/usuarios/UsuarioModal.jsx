// src/components/usuarios/UsuarioModal.jsx
import { useEffect, useState } from "react";
import { X, Eye, EyeOff } from "lucide-react";

const ROLES = [
  { value: "admin",    label: "Administrador" },
  { value: "mecanico", label: "Mecánico" },
];

export default function UsuarioModal({ open, onClose, onSave, usuario = null }) {
  const editando = Boolean(usuario);

  const [form, setForm] = useState({
    username: "",
    email: "",
    nombre_completo: "",
    password: "",
    role: "mecanico",
    activo: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset cada vez que se abre el modal
  useEffect(() => {
    if (open) {
      setForm({
        username: usuario?.username || "",
        email: usuario?.email || "",
        nombre_completo: usuario?.nombre_completo || "",
        password: "",
        role: usuario?.role || "mecanico",
        activo: usuario?.activo ?? true,
      });
      setError("");
      setSaving(false);
      setShowPassword(false);
    }
  }, [open, usuario]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validaciones frontend
    if (!form.username.trim()) return setError("El usuario es obligatorio");
    if (!form.email.trim()) return setError("El email es obligatorio");
    if (!editando && !form.password) return setError("La contraseña es obligatoria");
    if (form.password && form.password.length < 6) {
      return setError("La contraseña debe tener al menos 6 caracteres");
    }

    setSaving(true);
    try {
      const payload = {
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        nombre_completo: form.nombre_completo.trim(),
        role: form.role,
        activo: form.activo,
      };
      // Solo incluir password si se escribió
      if (form.password) payload.password = form.password;

      await onSave(payload);
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.msg || "Error al guardar el usuario"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 animate-fade-in">
      <div className="animate-pop bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              {editando ? "Editar usuario" : "Nuevo usuario"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {editando
                ? "Modifica los datos del usuario"
                : "Registra una nueva cuenta en el sistema"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Nombre completo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre completo
            </label>
            <input
              name="nombre_completo"
              value={form.nombre_completo}
              onChange={handleChange}
              placeholder="Juan Pérez López"
              className="w-full px-3 py-2 rounded-lg border border-slate-200
                         text-sm text-slate-800
                         focus:outline-none focus:border-institucional
                         focus:ring-2 focus:ring-institucional/15 transition"
            />
          </div>

          {/* Username + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Usuario <span className="text-red-600">*</span>
              </label>
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                required
                placeholder="juanperez"
                className="w-full px-3 py-2 rounded-lg border border-slate-200
                           text-sm text-slate-800
                           focus:outline-none focus:border-institucional
                           focus:ring-2 focus:ring-institucional/15 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email <span className="text-red-600">*</span>
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="juan@demo.com"
                className="w-full px-3 py-2 rounded-lg border border-slate-200
                           text-sm text-slate-800
                           focus:outline-none focus:border-institucional
                           focus:ring-2 focus:ring-institucional/15 transition"
              />
            </div>
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contraseña {!editando && <span className="text-red-600">*</span>}
              {editando && (
                <span className="text-xs font-normal text-slate-500 ml-1">
                  (dejar vacío para no cambiar)
                </span>
              )}
            </label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-3 py-2 pr-11 rounded-lg border border-slate-200
                           text-sm text-slate-800
                           focus:outline-none focus:border-institucional
                           focus:ring-2 focus:ring-institucional/15 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5
                           text-slate-500 hover:text-institucional transition"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Rol */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Rol <span className="text-red-600">*</span>
            </label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-slate-200
                         text-sm text-slate-800
                         focus:outline-none focus:border-institucional
                         focus:ring-2 focus:ring-institucional/15 transition cursor-pointer"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Activo (solo al editar) */}
          {editando && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="activo"
                checked={form.activo}
                onChange={handleChange}
                className="w-4 h-4 rounded border-slate-300 text-institucional
                           focus:ring-institucional"
              />
              <span className="text-sm text-slate-700">
                Usuario activo (puede iniciar sesión)
              </span>
            </label>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg
                         text-slate-600 hover:bg-slate-100 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold rounded-lg
                         bg-institucional hover:bg-institucional-dark
                         text-white disabled:bg-slate-300
                         disabled:cursor-not-allowed transition"
            >
              {saving ? "Guardando..." : editando ? "Guardar cambios" : "Crear usuario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}