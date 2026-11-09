// src/components/servicio/MaterialAlmacen.jsx
// "Material del almacén" de un servicio: lo que se tomó del almacén del taller
// (aceite, anticongelante...) para esta unidad. No sustituye a la orden de
// compra: esa sigue siendo para las piezas que se compran para el servicio.
//   <MaterialAlmacen s={s} editable={puedeLlenar} onCambio={(lista) => ...} />
import { useEffect, useState } from "react";
import { Section, Boton, Modal, Field, Alerta, inputClass } from "../ui";
import { almacenApi, cantidadTexto, avisoCantidad } from "../../api/almacen";
import { useCamposVacios } from "../../hooks/useCamposVacios";
import { Package, Plus, Undo2, Loader2 } from "lucide-react";

export default function MaterialAlmacen({ s, editable, onCambio }) {
  const usados = s.material_almacen || [];
  // { tipo: "usar" } o { tipo: "devolver", item }
  const [ventana, setVentana] = useState(null);

  const listo = (lista) => {
    setVentana(null);
    onCambio(lista);
  };

  return (
    <Section
      title="Material del almacén"
      subtitle="Lo que se tomó del almacén del taller para esta unidad"
      actions={editable && (
        <Boton tamano="sm" onClick={() => setVentana({ tipo: "usar" })} icono={<Plus size={14} />} className="shrink-0">
          Usar del almacén
        </Boton>
      )}
    >
      {usados.length === 0 ? (
        <p className="text-sm text-slate-500">
          {editable
            ? "Si usaste aceite u otro material del almacén en esta unidad, regístralo aquí para descontarlo de las existencias."
            : "No se usó material del almacén en este servicio."}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 -my-2">
          {usados.map((u) => (
            <li key={u.material_id} className="py-2.5 flex items-center gap-3">
              <Package size={16} className="text-slate-500 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 text-sm text-slate-800">{u.nombre}</span>
              <span className="text-sm font-semibold text-slate-900 tabular-nums">
                {cantidadTexto(u.cantidad)} {u.unidad_medida}
              </span>
              {editable && (
                <button
                  type="button"
                  onClick={() => setVentana({ tipo: "devolver", item: u })}
                  title={`Devolver ${u.nombre} al almacén`}
                  aria-label={`Devolver ${u.nombre} al almacén`}
                  className="tactil p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-institucional transition"
                >
                  <Undo2 size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {ventana?.tipo === "usar" && <UsarModal s={s} onClose={() => setVentana(null)} onListo={listo} />}
      {ventana?.tipo === "devolver" && (
        <DevolverModal s={s} item={ventana.item} onClose={() => setVentana(null)} onListo={listo} />
      )}
    </Section>
  );
}

function UsarModal({ s, onClose, onListo }) {
  const [materiales, setMateriales] = useState(null);
  const [materialId, setMaterialId] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    almacenApi.materiales().then(setMateriales).catch(() => setMateriales([]));
  }, []);

  const material = materiales?.find((m) => String(m.id) === String(materialId));
  const { errores, validar, limpiar } = useCamposVacios();

  const guardar = async (e) => {
    e.preventDefault();
    const ok = validar({
      material: !materialId && "Elige el material que usaste",
      cantidad: avisoCantidad(cantidad, { vacio: "Rellena este campo con la cantidad que usaste" }),
    });
    if (!ok) return;
    setGuardando(true);
    setError("");
    try {
      onListo(await almacenApi.usar(s.id, { material_id: materialId, cantidad }));
    } catch (err) {
      setError(err.message || "No se pudo registrar");
      setGuardando(false);
    }
  };

  return (
    <Modal titulo="Usar del almacén" subtitulo={s.folio} onClose={onClose}>
      <form onSubmit={guardar} noValidate className="p-6 space-y-4">
        {materiales === null ? (
          <div className="flex justify-center py-6 text-slate-500"><Loader2 size={22} className="animate-spin" /></div>
        ) : materiales.length === 0 ? (
          <p className="text-sm text-slate-600">
            El almacén todavía no tiene materiales. Agrégalos en el apartado <span className="font-semibold">Almacén</span>.
          </p>
        ) : (
          <>
            <Field label="Material" required error={errores.material}>
              <select
                value={materialId}
                onChange={(e) => {
                  setMaterialId(e.target.value);
                  limpiar("material");
                }}
                className={inputClass}
              >
                <option value="">Elige un material</option>
                {materiales.map((m) => (
                  <option key={m.id} value={m.id} disabled={m.existencia <= 0}>
                    {m.nombre} — hay {cantidadTexto(m.existencia)} {m.unidad_medida}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={`Cantidad usada${material ? ` (${material.unidad_medida})` : ""}`} required error={errores.cantidad}>
              <input
                value={cantidad}
                onChange={(e) => {
                  setCantidad(e.target.value);
                  limpiar("cantidad");
                }}
                className={inputClass}
                maxLength={12}
                inputMode="decimal"
              />
            </Field>
          </>
        )}
        {error && <Alerta>{error}</Alerta>}
        <div className="flex justify-end gap-2 pt-1">
          <Boton variante="fantasma" onClick={onClose} disabled={guardando}>Cancelar</Boton>
          <Boton type="submit" disabled={guardando || !materiales?.length}
                 icono={guardando ? <Loader2 size={16} className="animate-spin" /> : null}>
            {guardando ? "Guardando..." : "Descontar del almacén"}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}

function DevolverModal({ s, item, onClose, onListo }) {
  const [cantidad, setCantidad] = useState(String(item.cantidad));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const { errores, validar, limpiar } = useCamposVacios();

  const guardar = async (e) => {
    e.preventDefault();
    if (!validar({ cantidad: avisoCantidad(cantidad, { vacio: "Rellena este campo con la cantidad que regresa" }) })) return;
    setGuardando(true);
    setError("");
    try {
      onListo(await almacenApi.devolver(s.id, { material_id: item.material_id, cantidad }));
    } catch (err) {
      setError(err.message || "No se pudo registrar");
      setGuardando(false);
    }
  };

  return (
    <Modal titulo="Devolver al almacén" subtitulo={`${item.nombre} · ${s.folio}`} onClose={onClose}>
      <form onSubmit={guardar} noValidate className="p-6 space-y-4">
        <p className="text-sm text-slate-600">
          En este servicio se usaron {cantidadTexto(item.cantidad)} {item.unidad_medida}. ¿Cuánto regresa al almacén?
        </p>
        <Field label={`Cantidad que regresa (${item.unidad_medida})`} required error={errores.cantidad}>
          <input
            value={cantidad}
            onChange={(e) => {
              setCantidad(e.target.value);
              limpiar("cantidad");
            }}
            className={inputClass}
            maxLength={12}
                 inputMode="decimal" autoFocus />
        </Field>
        {error && <Alerta>{error}</Alerta>}
        <div className="flex justify-end gap-2 pt-1">
          <Boton variante="fantasma" onClick={onClose} disabled={guardando}>Cancelar</Boton>
          <Boton type="submit" disabled={guardando}
                 icono={guardando ? <Loader2 size={16} className="animate-spin" /> : <Undo2 size={16} />}>
            {guardando ? "Guardando..." : "Devolver"}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}
