// src/components/peticiones/TablaMateriales.jsx
// Materiales de una solicitud de área: cantidad, unidad, concepto, precio unitario
// y total. El área captura los tres primeros; el precio unitario lo captura el
// admin y el total (cantidad × precio) lo calcula el backend.

const pesos = (n) => Number(n || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

const cantidad = (n) => Number(n).toLocaleString("es-MX", { maximumFractionDigits: 2 });

const PorCapturar = () => <span className="text-slate-400 italic">Por capturar</span>;

export default function TablaMateriales({ materiales = [], total }) {
  const completos = materiales.length > 0 && materiales.every((m) => m.precio_unitario != null);

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
              <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                {m.precio_unitario != null ? pesos(m.precio_unitario) : <PorCapturar />}
              </td>
              <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap font-medium">
                {m.total != null ? pesos(m.total) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-slate-200 bg-slate-50">
            <td colSpan={4} className="px-3 py-2 text-right font-semibold text-slate-600">
              Total{total != null && !completos && <span className="font-normal text-slate-500"> (parcial)</span>}
            </td>
            <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap font-semibold text-slate-800">
              {total != null ? pesos(total) : <PorCapturar />}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
