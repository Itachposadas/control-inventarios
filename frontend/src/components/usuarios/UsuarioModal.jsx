// src/components/usuarios/UsuarioModal.jsx
import { useEffect, useState } from "react";
import { Eye, EyeOff, Plus } from "lucide-react";
import { rolesApi } from "../../api/roles";
import { Modal, Boton, Alerta, Field, inputClass } from "../ui";

// Roles base: definen los permisos. Los roles creados heredan de uno de ellos.
const ROLES = [
  { value: "admin",    label: "Administrador" },
  { value: "mecanico", label: "Mecánico" },
];

// Valor del <select>: "admin" / "mecanico" o "rol:<id>" para un rol creado
const valorRol = (u) => (u?.rol_id ? `rol:${u.rol_id}` : u?.role || "mecanico");

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
  const [roles, setRoles] = useState([]);
  const [nuevoRol, setNuevoRol] = useState(false);
  const [rolNombre, setRolNombre] = useState("");
  const [rolBase, setRolBase] = useState("mecanico");
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
        role: valorRol(usuario),
        activo: usuario?.activo ?? true,
      });
      setError("");
      setSaving(false);
      setShowPassword(false);
      setNuevoRol(false);
      setRolNombre("");
      setRolBase("mecanico");
      rolesApi.listar().then(setRoles).catch(() => setRoles([]));
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
    if (nuevoRol && !rolNombre.trim()) {
      return setError("Escribe el nombre del nuevo rol");
    }

    setSaving(true);
    try {
      // Rol: uno nuevo (se crea primero), uno creado antes o un rol base
      let rolSel = form.role;
      if (nuevoRol) {
        const creado = await rolesApi.crear({ nombre: rolNombre.trim(), base: rolBase });
        setRoles((rs) => [...rs, creado]);
        setNuevoRol(false);
        rolSel = `rol:${creado.id}`;
        setForm((f) => ({ ...f, role: rolSel }));
      }
      const rolId = rolSel.startsWith("rol:") ? Number(rolSel.slice(4)) : null;

      const payload = {
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        nombre_completo: form.nombre_completo.trim(),
        role: rolId ? undefined : rolSel,
        rol_id: rolId,
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
    <Modal
      titulo={editando ? "Editar usuario" : "Nuevo usuario"}
      subtitulo={editando ? "Modifica los datos del usuario" : "Registra una nueva cuenta en el sistema"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && <Alerta>{error}</Alerta>}

        <Field label="Nombre completo">
          <input
            name="nombre_completo"
            value={form.nombre_completo}
            onChange={handleChange}
            placeholder="Juan Pérez López"
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Usuario" required>
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              required
              placeholder="juanperez"
              className={inputClass}
            />
          </Field>
          <Field label="Email" required>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="juan@demo.com"
              className={inputClass}
            />
          </Field>
        </div>

        <Field
          label={
            <>
              Contraseña
              {editando && (
                <span className="text-xs font-normal text-slate-500 ml-1">(dejar vacío para no cambiar)</span>
              )}
            </>
          }
          required={!editando}
        >
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={handleChange}
              placeholder="Mínimo 6 caracteres"
              className={`${inputClass} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5
                         text-slate-500 hover:text-institucional transition"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>

        {/* Rol */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-slate-700">
              Rol <span className="text-red-600">*</span>
            </label>
            <button
              type="button"
              onClick={() => setNuevoRol((v) => !v)}
              className="inline-flex items-center gap-1 text-xs font-medium
                         text-institucional hover:underline"
            >
              {nuevoRol ? (
                "Elegir existente"
              ) : (
                <>
                  <Plus size={12} /> Nuevo rol
                </>
              )}
            </button>
          </div>

          {nuevoRol ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                value={rolNombre}
                onChange={(e) => setRolNombre(e.target.value)}
                autoFocus
                maxLength={60}
                placeholder="Nombre del rol (ej. Supervisor)"
                className={inputClass}
              />
              <select
                value={rolBase}
                onChange={(e) => setRolBase(e.target.value)}
                className={`${inputClass} cursor-pointer`}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    Permisos de {r.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className={`${inputClass} cursor-pointer`}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
              {roles.map((r) => (
                <option key={r.id} value={`rol:${r.id}`}>
                  {r.nombre} (permisos de {ROLES.find((b) => b.value === r.base)?.label})
                </option>
              ))}
            </select>
          )}
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

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
          <Boton variante="fantasma" onClick={onClose}>
            Cancelar
          </Boton>
          <Boton type="submit" disabled={saving}>
            {saving ? "Guardando..." : editando ? "Guardar cambios" : "Crear usuario"}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}
