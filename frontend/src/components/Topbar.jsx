// src/components/Topbar.jsx
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLE_COLOR, ROLE_LABEL, ROLES, VEHICULOS_BASE } from "../config/roles";
import { ESTADO_LABEL, SOLICITUDES_BASE, formatFecha } from "../config/solicitudes";
import { generalApi } from "../api/general";
import {
  Bell, Search, Car, ClipboardList, Loader2, X, UserCog, LogOut, CheckCircle2, Wrench,
} from "lucide-react";

// Cierra un menú al hacer clic fuera de él
function useClickFuera(ref, onFuera) {
  const callback = useRef(onFuera);
  callback.current = onFuera;
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) callback.current();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref]);
}

export default function Topbar({ onToggleSidebar, title = "Panel", subtitle = "" }) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userRef = useRef(null);
  useClickFuera(userRef, () => setUserMenuOpen(false));

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const roleLabel = ROLE_LABEL[role] || "Usuario";
  const roleColor = ROLE_COLOR[role] || "bg-slate-500";
  const base = role === ROLES.ADMIN ? "/admin" : "/mecanico";

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="h-16 px-4 sm:px-6 flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
          aria-label="Abrir menú"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Título + subtítulo (desktop) */}
        <div className="hidden lg:block min-w-0">
          <h1 className="text-base font-semibold text-slate-800 leading-tight truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-slate-500 leading-tight mt-0.5 truncate">{subtitle}</p>
          )}
        </div>

        {/* Buscador */}
        <div className="flex-1 max-w-md mx-auto lg:mx-6">
          <Buscador role={role} />
        </div>

        {/* Notificaciones */}
        <Notificaciones role={role} />

        {/* Usuario */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setUserMenuOpen((s) => !s)}
            className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <div className={`w-8 h-8 rounded-full ${roleColor} flex items-center justify-center
                            text-white text-sm font-semibold shrink-0`}>
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-slate-800 leading-tight">{user?.username}</p>
              <p className="text-xs text-slate-500 leading-tight">{roleLabel}</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2" className="hidden sm:block text-slate-500">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-40
                            origin-top-right animate-pop">
              <div className="px-4 py-3 border-b border-slate-200">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {user?.nombre_completo || user?.username}
                </p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => { setUserMenuOpen(false); navigate(`${base}/mi-cuenta`); }}
                className="w-full flex items-center gap-2 text-left px-4 py-2 text-sm text-slate-700
                           hover:bg-slate-50 hover:text-institucional transition"
              >
                <UserCog size={16} />
                Mi cuenta
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 text-left px-4 py-2 text-sm text-slate-700
                           hover:bg-slate-50 hover:text-institucional transition"
              >
                <LogOut size={16} />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ═════════════ Buscador global ═════════════ */

function Buscador({ role }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [res, setRes] = useState({ vehiculos: [], solicitudes: [] });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickFuera(ref, () => setOpen(false));

  useEffect(() => {
    const texto = q.trim();
    if (texto.length < 2) {
      setRes({ vehiculos: [], solicitudes: [] });
      return;
    }
    let cancel = false;
    setLoading(true);
    const timer = setTimeout(() => {
      generalApi
        .buscar(texto)
        .then((data) => !cancel && setRes(data))
        .catch(() => !cancel && setRes({ vehiculos: [], solicitudes: [] }))
        .finally(() => !cancel && setLoading(false));
    }, 250);
    return () => {
      cancel = true;
      clearTimeout(timer);
    };
  }, [q]);

  const ir = (ruta) => {
    setOpen(false);
    setQ("");
    navigate(ruta);
  };

  const irVehiculo = (v) => ir(`${VEHICULOS_BASE[role]}/${v.id}`);
  const irSolicitud = (s) => ir(`${SOLICITUDES_BASE[role]}/${s.id}`);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setOpen(false);
      e.currentTarget.blur();
    }
    if (e.key === "Enter") {
      // Enter abre el primer resultado
      if (res.solicitudes[0] && /^sol/i.test(q.trim())) irSolicitud(res.solicitudes[0]);
      else if (res.vehiculos[0]) irVehiculo(res.vehiculos[0]);
      else if (res.solicitudes[0]) irSolicitud(res.solicitudes[0]);
    }
  };

  const hayTexto = q.trim().length >= 2;
  const sinResultados = hayTexto && !loading && !res.vehiculos.length && !res.solicitudes.length;

  return (
    <div className="relative" ref={ref}>
      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
      <input
        type="text"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Buscar vehículo, placas o folio..."
        aria-label="Buscar"
        className="w-full pl-10 pr-9 py-2 rounded-lg bg-slate-100 border border-transparent
                   text-sm text-slate-700 placeholder-slate-400
                   focus:outline-none focus:bg-white focus:border-institucional/40
                   focus:ring-2 focus:ring-institucional/15 transition"
      />
      {loading ? (
        <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 animate-spin" />
      ) : q && (
        <button
          onClick={() => setQ("")}
          aria-label="Limpiar búsqueda"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-slate-500 hover:text-slate-600"
        >
          <X size={14} />
        </button>
      )}

      {open && hayTexto && (
        <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-200
                        z-40 max-h-[70vh] overflow-y-auto py-1 origin-top animate-pop">
          {res.vehiculos.length > 0 && (
            <Grupo titulo="Vehículos">
              {res.vehiculos.map((v) => (
                <Resultado
                  key={`v${v.id}`}
                  icon={<Car size={16} />}
                  titulo={v.nombre}
                  detalle={v.detalle}
                  extra={v.estado === "mantenimiento" ? "En taller" : v.estado === "baja" ? "Baja" : null}
                  onClick={() => irVehiculo(v)}
                />
              ))}
            </Grupo>
          )}
          {res.solicitudes.length > 0 && (
            <Grupo titulo="Servicios">
              {res.solicitudes.map((s) => (
                <Resultado
                  key={`s${s.id}`}
                  icon={<ClipboardList size={16} />}
                  titulo={s.folio}
                  detalle={s.vehiculo}
                  extra={ESTADO_LABEL[s.estado]}
                  onClick={() => irSolicitud(s)}
                />
              ))}
            </Grupo>
          )}
          {sinResultados && (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              Sin resultados para “{q.trim()}”
            </p>
          )}
          {loading && !res.vehiculos.length && !res.solicitudes.length && (
            <p className="px-4 py-6 text-center text-sm text-slate-500">Buscando...</p>
          )}
        </div>
      )}
    </div>
  );
}

