// src/components/servicio/PasoEntrega.jsx
// Último paso: "Formato de entrega de vehículo y/o maquinaria reparada".
// Los datos de la unidad y las fechas salen solos; el mecánico escribe el
// operador, el trabajo realizado y las observaciones. Al guardarlo el vehículo
// queda entregado. En el PDF firman mecánico, área (el solicitante) y autorizó.
import { useState } from "react";
import { Section, Field, TextArea, Boton, Alerta, inputClass } from "../ui";
import ConfirmModal from "../ConfirmModal";
import { solicitudesApi } from "../../api/solicitudes";
import { descargarEntregaPdf } from "../../utils/pdfs";
import { BotonFormato } from "./PasoDiagnostico";
import { formatFecha } from "../../config/solicitudes";
import { CheckCircle2 } from "lucide-react";

export default function PasoEntrega({ s, editable, fotosCompletas, onEntregada }) {
  const [trabajo, setTrabajo] = useState(s.acciones || "");
  const [observaciones, setObservaciones] = useState(s.observaciones || "");
  const [operador, setOperador] = useState(s.operador || "");
  const [error, setError] = useState("");
  const [confirmar, setConfirmar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const entregada = s.estado === "entregada";

  const pedirConfirmacion = () => {
    setError("");
    if (!fotosCompletas) return setError("Primero sube las 3 fotos de la evidencia fotográfica");
    if (!trabajo.trim()) return setError("Describe el trabajo realizado");
    setConfirmar(true);
  };

  const entregar = async () => {
    setGuardando(true);
    try {
      onEntregada(await solicitudesApi.entrega(s.id, { acciones: trabajo, observaciones, operador }));
    } catch (e) {
      setError(e.message || "No se pudo registrar la entrega");
    } finally {
      setGuardando(false);
      setConfirmar(false);
    }
  };

  const ing = s.ingreso || {};
  const nombre = s.vehiculo?.numeroEconomico || s.vehiculo?.unidad || s.vehiculo?.noInventario;
  const datos = [
    ["No. inventario", ing.no_inventario],
    ["Vehículo/Maquinaria", ing.unidad || nombre],
    ["No. serie", ing.serie],
    ["Color", ing.color],
    ["Marca", ing.marca],
    ["Fecha de recepción", formatFecha(s.fecha_ingreso)],
    ["Fecha de entrega", entregada ? formatFecha(s.fecha_entrega) : "Al guardar este formato"],
    ["Área", ing.area],
    ["Modelo", ing.modelo],
    ["Placas", ing.placas],
    ...(entregada ? [["Operador", s.operador]] : []),
  ];

  return (
    <Section
      title="5. Formato de entrega de vehículo y/o maquinaria reparada"
      actions={
        entregada ? (
          <BotonFormato listo onClick={() => descargarEntregaPdf(s)} />
        ) : editable && (
          // Antes de entregar: con lo capturado y la fecha de hoy
          <BotonFormato
            listo={!!trabajo.trim()}
            onClick={() =>
              descargarEntregaPdf({ ...s, acciones: trabajo, observaciones, operador, fecha_entrega: new Date().toISOString() })
            }
            falta="Describe el trabajo realizado"
          />
        )
      }
    >
      <div className="space-y-5">
        {error && <Alerta>{error}</Alerta>}
        <dl className="grid grid-cols-2 lg:grid-cols-3 gap-px rounded-xl border border-slate-200 bg-slate-200 overflow-hidden">
          {datos.map(([etiqueta, valor]) => (
            <div key={etiqueta} className="bg-slate-50 px-3 py-2.5 min-w-0">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{etiqueta}</dt>
              <dd className="mt-0.5 text-sm font-semibold text-slate-800 truncate">{valor || "—"}</dd>
            </div>
          ))}
        </dl>

        {editable ? (
          <>
            <Field label="Operador">
              <input
                value={operador}
                onChange={(e) => setOperador(e.target.value)}
                maxLength={150}
                autoComplete="off"
                placeholder="Quien maneja la unidad en el área"
                className={inputClass}
              />
            </Field>
            <Field label="Trabajo realizado" required>
              <TextArea
                value={trabajo}
                onChange={setTrabajo}
                placeholder="Describe el trabajo que se le realizó al vehículo o maquinaria"
              />
            </Field>
            <Field label="Observaciones">
              <TextArea
                value={observaciones}
                onChange={setObservaciones}
                placeholder="Opinión de lo que se hizo o se observó"
                rows={3}
              />
            </Field>
            <div className="flex justify-end">
              <Boton onClick={pedirConfirmacion} icono={<CheckCircle2 size={16} />}>
                Guardar y entregar vehículo
              </Boton>
            </div>
          </>
        ) : (
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-xs font-medium text-slate-500">Trabajo realizado</dt>
              <dd className="mt-1 text-slate-800 whitespace-pre-line">{s.acciones || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Observaciones</dt>
              <dd className="mt-1 text-slate-800 whitespace-pre-line">{s.observaciones || "—"}</dd>
            </div>
          </dl>
        )}
      </div>

      <ConfirmModal
        open={confirmar}
        tono="confirmar"
        loading={guardando}
        onClose={() => setConfirmar(false)}
        onConfirm={entregar}
        title="¿Entregar el vehículo?"
        confirmLabel="Sí, entregar"
        loadingLabel="Guardando..."
      >
        Se guardará el formato de entrega con la fecha de hoy y el servicio quedará cerrado. Si te equivocas,
        el administrador puede regresarlo.
      </ConfirmModal>
    </Section>
  );
}
