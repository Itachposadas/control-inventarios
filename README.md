# Control del Parque Vehicular · Atlacomulco

Sistema web de la **Coordinación de Parque Vehicular del Municipio de Atlacomulco** para
llevar el control de los servicios de mantenimiento de las unidades: solicitudes de las
áreas, diagnóstico, ingreso a taller, órdenes de compra, evidencia fotográfica, entrega,
historial por vehículo, préstamo de herramientas y reportes.

| Parte | Tecnología |
|---|---|
| Frontend | React 18 + Vite 5 + Tailwind CSS 3 (gestor de paquetes: **pnpm**) |
| Backend | Python 3 + Flask 3 + SQLAlchemy + JWT |
| Base de datos | MySQL / MariaDB |
| Formatos | PDF (jsPDF) en el navegador; Excel (openpyxl) en el servidor |

## Estructura

```
control-inventarios/
├── backend/            API en Flask
│   ├── app.py          arranque, rutas y migraciones automáticas de columnas
│   ├── models.py       tablas (SQLAlchemy)
│   ├── routes/         endpoints por módulo (/api/...)
│   ├── seguridad.py    reglas de contraseñas y bloqueo por intentos
│   ├── preventivo.py   avisos de mantenimiento preventivo
│   ├── reporte_excel.py
│   └── init_db.py      crea tablas y usuarios iniciales
└── frontend/           aplicación React
    └── src/
        ├── pages/      pantallas
        ├── components/ piezas reutilizables (ui/, dashboard/, servicio/…)
        ├── api/        llamadas al backend
        ├── config/     menús, roles, colores, reglas
        └── utils/      generadores de PDF
```

## Requisitos

- **Python 3.11+**
- **Node.js 20+** y **pnpm** (`npm install -g pnpm`)
- **MySQL 8** o **MariaDB 10.6+**

## Instalación

### 1. Base de datos

Crea una base vacía en MySQL:

```sql
CREATE DATABASE control_inventarios CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows  (Linux/macOS: source venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env         # Linux/macOS: cp .env.example .env
```

Llena `backend/.env`:

| Variable | Qué es |
|---|---|
| `SECRET_KEY`, `JWT_SECRET_KEY` | Claves largas y distintas. Genéralas con `python -c "import secrets; print(secrets.token_hex(32))"` |
| `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME` | Conexión a MySQL |
| `FLASK_ENV` | `development` solo en desarrollo (activa el modo debug) |
| `SEED_PASSWORD` | Opcional: contraseña de los usuarios iniciales |

Crea las tablas y los usuarios iniciales (`admin` y `mecanico`):

```bash
python init_db.py
```

Si no pusiste `SEED_PASSWORD`, la contraseña se muestra **una sola vez** en la consola.
Es temporal: al entrar, el sistema pide cambiarla.

Arranca el backend (queda en `http://127.0.0.1:5000`):

```bash
python app.py
```

Al arrancar, el backend crea las tablas y columnas nuevas que falten (nunca borra datos).

### 3. Frontend

```bash
cd frontend
pnpm install
pnpm dev          # http://localhost:5173
```

Si el backend no está en `127.0.0.1:5000`, crea `frontend/.env` con:

```
VITE_API_URL=http://servidor:5000/api
```

## Comandos del frontend

| Comando | Para qué |
|---|---|
| `pnpm dev` | Servidor de desarrollo con recarga automática |
| `pnpm build` | Versión para producción en `frontend/dist/` |
| `pnpm preview` | Probar la versión de producción |
| `pnpm lint` | Revisar el código con ESLint |

## Roles

| Rol | Qué hace |
|---|---|
| **Administrador** | Usuarios, vehículos, órdenes de compra (proveedor y precios), costos, reportes |
| **Parque vehicular** | Atiende solicitudes y lleva cada servicio: diagnóstico, ingreso, orden de compra, fotos y entrega |
| **Área** | Cuenta compartida de un área: pide servicio para sus vehículos y consulta el seguimiento |

## Seguridad

- Contraseñas de al menos **8 caracteres**, con letras y números, sin el nombre de usuario.
- Las contraseñas que asigna el administrador son **temporales**: se cambian al entrar.
  Las anteriores que no cumplen las reglas (ej. `123456`) también se piden cambiar.
- **5 intentos fallidos** bloquean la cuenta 15 minutos; el administrador puede desbloquearla.
- La sesión dura 1 hora y se **renueva sola** mientras se usa el sistema; si no hay
  actividad, avisa 2 minutos antes de cerrarse.
- El archivo `backend/.env` y la carpeta `backend/uploads/` (fotos) **no se suben a git**.

## Respaldo

La información vive en la base de datos y en `backend/uploads/` (fotos de evidencia).
Respalda ambas:

```bash
mysqldump -u USUARIO -p control_inventarios > respaldo_AAAA-MM-DD.sql
```

y copia la carpeta `backend/uploads/` junto con el archivo `.sql`.
