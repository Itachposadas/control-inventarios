// src/components/usuarios/UsuarioModal.jsx
import { useEffect, useState } from "react";
import { Eye, EyeOff, Plus } from "lucide-react";
import { rolesApi } from "../../api/roles";
import { vehiculosApi } from "../../api/vehiculos";
import { Modal, Boton, Alerta, Field, AvisoCampo, inputClass } from "../ui";
import { useCamposVacios } from "../../hooks/useCamposVacios";
import ReglasPassword from "../ui/ReglasPassword";
import { errorPassword, LONGITUD_MAXIMA } from "../../config/password";

// Las mismas reglas que valida el backend (backend/validacion.py)
const USUARIO_VALIDO = /^[A-Za-z0-9._-]{3,50}$/;
const EMAIL_VALIDO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Roles base: definen los permisos. Los roles creados heredan de uno de ellos.
const ROLES = [
  { value: "admin",    label: "Administrador" },
  { value: "mecanico", label: "Parque vehicular" },
];

// Cuenta de un área: no hereda a roles creados, lleva el área que representa
const ROL_AREA = { value: "area", label: "Área (hace solicitudes)" };

// Valor del <select>: "admin" / "mecanico" o "rol:<id>" para un rol creado
const valorRol = (u) => (u?.rol_id ? `rol:${u.rol_id}` : u?.role || "mecanico");

export default function UsuarioModal({ open, onClose, onSave, usuario = null }) {
  const { errores, validar, limpiar, reiniciar } = useCamposVacios();
  const editando = Boolean(usuario);

  const [form, setForm] = useState({
    username: "",
    email: "",
    nombre_completo: "",
    password: "",
    role: "mecanico",
    area: "",
    activo: true,
  });
  const [roles, setRoles] = useState([]);
  const [areas, setAreas] = useState([]);
  const [nuevoRol, setNuevoRol] = useState(false);
  const [rolNombre, setRolNombre] = useState("");
  const [rolBase, setRolBase] = useState("mecanico");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset cada vez que se abre el modal
  useEffect(() => {
    if (open) {
      reiniciar();
      setForm({
        username: usuario?.username || "",
        email: usuario?.email || "",
        nombre_completo: usuario?.nombre_completo || "",
        password: "",
        role: valorRol(usuario),
        area: usuario?.area || "",
        activo: usuario?.activo ?? true,
      });
      setError("");
      setSaving(false);
      setShowPassword(false);
      setNuevoRol(false);
      setRolNombre("");
      setRolBase("mecanico");
      rolesApi.listar().then(setRoles).catch(() => setRoles([]));
      vehiculosApi.areas().then(setAreas).catch(() => setAreas([]));
    }
  }, [open, usuario, reiniciar]);

  if (!open) return null;

  const emailOpcional = !nuevoRol && form.role === ROL_AREA.value;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    limpiar(name);
    setForm((f) => ({
      ...f,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validaciones frontend: el aviso sale debajo de cada campo
    const usuarioTxt = form.username.trim();
    const correo = form.email.trim();
    const esArea = !nuevoRol && form.role === ROL_AREA.value;
    const ok = validar({
      username: !usuarioTxt
        ? "Rellena este campo con el nombre de usuario"
        : usuarioTxt !== (usuario?.username || "") && !USUARIO_VALIDO.test(usuarioTxt) &&
          "De 3 a 50 caracteres: letras sin acentos, números, punto, guion o guion bajo, sin espacios",
      email: !correo
        ? !esArea && "Rellena este campo con el correo de la persona"
        : !EMAIL_VALIDO.test(correo) && "Revisa el correo: debe tener @ y un dominio",
      password: !form.password
        ? !editando && "Rellena este campo con una contraseña temporal"
        : errorPassword(form.password, usuarioTxt),
      rolNombre: nuevoRol && !rolNombre.trim() && "Escribe el nombre del nuevo rol",
      area: esArea && !form.area && "Elige el área de la cuenta",
    });
    if (!ok) return;

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
        area: rolSel === ROL_AREA.value ? form.area : "",
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
      <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
        {error && <Alerta>{error}</Alerta>}

        <Field label="Nombre completo">
          <input
            name="nombre_completo"
            maxLength={150}
            value={form.nombre_completo}
            onChange={handleChange}
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Usuario" required error={errores.username}>
            <input
              name="username"
              maxLength={50}
              autoCapitalize="none"
              spellCheck={false}
              value={form.username}
              onChange={handleChange}
              className={inputClass}
            />
          </Field>
          {/* Las cuentas de área pueden no tener correo */}
          <Field
            label={
              <>
                Email
                {emailOpcional && <span className="text-xs font-normal text-slate-500 ml-1">(opcional)</span>}
              </>
            }
            required={!emailOpcional}
            error={errores.email}
          >
            <input
              name="email"
              type="email"
              maxLength={120}
              value={form.email}
              onChange={handleChange}
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
          error={errores.password}
        >
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              maxLength={LONGITUD_MAXIMA}
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
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
          {(form.password || !editando) && (
            <div className="mt-2 space-y-1.5">
              <ReglasPassword password={form.password} usuario={form.username.trim()} />
              <p className="text-xs text-slate-500">
                Es temporal: al entrar, la persona tendrá que cambiarla por una propia.
              </p>
            </div>
          )}
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
              <div data-error={errores.rolNombre ? "" : undefined}>
                <input
                  value={rolNombre}
                  onChange={(e) => {
                    setRolNombre(e.target.value);
                    limpiar("rolNombre");
                  }}
                  autoFocus
                  maxLength={60}
                  aria-label="Nombre del nuevo rol"
                  className={inputClass}
                />
                {errores.rolNombre && <AvisoCampo>{errores.rolNombre}</AvisoCampo>}
              </div>
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
              <option value={ROL_AREA.value}>{ROL_AREA.label}</option>
              {roles.map((r) => (
                <option key={r.id} value={`rol:${r.id}`}>
                  {r.nombre} (permisos de {ROLES.find((b) => b.value === r.base)?.label})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Área que representa la cuenta (solo rol Área) */}
        {!nuevoRol && form.role === ROL_AREA.value && (
          <Field label="Área" required error={errores.area}>
            <select
              name="area"
              value={form.area}
              onChange={handleChange}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="">Elige el área…</option>
              {areas.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Esta cuenta solo verá los vehículos y las solicitudes de esta área.
            </p>
          </Field>
        )}

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
