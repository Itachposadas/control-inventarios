// src/components/vehiculos/StatsVehiculo.jsx
import { Wrench, CheckCircle2, Clock, DollarSign, Calendar } from "lucide-react";

export default function StatsVehiculo({ stats }) {
  const cards = [
    {
      label: "Servicios totales",
      value: stats.total,
      icon: <Wrench size={18} />,
      color: "text-[#9F2241]",
      bg: "bg-[#9F2241]/10",
    },
    {
      label: "Completados",
      value: stats.completados,
      icon: <CheckCircle2 size={18} />,
      color: "text-emerald-700",
      bg: "bg-emerald-100",
    },
    {
      label: "En proceso",
      value: stats.enProceso,
      icon: <Clock size={18} />,
      color: "text-amber-700",
      bg: "bg-amber-100",
    },
    {
      label: "Costo acumulado",
      value: `$${stats.costoTotal.toLocaleString("es-MX")}`,
      icon: <DollarSign size={18} />,
      color: "text-blue-700",
      bg: "bg-blue-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="bg-white rounded-2xl border border-slate-200 p-4
                     shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
        >
          <div className={`w-9 h-9 rounded-lg ${c.bg} ${c.color}
                           flex items-center justify-center`}>
            {c.icon}
          </div>
          <p className="mt-3 text-xl font-bold text-slate-800 leading-none">
            {c.value}
          </p>
          <p className="mt-1 text-xs text-slate-500">{c.label}</p>
        </div>
      ))}
    </div>
  );
}