// src/components/servicio/PasoDiagnostico.jsx
// Paso 1 del servicio: diagnóstico de fallas presentadas, acciones a realizar /
// observaciones y refacciones a utilizar (piezas a comprar). Las refacciones son
// los materiales que pidió el solicitante: el mecánico no agrega ni cambia ninguno.
// El formato "Dictamen" se puede descargar en cuanto el diagnóstico y las
// acciones están escritos (antes de guardar, con lo capturado).
import { useState } from "react";
import { Section, Field, TextArea, Boton, Alerta } from "../ui";
import { solicitudesApi } from "../../api/solicitudes";
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
  // Lo que pidió el área (solo lectura)
  const solicitados = (s.peticion?.materiales || []).map((m, i) => ({ ...m, id: i }));
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setError("");
    if (!fallas.trim()) return setError("Escribe el diagnóstico de fallas presentadas");
    if (!acciones.trim()) return setError("Escribe las acciones a realizar");
    setGuardando(true);
    try {
      onGuardado(await solicitudesApi.diagnostico(s.id, { fallas, acciones_a_realizar: acciones }));
    } catch (err) {
      setError(err.message || "No se pudo guardar el diagnóstico");
      setGuardando(false);
    }
  };

  const completo = fallas.trim() && acciones.trim();
  const descargar = () =>
    descargarDiagnosticoPdf({ ...s, fallas, acciones_a_realizar: acciones, refacciones: solicitados });

  return (
    <Section
      title="1. Diagnóstico"
      subtitle="Opinión del mecánico sobre el estado actual del vehículo"
      actions={<BotonFormato listo={completo} onClick={descargar} falta="Escribe el diagnóstico y las acciones a realizar" />}
    >
      <div className="space-y-5">
        {error && <Alerta>{error}</Alerta>}
        <Field label="Diagnóstico de fallas presentadas" required>
          <TextArea
            value={fallas}
            onChange={setFallas}
            placeholder="Ej. Frenos delanteros gastados; ruido al frenar"
          />
        </Field>
        <Field label="Acciones a realizar / Observaciones" required>
          <TextArea
            value={acciones}
            onChange={setAcciones}
            placeholder="¿Qué trabajo de reparación o ajuste requiere el vehículo?"
            rows={3}
          />
        </Field>
        <div>
          <p className="text-sm font-medium text-slate-700">Refacciones a utilizar</p>
          <p className="text-xs text-slate-500 mb-3">
            Son los materiales que pidió el solicitante
            {s.peticion?.folio && <> en <span className="font-mono">{s.peticion.folio}</span></>}; con ellos se hace la
            orden de compra. No se pueden agregar otros.
          </p>
          {solicitados.length ? (
            <TablaRefacciones refacciones={solicitados} />
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 px-4 py-5 text-center text-sm text-slate-500">
              El solicitante no pidió materiales: no se hará orden de compra.
            </p>
          )}
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

// Descarga del formato de un paso: se activa cuando están los campos obligatorios
// y las firmas; mientras tanto dice qué falta.
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
