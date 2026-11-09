// src/components/servicio/PasoDiagnostico.jsx
// Paso 1 del servicio: diagnóstico de fallas presentadas, acciones a realizar /
// observaciones y refacciones a utilizar (piezas a comprar). Las refacciones las
// captura parque vehicular; si hay, sigue la orden de compra. Como referencia se
// muestra la falla que describió el área en su carta de solicitud.
// El formato "Dictamen" se puede descargar en cuanto el diagnóstico y las
// acciones están escritos (antes de guardar, con lo capturado).
import { useState } from "react";
import { Section, Field, TextArea, Boton, Alerta } from "../ui";
import { solicitudesApi } from "../../api/solicitudes";
import EditorMateriales, { materialVacio, erroresMateriales, paraEnviar } from "../peticiones/EditorMateriales";
import { useCamposVacios } from "../../hooks/useCamposVacios";
import { descargarDiagnosticoPdf } from "../../utils/pdfs";
import { ArrowRight, FileDown, Loader2 } from "lucide-react";

const cantidad = (n) => Number(n).toLocaleString("es-MX", { maximumFractionDigits: 2 });

export default function PasoDiagnostico({ s, editable, onGuardado }) {
  if (!editable) return <Resumen s={s} />;
  return <Formulario s={s} onGuardado={onGuardado} />;
}

function Formulario({ s, onGuardado }) {
  const [fallas, setFallas] = useState(s.fallas || "");
  const [acciones, setAcciones] = useState(s.acciones_a_realizar || "");
  // Las que ya tenía (si administración regresó el paso) o, en solicitudes
  // anteriores al cambio, los materiales que pidió el área
  const [refacciones, setRefacciones] = useState(() =>
    (s.refacciones?.length ? s.refacciones : s.peticion?.materiales || []).map((r) =>
      materialVacio({ cantidad: String(r.cantidad), unidad_medida: r.unidad_medida, concepto: r.concepto })
    )
  );
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const { errores, validar, limpiar } = useCamposVacios();

  const guardar = async () => {
    setError("");
    const ok = validar({
      fallas: !fallas.trim() && "Rellena este campo con lo que encontraste al revisar la unidad",
      acciones: !acciones.trim() && "Rellena este campo con el trabajo que requiere la unidad",
      ...erroresMateriales(refacciones),
    });
    if (!ok) return;
    setGuardando(true);
    try {
      onGuardado(await solicitudesApi.diagnostico(s.id, {
        fallas, acciones_a_realizar: acciones, refacciones: paraEnviar(refacciones),
      }));
    } catch (err) {
      setError(err.message || "No se pudo guardar el diagnóstico");
      setGuardando(false);
    }
  };

  const completo = fallas.trim() && acciones.trim();
  const descargar = () =>
    descargarDiagnosticoPdf({ ...s, fallas, acciones_a_realizar: acciones, refacciones: paraEnviar(refacciones) });

  return (
    <Section
      title="1. Diagnóstico"
      subtitle="Opinión del mecánico sobre el estado actual del vehículo"
      actions={<BotonFormato listo={completo} onClick={descargar} falta="Escribe el diagnóstico y las acciones a realizar" />}
    >
      <div className="space-y-5">
        {error && <Alerta>{error}</Alerta>}
        {s.peticion?.descripcion_falla && (
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
            <p className="text-xs font-medium text-slate-500">
              Falla que reportó el área{s.peticion.solicitante_nombre && <> ({s.peticion.solicitante_nombre})</>}
            </p>
            <p className="mt-1 text-sm text-slate-700 whitespace-pre-line break-words">{s.peticion.descripcion_falla}</p>
          </div>
        )}
        <Field label="Diagnóstico de fallas presentadas" required error={errores.fallas}>
          <TextArea
            value={fallas}
            onChange={(v) => {
              setFallas(v);
              limpiar("fallas");
            }}
          />
        </Field>
        <Field label="Acciones a realizar / Observaciones" required error={errores.acciones}>
          <TextArea
            value={acciones}
            onChange={(v) => {
              setAcciones(v);
              limpiar("acciones");
            }}
            rows={3}
          />
        </Field>
        <div>
          <p className="text-sm font-medium text-slate-700">Refacciones a utilizar</p>
          <p className="text-xs text-slate-500 mb-3">
            Piezas que hay que comprar para la reparación; con ellas se hace la orden de compra.
            Si no se necesita ninguna, deja la lista vacía y no habrá orden de compra.
          </p>
          <EditorMateriales
            materiales={refacciones}
            onChange={setRefacciones}
            etiquetaConcepto="Descripción"
            minimo={0}
            nombre="refacción"
            plural="refacciones"
            errores={errores}
            onLimpiar={limpiar}
          />
        </div>
        <div className="flex justify-end">
          <Boton
            onClick={guardar}
            disabled={guardando}
            icono={guardando ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          >
            {guardando ? "Guardando..." : "Guardar diagnóstico y continuar"}
          </Boton>
        </div>
      </div>
    </Section>
  );
}

function Resumen({ s }) {
  return (
    <Section
      title="1. Diagnóstico"
      actions={s.fallas && <BotonFormato listo onClick={() => descargarDiagnosticoPdf(s)} />}
    >
      <dl className="space-y-4 text-sm">
        <div>
          <dt className="text-xs font-medium text-slate-500">Diagnóstico de fallas presentadas</dt>
          <dd className="mt-1 text-slate-800 whitespace-pre-line">{s.fallas || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-500">Acciones a realizar / Observaciones</dt>
          <dd className="mt-1 text-slate-800 whitespace-pre-line">{s.acciones_a_realizar || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-500">Refacciones a utilizar</dt>
          <dd className="mt-1">
            {s.refacciones.length === 0 ? (
              <span className="text-slate-500">Sin refacciones</span>
            ) : (
              <TablaRefacciones refacciones={s.refacciones} />
            )}
          </dd>
        </div>
      </dl>
    </Section>
  );
}

// Descarga del formato de un paso: se activa cuando están los campos obligatorios;
// mientras tanto dice qué falta.
export function BotonFormato({ listo, onClick, falta = "", texto = "Descargar formato" }) {
  return (
    <Boton
      variante="contorno"
      tamano="sm"
      icono={<FileDown size={14} />}
      onClick={onClick}
      disabled={!listo}
      title={listo ? "Descarga el formato en PDF" : falta}
      className="shrink-0"
    >
      {texto}
    </Boton>
  );
}

export function TablaRefacciones({ refacciones, conPrecios = false }) {
  const pesos = (n) => Number(n || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  return (
    <div className="rounded-xl border border-slate-200 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
            <th className="text-right font-medium px-3 py-2">Cant.</th>
            <th className="text-left font-medium px-3 py-2">Unidad</th>
            <th className="text-left font-medium px-3 py-2 w-full">Descripción</th>
            {conPrecios && <th className="text-right font-medium px-3 py-2 whitespace-nowrap">P. unitario</th>}
            {conPrecios && <th className="text-right font-medium px-3 py-2">Importe</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {refacciones.map((r) => (
            <tr key={r.id}>
              <td className="px-3 py-2 text-right tabular-nums">{cantidad(r.cantidad)}</td>
              <td className="px-3 py-2 whitespace-nowrap">{r.unidad_medida}</td>
              <td className="px-3 py-2 break-words">{r.concepto}</td>
              {conPrecios && (
                <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                  {r.precio_unitario != null ? pesos(r.precio_unitario) : "—"}
                </td>
              )}
              {conPrecios && (
                <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap font-medium">
                  {r.importe != null ? pesos(r.importe) : "—"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
