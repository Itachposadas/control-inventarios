// src/components/peticiones/EditorMateriales.jsx
// Lista editable de materiales (cantidad, unidad de medida y concepto).
// La unidad de medida es texto libre: cada quien escribe la que use
// (palabra o número, ej. "Litro", "Juego", "4 L").
// La usan la solicitud del área y la solicitud de materiales a administración.
//   const [materiales, setMateriales] = useState(() => [materialVacio()]);
//   <EditorMateriales materiales={materiales} onChange={setMateriales} />
//   etiquetaConcepto: título de la columna del concepto (ej. "Descripción")
//   minimo: cuántos deben quedar como mínimo (0 permite dejar la lista vacía)
//   nombre / plural: cómo se llama cada renglón (ej. "refacción" / "refacciones")
//   erroresMateriales(materiales) → { "<id>:<campo>": aviso } de los campos vacíos;
//   se pasan como `errores` para mostrar el aviso bajo cada campo
import { Boton, AvisoCampo, inputClass } from "../ui";
import { Plus, Trash2 } from "lucide-react";

// Columnas de la tabla en escritorio
const COLUMNAS = "md:grid md:grid-cols-[7rem_11rem_1fr_2.5rem]";

let siguienteId = 1;
export const materialVacio = (datos = {}) => ({
  cantidad: "1", unidad_medida: "", concepto: "", ...datos, id: siguienteId++,
});

export function erroresMateriales(materiales) {
  const errores = {};
  for (const m of materiales) {
    if (!(Number(m.cantidad) > 0)) errores[`${m.id}:cantidad`] = "Escribe una cantidad mayor a 0";
    if (!String(m.unidad_medida).trim()) errores[`${m.id}:unidad_medida`] = "Rellena la unidad de medida";
    if (!m.concepto.trim()) errores[`${m.id}:concepto`] = "Rellena la descripción";
  }
  return errores;
}

// Lo que se manda al backend (sin el id interno de la lista)
export const paraEnviar = (materiales) =>
  materiales.map(({ cantidad, unidad_medida, concepto }) => ({ cantidad, unidad_medida, concepto }));

export default function EditorMateriales({
  materiales, onChange, etiquetaConcepto = "Concepto", minimo = 1, nombre = "material", plural = "materiales",
  errores = {}, onLimpiar = () => {},
}) {
  const cambiar = (id, campo, valor) => {
    onChange(materiales.map((m) => (m.id === id ? { ...m, [campo]: valor } : m)));
    onLimpiar(`${id}:${campo}`);
  };
  const Nombre = nombre.charAt(0).toUpperCase() + nombre.slice(1);
  const quitar = (id) => onChange(materiales.filter((m) => m.id !== id));
  const agregar = () => onChange([...materiales, materialVacio()]);

  return (
    <div>
      {/* Encabezados de la tabla (escritorio); sin renglones no se muestran */}
      <div className={`hidden ${materiales.length ? COLUMNAS : ""} gap-2 px-1
                      text-[11px] font-semibold uppercase tracking-wide text-slate-500`}>
        <span>Cantidad</span>
        <span>Unidad de medida</span>
        <span>{etiquetaConcepto}</span>
        <span />
      </div>

      <ul className="mt-3 md:mt-2 space-y-3 md:space-y-2">
        {materiales.map((m, i) => (
          <li
            key={m.id}
            className={`grid grid-cols-2 ${COLUMNAS} gap-2 md:items-center
                       p-3 md:p-1 rounded-xl border border-slate-200 md:border-0 animate-fade-in`}
          >
            <p className="col-span-2 md:hidden text-xs font-semibold text-slate-500">{Nombre} {i + 1}</p>
            <Celda etiqueta="Cantidad" error={errores[`${m.id}:cantidad`]}>
              <input
                type="number"
                min="0.01"
                step="any"
                inputMode="decimal"
                value={m.cantidad}
                onChange={(e) => cambiar(m.id, "cantidad", e.target.value)}
                aria-label={`Cantidad de ${nombre} ${i + 1}`}
                className={`${inputClass} text-center`}
              />
            </Celda>
            <Celda etiqueta="Unidad de medida" error={errores[`${m.id}:unidad_medida`]}>
              <input
                value={m.unidad_medida}
                onChange={(e) => cambiar(m.id, "unidad_medida", e.target.value)}
                maxLength={30}
                aria-label={`Unidad de medida de ${nombre} ${i + 1}`}
                className={inputClass}
              />
            </Celda>
            <Celda etiqueta={etiquetaConcepto} className="col-span-2 md:col-span-1" error={errores[`${m.id}:concepto`]}>
              <input
                value={m.concepto}
                onChange={(e) => cambiar(m.id, "concepto", e.target.value)}
                maxLength={255}
                aria-label={`${etiquetaConcepto} ${i + 1}`}
                className={inputClass}
                autoFocus={i > 0 && i === materiales.length - 1 && !m.concepto}
              />
            </Celda>
            <div className="col-span-2 md:col-span-1 flex justify-end">
              <button
                type="button"
                onClick={() => quitar(m.id)}
                disabled={materiales.length <= minimo}
                aria-label={`Quitar ${nombre} ${i + 1}`}
                title="Quitar"
                className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition
                           disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500 disabled:cursor-not-allowed"
              >
                <Trash2 size={17} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <Boton variante="contorno" onClick={agregar} icono={<Plus size={16} />} className="self-start">
          Agregar {nombre}
        </Boton>
        <p className="text-sm text-slate-600 sm:text-right">
          {materiales.length} {materiales.length === 1 ? nombre : plural}
        </p>
      </div>
    </div>
  );
}

// En celular cada campo lleva su etiqueta; en escritorio la da el encabezado de la tabla
function Celda({ etiqueta, className = "", error, children }) {
  return (
    <div className={`min-w-0 self-start ${className}`} data-error={error ? "" : undefined}>
      <label className="block">
        <span className="md:hidden block text-xs font-medium text-slate-600 mb-1">{etiqueta}</span>
        {children}
      </label>
      {error && <AvisoCampo>{error}</AvisoCampo>}
    </div>
  );
}
