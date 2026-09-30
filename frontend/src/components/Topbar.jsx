// src/components/Topbar.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLE_COLOR, ROLE_LABEL } from "../config/roles";
import { Bell } from "lucide-react";

export default function Topbar({ onToggleSidebar, title = "Panel", subtitle = "" }) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const roleLabel = ROLE_LABEL[role] || "Usuario";
  const roleColor = ROLE_COLOR[role] || "bg-slate-500";

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
        <div className="hidden lg:block">
          <h1 className="text-base font-semibold text-slate-800 leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-500 leading-tight mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {/* Buscador */}
        <div className="flex-1 max-w-md mx-auto lg:mx-6">
          <div className="relative">
            <svg
              width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Buscar folio, vehículo, área..."
              className="w-full pl-10 pr-3 py-2 rounded-lg
                         bg-slate-100 border border-transparent
                         text-sm text-slate-700 placeholder-slate-400
                         focus:outline-none focus:bg-white focus:border-[#9F2241]/40
                         focus:ring-2 focus:ring-[#9F2241]/15
                         transition"
            />
          </div>
        </div>

        {/* Notificaciones */}
        <button
          className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600"
          aria-label="Notificaciones"
        >
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#9F2241]" />
        </button>

        {/* Usuario */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen((s) => !s)}
            className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <div
              className={`w-8 h-8 rounded-full ${roleColor}
                          flex items-center justify-center
                          text-white text-sm font-semibold shrink-0`}
            >
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-slate-800 leading-tight">
                {user?.username}
              </p>
              <p className="text-xs text-slate-500 leading-tight">{roleLabel}</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2"
                 className="hidden sm:block text-slate-400">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg
                              border border-slate-200 py-1 z-40">
                <div className="px-4 py-3 border-b border-slate-200">
                  <p className="text-sm font-semibold text-slate-800">
                    {user?.username}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm
                             text-slate-700 hover:bg-slate-50
                             hover:text-[#9F2241] transition"
                >
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}