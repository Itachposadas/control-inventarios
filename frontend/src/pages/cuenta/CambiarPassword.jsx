// src/pages/cuenta/CambiarPassword.jsx
// Cambio de contraseña obligatorio: la cuenta tiene una contraseña temporal (la
// puso el administrador) o una que ya no cumple las reglas (ej. 123456). Hasta
// cambiarla no se puede usar el resto del sistema (el backend también lo exige).
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import FormCambiarPassword from "../../components/cuenta/FormCambiarPassword";
import { MarcaAgua } from "../../components/ui";
import { HOME_BY_ROLE } from "../../config/roles";
import { KeyRound, LogOut, Loader2 } from "lucide-react";

export default function CambiarPassword() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        <Loader2 size={26} className="animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  // Ya la cambió: a su pantalla de inicio
  if (!user.debe_cambiar_password) return <Navigate to={HOME_BY_ROLE[user.role] || "/"} replace />;

  const salir = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="relative min-h-screen bg-fondo flex items-center justify-center px-4 py-10 overflow-hidden">
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <MarcaAgua className="bg-institucional opacity-[0.05] h-[80%] -right-20 -bottom-10 rotate-[-8deg]" />
      </div>
      <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="h-1.5 bg-institucional" />
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3 mb-6">
            <img src="/logo-atlacomulco.png" alt="Municipio de Atlacomulco" className="h-10 w-auto object-contain" />
            <span className="w-11 h-11 rounded-xl bg-institucional/10 text-institucional flex items-center justify-center">
              <KeyRound size={22} />
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-800">Crea una contraseña nueva</h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Hola, <span className="font-semibold">{user.nombre_completo || user.username}</span>. Tu contraseña
            actual es temporal o ya no cumple los requisitos de seguridad. Cámbiala para continuar.
          </p>
          <div className="mt-6">
            <FormCambiarPassword
              textoBoton="Guardar y continuar"
              mostrarExito={false}
              onCambiada={(u) => navigate(HOME_BY_ROLE[(u || user).role] || "/", { replace: true })}
            />
          </div>
          <button
            type="button"
            onClick={salir}
            className="mt-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-institucional transition"
          >
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
