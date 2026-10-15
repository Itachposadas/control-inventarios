// src/components/cuenta/FormCambiarPassword.jsx
// Formulario para cambiar la propia contraseña (Mi cuenta y cambio obligatorio).
// Muestra los requisitos mientras se escribe; el backend vuelve a validarlos.
//   <FormCambiarPassword onCambiada={(user) => ...} />
import { useState } from "react";
import { Field, inputClass, Boton, Alerta } from "../ui";
import ReglasPassword from "../ui/ReglasPassword";
import { authApi } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import { errorPassword } from "../../config/password";
import { Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";

const VACIO = { actual: "", nueva: "", confirmar: "" };

export default function FormCambiarPassword({ onCambiada, textoBoton = "Cambiar contraseña", mostrarExito = true }) {
  const { user, actualizarUsuario } = useAuth();
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

    const invalida = errorPassword(form.nueva, user?.username);
    if (invalida) return setError(invalida);
    if (form.nueva === form.actual) return setError("La nueva contraseña debe ser distinta a la actual");
    if (form.nueva !== form.confirmar) return setError("La confirmación no coincide con la nueva contraseña");

    setSaving(true);
    try {
      const { user: actualizado } = await authApi.cambiarPassword(form.actual, form.nueva);
      setForm(VACIO);
      if (actualizado) actualizarUsuario(actualizado);
      if (mostrarExito) setExito("Tu contraseña se actualizó correctamente");
      onCambiada?.(actualizado);
    } catch (err) {
      setError(err.message || "No se pudo cambiar la contraseña");
    } finally {
      setSaving(false);
    }
  };

  const tipoInput = ver ? "text" : "password";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      {error && <Alerta icono={<AlertCircle size={18} />}>{error}</Alerta>}
      {exito && <Alerta tipo="exito" icono={<CheckCircle2 size={18} />}>{exito}</Alerta>}

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
          aria-describedby="reglas-password"
          className={inputClass}
        />
        <div id="reglas-password" className="mt-2">
          <ReglasPassword password={form.nueva} usuario={user?.username} />
        </div>
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
        {form.confirmar && form.confirmar !== form.nueva && (
          <p className="mt-1 text-xs text-red-600">No coincide con la nueva contraseña</p>
        )}
      </Field>

      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={() => setVer((v) => !v)}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-institucional transition"
        >
          {ver ? <EyeOff size={16} /> : <Eye size={16} />}
          {ver ? "Ocultar contraseñas" : "Mostrar contraseñas"}
        </button>
        <Boton type="submit" disabled={saving}>
          {saving ? "Guardando..." : textoBoton}
        </Boton>
      </div>
    </form>
  );
}