function Grupo({ titulo, children }) {
  return (
    <div className="py-1">
      <p className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-widest text-slate-500 font-semibold">{titulo}</p>
      {children}
    </div>
  );
}

function Resultado({ icon, titulo, detalle, extra, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-slate-50 transition"
    >
      <span className="w-8 h-8 rounded-lg bg-institucional/10 text-institucional flex items-center justify-center shrink-0">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-slate-800 truncate">{titulo}</span>
        {detalle && <span className="block text-xs text-slate-500 truncate">{detalle}</span>}
      </span>
      {extra && (
        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
          {extra}
        </span>
      )}
    </button>
  );
}

/* ═════════════ Notificaciones ═════════════ */

const REFRESCO_MS = 60_000;

// Último total visto. Vive fuera del componente porque la barra superior se
// vuelve a montar en cada pantalla; así la campana solo "suena" si de verdad
// llegaron pendientes nuevos (y no cada vez que se cambia de página).
// Se guarda junto con el rol para no compararlo con la sesión de otra persona.
let ultimoVisto = { role: null, total: 0 };

function Notificaciones({ role }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState({ total: 0, items: [] });
  const [open, setOpen] = useState(false);
  const [sonando, setSonando] = useState(false);
  const ref = useRef(null);
  useClickFuera(ref, () => setOpen(false));

  // Se actualiza al cambiar de pantalla y cada minuto
  useEffect(() => {
    let cancel = false;
    const cargar = () =>
      generalApi
        .notificaciones()
        .then((d) => {
          if (cancel) return;
          if (ultimoVisto.role === role && d.total > ultimoVisto.total) setSonando(true);
          ultimoVisto = { role, total: d.total };
          setData(d);
        })
        .catch(() => {});
    cargar();
    const timer = setInterval(cargar, REFRESCO_MS);
    return () => {
      cancel = true;
      clearInterval(timer);
    };
  }, [location.pathname, role]);

  const abrir = (n) => {
    setOpen(false);
    navigate(`${SOLICITUDES_BASE[role]}/${n.solicitud_id}`);
  };

  const vacio = role === ROLES.ADMIN
    ? "No hay servicios pendientes de entregar"
    : "No tienes servicios en proceso";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600"
        aria-label={`Notificaciones${data.total ? ` (${data.total})` : ""}`}
      >
        <Bell
          size={20}
          className={`origin-top ${sonando ? "animate-ring" : ""}`}
          onAnimationEnd={() => setSonando(false)}
        />
        {data.total > 0 && (
          <span
            key={data.total}
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full
                       bg-institucional text-white text-[10px] font-bold flex items-center justify-center animate-pop"
          >
            {data.total > 9 ? "9+" : data.total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-lg
                        border border-slate-200 z-40 overflow-hidden origin-top-right animate-pop">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-800">Pendientes</p>
            <p className="text-xs text-slate-500">
              {role === ROLES.ADMIN ? "Servicios listos para capturar costo y entregar" : "Tus servicios en el taller"}
            </p>
          </div>
          {data.items.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <CheckCircle2 size={28} className="mx-auto text-emerald-500" />
              <p className="mt-2 text-sm text-slate-500">{vacio}</p>
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {data.items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => abrir(n)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition"
                  >
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                        ${n.tipo === "entregar" ? "bg-emerald-100 text-emerald-700"
                          : n.tipo === "reasignada" ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"}`}
                    >
                      {n.tipo === "entregar" ? <CheckCircle2 size={16} /> : <Wrench size={16} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-800">{n.titulo}</span>
                      <span className="block text-xs text-slate-500 truncate">{n.texto}</span>
                      <span className="block text-[11px] text-slate-500 mt-0.5">
                        {n.estado ? `${ESTADO_LABEL[n.estado]} · ` : ""}{formatFecha(n.fecha, true)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
