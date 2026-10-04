// src/pages/admin/EnConstruccion.jsx
import { Link } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import { menusForRole } from "../../config/menus";
import { useAuth } from "../../context/AuthContext";
import { Construction, ArrowLeft } from "lucide-react";

export default function EnConstruccion() {
  const { role, homePath } = useAuth();
  const { menu, secondaryMenu } = menusForRole(role);

  return (
    <DashboardLayout
      menu={menu}
      secondaryMenu={secondaryMenu}
      title="En construcción"
    >
      <div className="flex items-center justify-center py-16">
        <div className="bg-white rounded-2xl border border-slate-200
                        shadow-sm p-10 text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-institucional/10
                          flex items-center justify-center
                          text-institucional mx-auto">
            <Construction size={32} />
          </div>
          <h2 className="mt-5 text-xl font-bold text-slate-800">
            En construcción
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Este módulo del sistema estará disponible próximamente.
          </p>
          <Link
            to={homePath}
            className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg
                       bg-institucional hover:bg-institucional-dark text-white
                       text-sm font-medium transition"
          >
            <ArrowLeft size={14} />
            Volver al panel de control
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
