// src/components/dashboard/LineChartCard.jsx
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { MoreVertical } from "lucide-react";
import { INSTITUCIONAL } from "../../config/colors";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Filler, Legend
);

export default function LineChartCard({ data = [], sinAnio = 0 }) {
  // data = [{ anio: "2003", total: 5 }, { anio: "2007", total: 3 }, ...]
  // sinAnio = vehículos cuyo "modelo" no tiene un año válido (se cuentan en el total)
  const labels = data.map((d) => d.anio);
  const values = data.map((d) => d.total);

  const conAnio = values.reduce((a, b) => a + b, 0);
  const total = conAnio + sinAnio;
  const promedio = values.length > 0 ? (conAnio / values.length).toFixed(1) : 0;
  const maxIdx = values.indexOf(Math.max(...values));
  const anioMax = labels[maxIdx] || "—";

  const chartData = {
    labels,
    datasets: [
      {
        label: "Vehículos",
        data: values,
        borderColor: INSTITUCIONAL.DEFAULT,
        backgroundColor: "rgba(159, 34, 65, 0.08)",
        tension: 0.4,
        fill: true,
        pointBackgroundColor: INSTITUCIONAL.DEFAULT,
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: "#1e293b", padding: 10, cornerRadius: 8 },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#64748b", font: { size: 11 } },
      },
      y: {
        grid: { color: "#f1f5f9" },
        ticks: { color: "#64748b", font: { size: 11 } },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200
                    shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">
            Vehículos por año (modelo)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Distribución del parque vehicular por año
          </p>
        </div>
        <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
          <MoreVertical size={16} />
        </button>
      </div>

      <div className="p-5">
        <div className="h-64">
          {labels.length > 0 ? (
            <Line data={chartData} options={options} />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
              Sin datos disponibles
            </div>
          )}
        </div>

        <div className="mt-5 pt-5 border-t border-slate-100
                        grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-slate-500">Total vehículos</p>
            <p className="mt-1 text-lg font-bold text-slate-800">{total}</p>
          </div>
          <div className="border-x border-slate-100">
            <p className="text-xs text-slate-500">Promedio por año</p>
            <p className="mt-1 text-lg font-bold text-slate-800">{promedio}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Año más común</p>
            <p className="mt-1 text-lg font-bold text-slate-800">{anioMax}</p>
          </div>
        </div>

        {sinAnio > 0 && (
          <p className="mt-3 text-center text-xs text-slate-500">
            {sinAnio} {sinAnio === 1 ? "vehículo no tiene" : "vehículos no tienen"} año registrado
            en su modelo; se incluyen en el total pero no en la gráfica.
          </p>
        )}
      </div>
    </div>
  );
}