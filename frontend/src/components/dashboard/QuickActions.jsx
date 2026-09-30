// src/components/dashboard/QuickActions.jsx
import { useNavigate } from "react-router-dom";
import { Car, UserPlus } from "lucide-react";

export default function QuickActions({ items }) {
  const navigate = useNavigate();

  const defaultItems = [
    {
      label: "Registrar vehículo",
      icon: <Car size={16} />,
      accent: "#9F2241",
      to: "/admin/vehiculos?nuevo=1",
    },
    {
      label: "Registrar usuario",
      icon: <UserPlus size={16} />,
      accent: "#2563EB",
      to: "/admin/usuarios?nuevo=1",
    },
  ];

  const list = items || defaultItems;

  return (
    <div className="bg-white rounded-2xl border border-slate-200
                    shadow-[0_1px_3px_rgba(15,23,42,0.04)] px-5 py-3.5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800">Acciones rápidas</h3>
        <span className="text-[11px] text-slate-400">Atajos frecuentes</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {list.map((item) => (
          <button
            key={item.label}
            onClick={() => item.to && navigate(item.to)}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg
                       border border-slate-200 bg-slate-50/50
                       hover:bg-white hover:border-[#9F2241]/30
                       hover:shadow-[0_2px_8px_rgba(159,34,65,0.08)]
                       transition text-left group"
          >
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center
                         transition group-hover:scale-110 shrink-0"
              style={{
                background: `${item.accent}14`,
                color: item.accent,
              }}
            >
              {item.icon}
            </span>
            <span className="text-xs font-medium text-slate-700 leading-tight truncate">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}