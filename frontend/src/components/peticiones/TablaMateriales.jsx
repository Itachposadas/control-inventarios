// src/components/peticiones/TablaMateriales.jsx
// Materiales de una solicitud de área: cantidad, unidad, concepto, precio unitario
// y total (este último lo calcula el backend: cantidad × precio unitario).

const pesos = (n) => Number(n || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

const cantidad = (n) => Number(n).toLocaleString("es-MX", { maximumFractionDigits: 2 });

export default function TablaMateriales({ materiales = [], total }) {
  return (
    <div className="rounded-xl border border-slate-200 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
            <th className="text-right font-medium px-3 py-2">Cant.</th>
            <th className="text-left font-medium px-3 py-2">Unidad</th>
            <th className="text-left font-medium px-3 py-2 w-full">Concepto</th>
            <th className="text-right font-medium px-3 py-2 whitespace-nowrap">P. unitario</th>
            <th className="text-right font-medium px-3 py-2">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {materiales.map((m) => (
            <tr key={m.id}>
              <td className="px-3 py-2 text-right tabular-nums">{cantidad(m.cantidad)}</td>
              <td className="px-3 py-2 whitespace-nowrap">{m.unidad_medida}</td>
              <td className="px-3 py-2 break-words">{m.concepto}</td>
              <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{pesos(m.precio_unitario)}</td>
              <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap font-medium">{pesos(m.total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-slate-200 bg-slate-50">
            <td colSpan={4} className="px-3 py-2 text-right font-semibold text-slate-600">Total</td>
            <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap font-semibold text-slate-800">{pesos(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
