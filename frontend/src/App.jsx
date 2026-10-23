// src/App.jsx
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ROLES } from "./config/roles";
import RoleRoute from "./components/RoleRoute";
import ErrorBoundary from "./components/ErrorBoundary";

// Inicio y login cargan de inmediato; las demás pantallas se descargan al abrirlas
// (una cuenta de área no baja las pantallas del admin ni las gráficas)
import Inicio from "./pages/Inicio";
import Login from "./pages/Login";
const AvisoPrivacidad = lazy(() => import("./pages/AvisoPrivacidad"));

const AdminDashboard = lazy(() => import("./pages/dashboards/AdminDashboard"));
const MecanicoDashboard = lazy(() => import("./pages/dashboards/MecanicoDashboard"));

// Módulo de vehículos (solo admin)
const VehiculosList = lazy(() => import("./pages/admin/vehiculos/VehiculosList"));
const VehiculoDetail = lazy(() => import("./pages/admin/vehiculos/VehiculoDetail"));

// Módulo de usuarios (admin)
const UsuariosList = lazy(() => import("./pages/admin/usuarios/UsuariosList"));
const UsuarioDetail = lazy(() => import("./pages/admin/usuarios/UsuarioDetail"));

// Módulo de solicitudes (admin y mecánico)
const SolicitudesList = lazy(() => import("./pages/solicitudes/SolicitudesList"));
const FormatoIngreso = lazy(() => import("./pages/solicitudes/FormatoIngreso"));
const SolicitudDetail = lazy(() => import("./pages/solicitudes/SolicitudDetail"));
const EvidenciaFotografica = lazy(() => import("./pages/solicitudes/EvidenciaFotografica"));

// Órdenes de reparación en taller foráneo (mecánico genera, admin consulta)
const OrdenesForaneas = lazy(() => import("./pages/foraneas/OrdenesForaneas"));
const OrdenForanea = lazy(() => import("./pages/foraneas/OrdenForanea"));

// Solicitudes que mandan las áreas desde la página de inicio
const PeticionesAreas = lazy(() => import("./pages/peticiones/PeticionesAreas"));

// Órdenes de compra: las manda el mecánico, las atiende administración (admin)
const OrdenesCompra = lazy(() => import("./pages/ordenes/OrdenesCompra"));

// Historial de servicios por vehículo (admin y parque vehicular)
const HistorialServicios = lazy(() => import("./pages/historial/HistorialServicios"));

// Préstamo de herramientas (solo mecánico)
const PrestamoHerramientas = lazy(() => import("./pages/herramientas/PrestamoHerramientas"));

// Reportes (solo admin)
const Reportes = lazy(() => import("./pages/reportes/Reportes"));

// Cuenta de un área: solo hace solicitudes
const NuevaSolicitud = lazy(() => import("./pages/area/NuevaSolicitud"));
const Seguimiento = lazy(() => import("./pages/area/Seguimiento"));

// Mi cuenta y ayuda (todos los roles)
const MiCuenta = lazy(() => import("./pages/cuenta/MiCuenta"));
const CambiarPassword = lazy(() => import("./pages/cuenta/CambiarPassword"));
const Ayuda = lazy(() => import("./pages/ayuda/Ayuda"));

// Placeholder para subrutas no implementadas aún
const EnConstruccion = lazy(() => import("./pages/admin/EnConstruccion"));

const { ADMIN, MECANICO, AREA } = ROLES;

