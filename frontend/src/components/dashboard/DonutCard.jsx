// src/components/dashboard/DonutCard.jsx
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { SERIES_GRAFICAS, SERIE_OTRAS } from "../../config/colors";

ChartJS.register(ArcElement, Tooltip, Legend);

// Color fijo por posición (no se repite): 6 áreas + "Otras" en gris neutro.
// La paleta está validada para daltonismo y la leyenda muestra nombre y
// porcentaje, así que nadie depende solo del color.
const colorDe = (item, i) => (item.otras ? SERIE_OTRAS : SERIES_GRAFICAS[i]);

export default function DonutCard({ data = [] }) {
  // Tomamos las 6 áreas con más vehículos + "Otras"
  const sorted = [...data].sort((a, b) => b.total - a.total);
  const top = sorted.slice(0, 6);
  const rest = sorted.slice(6).reduce((s, x) => s + x.total, 0);

  const items = [...top];
  if (rest > 0) items.push({ area: "Otras áreas", total: rest, otras: true });

  const total = items.reduce((s, i) => s + i.total, 0);

  const chartData = {
    labels: items.map((i) => i.area),
    datasets: [
      {
        data: items.map((i) => i.total),
        backgroundColor: items.map(colorDe),
        // 2 px de separación blanca entre rebanadas
        borderColor: "#ffffff",
        borderWidth: 2,
      },
    ],
  };

  const options = {
    cutout: "74%",
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: "#1e293b", padding: 10, cornerRadius: 8 },
    },
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200
                    shadow-[0_1px_3px_rgba(15,23,42,0.04)] h-full">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-800">
          Vehículos por área
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Distribución actual
        </p>
      </div>

      <div className="p-5 flex flex-col items-center">
        {items.length === 0 ? (
          <div className="py-12 text-slate-500 text-sm">
            Sin datos disponibles
          </div>
        ) : (
          <>
            <div className="relative w-44 h-44">
              <Doughnut data={chartData} options={options} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-3xl font-bold text-slate-800">{total}</p>
                <p className="text-xs text-slate-500">vehículos</p>
              </div>
            </div>

            <div className="w-full mt-5 space-y-2">
              {items.map((item, i) => {
                const pct = total > 0
                  ? Math.round((item.total / total) * 100)
                  : 0;
                return (
                  <div
                    key={item.area}
                    className="flex items-center justify-between text-xs gap-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{
                          background: colorDe(item, i),
                        }}
                      />
                      <span className="text-slate-600 truncate">
                        {item.area}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-slate-500">{pct}%</span>
                      <span className="font-semibold text-slate-800 w-6 text-right">
                        {item.total}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}