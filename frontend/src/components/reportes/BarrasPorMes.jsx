// src/components/reportes/BarrasPorMes.jsx
// Barras de una sola serie (sin leyenda: el título la nombra).
// Se expone el chart por ref para exportarlo como imagen al PDF.
import { forwardRef } from "react";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const GUINDA = "#9F2241";

const BarrasPorMes = forwardRef(function BarrasPorMes({ labels, values, formato = (v) => v }, ref) {
  const data = {
    labels,
    datasets: [{
      data: values,
      backgroundColor: GUINDA,
      hoverBackgroundColor: "#7d1a33",
      borderRadius: { topLeft: 4, topRight: 4 },
      borderSkipped: "bottom",
      maxBarThickness: 32,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1e293b",
        padding: 10,
        displayColors: false,
        callbacks: { label: (ctx) => formato(ctx.parsed.y) },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { color: "#e2e8f0" },
        ticks: { color: "#64748b", font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: "#f1f5f9" },
        border: { display: false },
        ticks: { color: "#94a3b8", font: { size: 11 }, callback: (v) => formato(v), maxTicksLimit: 5, precision: 0 },
      },
    },
  };

  return <Bar ref={ref} data={data} options={options} />;
});

export default BarrasPorMes;
