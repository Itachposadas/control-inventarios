# Parque Vehicular · Atlacomulco (Frontend)

Aplicación React + Vite + Tailwind CSS. La instalación completa del sistema
(backend, base de datos y variables de entorno) está en el [README principal](../README.md).

```bash
pnpm install
pnpm dev      # http://localhost:5173
pnpm lint     # revisión del código con ESLint
pnpm build    # versión para producción en dist/
```

## Estructura de `src/`

| Carpeta | Contenido |
|---|---|
| `pages/` | Una carpeta por módulo (solicitudes, historial, reportes, usuarios…) |
| `components/ui/` | Piezas base: `Boton`, `Alerta`, `Modal`, `Paginacion`, campos de formulario |
| `components/` | Piezas por módulo (`servicio/`, `dashboard/`, `vehiculos/`…) |
| `api/` | Llamadas al backend; `client.js` agrega el token y maneja la sesión |
| `context/AuthContext.jsx` | Sesión: entrar, salir, renovación automática y aviso de inactividad |
| `config/` | Menús, roles, colores (`colors.js` es la única fuente de la paleta) y reglas de contraseña |
| `utils/` | Generadores de PDF de los formatos y del reporte |