// Si una pantalla falla, muestra un aviso en lugar de dejar la página en blanco.
// Al cambiar de ruta se vuelve a intentar.
function ProtegerPantallas({ children }) {
  const location = useLocation();
  return (
    <ErrorBoundary resetKey={location.pathname}>
      {/* Mientras llega una pantalla: solo el fondo (suele tardar menos que un spinner en parpadear) */}
      <Suspense fallback={<div className="min-h-screen bg-fondo" />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

// Atajo: <Route path=... element={solo([ADMIN], <Pagina />)} />
const solo = (roles, element) => <RoleRoute allowed={roles}>{element}</RoleRoute>;

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ProtegerPantallas>
        <Routes>
          {/* ══════════ PÚBLICAS ══════════ */}
          {/* Inicio: explica cómo pedir servicio; cada área entra con su cuenta */}
          <Route path="/" element={<Inicio />} />
          <Route path="/login" element={<Login />} />
          <Route path="/aviso-privacidad" element={<AvisoPrivacidad />} />
          {/* Contraseña temporal o débil: se cambia antes de entrar al sistema */}
          <Route path="/cambiar-password" element={<CambiarPassword />} />

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

          <Route path="/admin/reportes" element={solo([ADMIN], <Reportes />)} />

          <Route path="/admin/foraneo" element={solo([ADMIN], <OrdenesForaneas />)} />
          <Route path="/admin/foraneo/:id" element={solo([ADMIN], <OrdenForanea />)} />

          <Route path="/admin/solicitudes-areas" element={solo([ADMIN], <PeticionesAreas />)} />
          <Route path="/admin/ordenes-compra" element={solo([ADMIN], <OrdenesCompra />)} />
          <Route path="/admin/historial" element={solo([ADMIN], <HistorialServicios />)} />

          <Route path="/admin/*" element={solo([ADMIN], <EnConstruccion />)} />

          {/* ══════════ MECÁNICO ══════════ */}
          <Route path="/mecanico" element={solo([MECANICO], <MecanicoDashboard />)} />

          {/* El mecánico ya no tiene catálogo de vehículos: trabaja desde Solicitudes */}
          <Route path="/mecanico/vehiculos/*" element={<Navigate to="/mecanico/solicitudes-areas" replace />} />

          <Route
            path="/mecanico/reparaciones"
            element={solo([MECANICO], (
              <SolicitudesList titulo="Mis reparaciones" subtitulo="Vehículos que tienes asignados" />
            ))}
          />
          {/* El ingreso a taller solo se abre desde una solicitud: /nueva?peticion=ID */}
          {/* El servicio se abre al firmar de recibido en Solicitudes; el ingreso es su paso 2 */}
          <Route path="/mecanico/reparaciones/nueva" element={<Navigate to="/mecanico/solicitudes-areas" replace />} />
          <Route path="/mecanico/reparaciones/:id/ingreso" element={solo([MECANICO], <FormatoIngreso />)} />
          <Route path="/mecanico/reparaciones/:id" element={solo([MECANICO], <SolicitudDetail />)} />
          <Route path="/mecanico/evidencia" element={solo([MECANICO], <EvidenciaFotografica />)} />
          <Route path="/mecanico/foraneo" element={solo([MECANICO], <OrdenesForaneas />)} />
          <Route path="/mecanico/foraneo/:id" element={solo([MECANICO], <OrdenForanea />)} />
          <Route path="/mecanico/solicitudes-areas" element={solo([MECANICO], <PeticionesAreas />)} />
          <Route path="/mecanico/herramientas" element={solo([MECANICO], <PrestamoHerramientas />)} />
          <Route path="/mecanico/historial" element={solo([MECANICO], <HistorialServicios />)} />
          <Route path="/mecanico/mi-cuenta" element={solo([MECANICO], <MiCuenta />)} />
          <Route path="/mecanico/ayuda" element={solo([MECANICO], <Ayuda />)} />
          <Route path="/mecanico/*" element={<Navigate to="/mecanico" replace />} />

          {/* ══════════ ÁREA ══════════ */}
          <Route path="/area" element={solo([AREA], <NuevaSolicitud />)} />
          <Route path="/area/seguimiento" element={solo([AREA], <Seguimiento />)} />
          <Route path="/area/mi-cuenta" element={solo([AREA], <MiCuenta />)} />
          <Route path="/area/ayuda" element={solo([AREA], <Ayuda />)} />
          <Route path="/area/*" element={<Navigate to="/area" replace />} />

          {/* ══════════ REDIRECCIONES ══════════ */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ProtegerPantallas>
      </BrowserRouter>
    </AuthProvider>
  );
}
