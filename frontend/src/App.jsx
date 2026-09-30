// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ROLES } from "./config/roles";
import RoleRoute from "./components/RoleRoute";

import Login from "./pages/Login";

import AdminDashboard from "./pages/dashboards/AdminDashboard";
import MecanicoDashboard from "./pages/dashboards/MecanicoDashboard";

// Módulo de vehículos (admin lo administra, mecánico lo consulta)
import VehiculosList from "./pages/admin/vehiculos/VehiculosList";
import VehiculoDetail from "./pages/admin/vehiculos/VehiculoDetail";

// Módulo de usuarios (admin)
import UsuariosList from "./pages/admin/usuarios/UsuariosList";
import UsuarioDetail from "./pages/admin/usuarios/UsuarioDetail";

// Módulo de solicitudes (admin y mecánico)
import SolicitudesList from "./pages/solicitudes/SolicitudesList";
import SolicitudNueva from "./pages/solicitudes/SolicitudNueva";
import SolicitudDetail from "./pages/solicitudes/SolicitudDetail";

// Mi cuenta y ayuda (ambos roles)
import MiCuenta from "./pages/cuenta/MiCuenta";
import Ayuda from "./pages/ayuda/Ayuda";

// Placeholder para subrutas no implementadas aún
import EnConstruccion from "./pages/admin/EnConstruccion";

const { ADMIN, MECANICO } = ROLES;

function PublicRoute({ children }) {
  const { user, loading, homePath } = useAuth();
  if (loading) return null;
  return user ? <Navigate to={homePath} replace /> : children;
}

// Atajo: <Route path=... element={solo([ADMIN], <Pagina />)} />
const solo = (roles, element) => <RoleRoute allowed={roles}>{element}</RoleRoute>;

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ══════════ PÚBLICAS ══════════ */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

          {/* ══════════ ADMIN ══════════ */}
          <Route path="/admin" element={solo([ADMIN], <AdminDashboard />)} />

          {/* El admin no llena solicitudes: solo abre el detalle desde el historial
              del vehículo para capturar el costo y registrar la entrega */}
          <Route path="/admin/solicitudes" element={<Navigate to="/admin/vehiculos" replace />} />
          <Route path="/admin/solicitudes/:id" element={solo([ADMIN], <SolicitudDetail />)} />

          <Route path="/admin/vehiculos" element={solo([ADMIN], <VehiculosList />)} />
          <Route path="/admin/vehiculos/:id" element={solo([ADMIN], <VehiculoDetail />)} />

          <Route path="/admin/usuarios" element={solo([ADMIN], <UsuariosList />)} />
          <Route path="/admin/usuarios/:id" element={solo([ADMIN], <UsuarioDetail />)} />

          <Route path="/admin/mi-cuenta" element={solo([ADMIN], <MiCuenta />)} />
          <Route path="/admin/ayuda" element={solo([ADMIN], <Ayuda />)} />

          {/* Pendiente: Reportes */}
          <Route path="/admin/*" element={solo([ADMIN], <EnConstruccion />)} />

          {/* ══════════ MECÁNICO ══════════ */}
          <Route path="/mecanico" element={solo([MECANICO], <MecanicoDashboard />)} />

          {/* Catálogo de vehículos en modo consulta + historial */}
          <Route path="/mecanico/vehiculos" element={solo([MECANICO], <VehiculosList />)} />
          <Route path="/mecanico/vehiculos/:id" element={solo([MECANICO], <VehiculoDetail />)} />

          <Route
            path="/mecanico/reparaciones"
            element={solo([MECANICO], (
              <SolicitudesList titulo="Mis reparaciones" subtitulo="Vehículos que tienes asignados" />
            ))}
          />
          <Route path="/mecanico/reparaciones/nueva" element={solo([MECANICO], <SolicitudNueva />)} />
          <Route path="/mecanico/reparaciones/:id" element={solo([MECANICO], <SolicitudDetail />)} />
          <Route
            path="/mecanico/historial"
            element={solo([MECANICO], (
              <SolicitudesList titulo="Historial" subtitulo="Servicios que ya terminaste" estadoFijo="cerradas" />
            ))}
          />
          <Route path="/mecanico/mi-cuenta" element={solo([MECANICO], <MiCuenta />)} />
          <Route path="/mecanico/ayuda" element={solo([MECANICO], <Ayuda />)} />
          <Route path="/mecanico/*" element={<Navigate to="/mecanico" replace />} />

          {/* ══════════ REDIRECCIONES ══════════ */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
