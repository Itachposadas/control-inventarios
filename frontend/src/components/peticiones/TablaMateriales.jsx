// src/components/peticiones/TablaMateriales.jsx
// Materiales de una solicitud de área: cantidad, unidad de medida y concepto.
// Los precios se capturan después, en la orden de compra.

const cantidad = (n) => Number(n).toLocaleString("es-MX", { maximumFractionDigits: 2 });

export default function TablaMateriales({ materiales = [] }) {
  return (
    <div className="rounded-xl border border-slate-200 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
            <th className="text-right font-medium px-3 py-2">Cant.</th>
            <th className="text-left font-medium px-3 py-2">Unidad</th>
            <th className="text-left font-medium px-3 py-2 w-full">Concepto</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {materiales.map((m) => (
            <tr key={m.id}>
              <td className="px-3 py-2 text-right tabular-nums">{cantidad(m.cantidad)}</td>
              <td className="px-3 py-2 whitespace-nowrap">{m.unidad_medida}</td>
              <td className="px-3 py-2 break-words">{m.concepto}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
