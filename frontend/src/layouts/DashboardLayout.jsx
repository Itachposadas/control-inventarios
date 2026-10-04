// src/layouts/DashboardLayout.jsx
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Topbar from "../components/Topbar";
import SystemStatus from "../components/layout/SystemStatus";

export default function DashboardLayout({
  children,
  menu = [],
  secondaryMenu = [],
  title = "Panel",
  subtitle = "",
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (item) => {
    if (!item.to) return false;
    const current = location.pathname;
    if (current === item.to) return true;
    const rootPaths = ["/admin", "/mecanico"];
    if (rootPaths.includes(item.to)) return false;
    return current.startsWith(item.to + "/");
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex">
      {/* ══════════ SIDEBAR ══════════ */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-white border-r border-slate-200
          flex flex-col
          transform transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Logo */}
        <div className="h-16 px-4 border-b border-slate-200 flex items-center gap-3">
          <img
            src="/logo-atlacomulco.png"
            alt="Logo Atlacomulco"
            className="h-11 w-auto object-contain shrink-0"
          />
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide whitespace-nowrap text-[#9F2241] font-semibold leading-tight">
              Parque Vehicular
            </p>
            <p className="text-xs text-slate-500 leading-tight truncate">
              Atlacomulco
            </p>
          </div>
        </div>

        {/* Navegación principal */}
        <nav className="flex-1 overflow-y-auto py-3">
          <p className="px-5 py-2 text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
            Navegación
          </p>

          <ul className="space-y-1 px-2">
            {menu.map((item) => {
              const active = isActive(item);
              return (
                <li key={item.label}>
                  <button
                    onClick={() => {
                      if (item.onClick) item.onClick();
                      if (item.to) navigate(item.to);
                      setSidebarOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                      text-sm font-medium transition text-left relative
                      ${
                        active
                          ? "bg-[#9F2241] text-white shadow-sm"
                          : "text-slate-700 hover:bg-[#9F2241]/5 hover:text-[#9F2241]"
                      }
                    `}
                  >
                    <span
                      className={`w-5 h-5 flex items-center justify-center transition
                        ${active ? "text-white" : "text-slate-400 group-hover:text-[#9F2241]"}`}
                    >
                      {item.icon}
                    </span>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded
                          ${active ? "bg-white text-[#9F2241]" : "bg-[#9F2241] text-white"}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Sección secundaria */}
          {secondaryMenu.length > 0 && (
            <>
              <p className="px-5 pt-5 pb-2 text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
                Sistema
              </p>
              <ul className="space-y-1 px-2">
                {secondaryMenu.map((item) => (
                  <li key={item.label}>
                    <button
                      onClick={() => item.to && navigate(item.to)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                                 text-sm text-slate-600 hover:bg-slate-100
                                 hover:text-slate-800 transition text-left"
                    >
                      <span className="w-5 h-5 flex items-center justify-center text-slate-400">
                        {item.icon}
                      </span>
                      <span className="flex-1">{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Indicador de sistema */}
          <SystemStatus />
        </nav>

      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ══════════ CONTENIDO ══════════ */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          onToggleSidebar={() => setSidebarOpen((s) => !s)}
          title={title}
          subtitle={subtitle}
        />

        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {/* key = ruta: al cambiar de pantalla el contenido entra con una animación suave */}
          <div key={location.pathname} className="animate-page-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}