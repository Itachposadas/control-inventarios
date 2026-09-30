# Parque Vehicular · Atlacomulco (Frontend)

Base del frontend construida con React + Vite + Tailwind CSS + React Router + Chart.js.

## Arranque

```bash
npm install
npm run dev
```

Se abrirá en `http://localhost:5173`.

## Estructura

```
src/
  components/     Componentes reutilizables (Sidebar, Topbar, StatCard...)
  layouts/        DashboardLayout: sidebar + topbar + <Outlet />
  pages/          Una página por módulo (Dashboard, Vehículos, Inventario...)
  nav.config.js   Fuente única de verdad para la navegación del sidebar
```

## Módulos incluidos (con datos de muestra, listos para conectar al backend Flask)

- **Dashboard** (`/dashboard`) — tarjetas de estadísticas + gráfica de consumo mensual (Chart.js)
- **Vehículos** (`/vehiculos`) — catálogo de unidades
- **Inventario** (`/inventario`) — stock de refacciones con alerta de stock bajo
- **Mantenimientos** (`/mantenimientos`) — historial de intervenciones
- **Reportes** (`/reportes`) — disparadores de generación de PDF (ReportLab en backend)
- **Usuarios** (`/usuarios`) — administración de accesos
- **Login** (`/login`) — formulario listo para conectar a `/api/auth/login` (JWT)

Cada página trae datos de ejemplo marcados con `// TODO` en el punto exacto donde debe
ir el `fetch`/`axios` a tu API Flask.

## Próximos pasos sugeridos

1. Crear un cliente HTTP centralizado (`src/api/client.js`) que agregue el header
   `Authorization: Bearer <token>` automáticamente.
2. Proteger las rutas del `DashboardLayout` verificando el token (redirigir a `/login` si no existe).
3. Reemplazar los arrays de ejemplo en cada página por llamadas reales a la API.
