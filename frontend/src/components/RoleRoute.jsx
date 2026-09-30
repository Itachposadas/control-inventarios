// src/components/RoleRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RoleRoute({ allowed = [], children }) {
  const { user, role, loading, homePath } = useAuth();

  // Mientras carga, no redirijas aún
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Cargando...
      </div>
    );
  }

  // Sin sesión → al login
  if (!user) return <Navigate to="/login" replace />;

  // Con sesión pero rol no permitido → a su home
  if (allowed.length > 0 && !allowed.includes(role)) {
    return <Navigate to={homePath} replace />;
  }

  return children;
}