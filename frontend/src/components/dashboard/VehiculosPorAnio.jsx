// src/components/dashboard/VehiculosPorAnio.jsx
// Cuántas unidades hay de cada año de modelo, en barras (cada año es una
// categoría: una línea curva inventaba valores entre años).
import BarrasPorMes from "../reportes/BarrasPorMes";

export default function VehiculosPorAnio({ data = [], sinAnio = 0 }) {
  // data = [{ anio: "2003", total: 5 }, ...]; sinAnio = unidades sin año válido en "modelo"
  const labels = data.map((d) => d.anio);
  const values = data.map((d) => d.total);

  const conAnio = values.reduce((a, b) => a + b, 0);
  const total = conAnio + sinAnio;
  const max = Math.max(...values, 0);
  const anioMax = max ? labels[values.indexOf(max)] : "—";
  const masNuevo = labels.length ? labels[labels.length - 1] : "—";

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-900">Vehículos por año de modelo</h2>
        <p className="text-xs text-slate-500 mt-0.5">Cuántas unidades hay de cada año</p>
      </div>

      <div className="p-5">
        <div className="h-64">
          {labels.length > 0 ? (
            <BarrasPorMes labels={labels} values={values} formato={(v) => `${v} ${v === 1 ? "vehículo" : "vehículos"}`} formatoEje={(v) => v} />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
              Ningún vehículo tiene año de modelo registrado
            </div>
          )}
        </div>

        <dl className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-3 gap-3 text-center">
          <div>
            <dt className="text-xs text-slate-500">Total de vehículos</dt>
            <dd className="mt-1 text-lg font-semibold text-slate-800 tabular-nums">{total}</dd>
          </div>
          <div className="border-x border-slate-100">
            <dt className="text-xs text-slate-500">Año más común</dt>
            <dd className="mt-1 text-lg font-semibold text-slate-800 tabular-nums">{anioMax}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Modelo más nuevo</dt>
            <dd className="mt-1 text-lg font-semibold text-slate-800 tabular-nums">{masNuevo}</dd>
          </div>
        </dl>

        {sinAnio > 0 && (
          <p className="mt-3 text-center text-xs text-slate-500">
            {sinAnio} {sinAnio === 1 ? "vehículo no tiene" : "vehículos no tienen"} año registrado
            en su modelo; se cuentan en el total pero no en la gráfica.
          </p>
        )}
      </div>
    </section>
  );
}
