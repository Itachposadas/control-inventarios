// src/pages/ordenes/OrdenesCompra.jsx
// "Órdenes de compra" de administración. Llegan del mecánico con los datos de la
// unidad, el diagnóstico y las refacciones a comprar. Administración captura el
// proveedor, los precios unitarios y el IVA, y la atiende: el servicio sigue a
// Reparación y su costo es el total de la orden. (La firma de quien autoriza la
// pone parque vehicular al enviarla.)
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import { Boton, Alerta, Insignia, Modal, Field, TextArea, inputClass } from "../../components/ui";
import { TablaRefacciones } from "../../components/servicio/PasoDiagnostico";
import { ordenesCompraApi, ESTADO_ORDEN } from "../../api/ordenesCompra";
import { ADMIN_MENU, ADMIN_SECONDARY_MENU } from "../../config/menus";
import { formatFecha, formatMoneda } from "../../config/solicitudes";
import { descargarOrdenCompraPdf } from "../../utils/ordenCompraPdf";
import { DATOS_CLIENTE } from "../../config/ordenCompra";
import { Loader2, Inbox, CarFront, Building2, Wrench, FileDown, ClipboardCheck, Save } from "lucide-react";

const PESTANAS = [
  { valor: "enviada", label: "Por atender" },
  { valor: "atendida", label: "Atendidas" },
];

const VACIO = {
  enviada: "No hay órdenes de compra por atender",
  atendida: "Aún no se ha atendido ninguna orden de compra",
};

export default function OrdenesCompra() {
  const navigate = useNavigate();
  const [estado, setEstado] = useState("enviada");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [atendiendo, setAtendiendo] = useState(null);

  const cargar = () => {
    setLoading(true);
    setError("");
    ordenesCompraApi
      .listar({ estado })
      .then(setItems)
      .catch((e) => setError(e.message || "No se pudieron cargar las órdenes de compra"))
      .finally(() => setLoading(false));
  };

  useEffect(cargar, [estado]);

  return (
    <DashboardLayout
      menu={ADMIN_MENU}
      secondaryMenu={ADMIN_SECONDARY_MENU}
      title="Órdenes de compra"
      subtitle="Refacciones que pide parque vehicular para las reparaciones"
    >
      <div className="mb-4 inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200">
        {PESTANAS.map((t) => (
          <button
            key={t.valor}
            onClick={() => setEstado(t.valor)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              estado === t.valor ? "bg-white text-institucional shadow-sm" : "text-slate-600 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <Alerta className="mb-4">{error}</Alerta>}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 size={28} className="animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Inbox size={44} className="mx-auto text-slate-300" />
          <p className="mt-4 text-sm font-medium text-slate-700">{VACIO[estado]}</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {items.map((o) => {
            const v = o.vehiculo || {};
            return (
              <li
                key={o.id}
                className="animate-fade-up bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col"
              >
                <div className="px-5 pt-4 flex items-center justify-between gap-3 flex-wrap">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-institucional">{o.folio}</span>
                    <Insignia tono={ESTADO_ORDEN[o.estado].tono}>{ESTADO_ORDEN[o.estado].texto}</Insignia>
                  </span>
                  <span className="text-xs text-slate-500">{formatFecha(o.fecha, true)}</span>
                </div>

                <div className="px-5 py-4 flex items-start gap-3">
                  <span className="w-11 h-11 rounded-xl bg-institucional/10 text-institucional flex items-center justify-center shrink-0">
                    <CarFront size={21} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 truncate">{v.nombre}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {[v.marca, v.modelo, v.placas, v.no_inventario].filter(Boolean).join(" · ")}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-slate-600">
                      <span className="inline-flex items-center gap-1.5"><Building2 size={13} /> {v.area || "Sin área"}</span>
                      <span className="inline-flex items-center gap-1.5"><Wrench size={13} /> {o.mecanico_nombre}</span>
                    </p>
                  </div>
                </div>

                <div className="mx-5 mb-3 rounded-xl bg-slate-50 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Diagnóstico</p>
                  <p className="text-sm text-slate-700 whitespace-pre-line line-clamp-3">{o.servicio.fallas}</p>
                </div>

                <div className="mx-5 mb-4">
                  <TablaRefacciones refacciones={o.piezas} conPrecios />
                  {o.estado === "atendida" && (
                    <p className="mt-2 text-xs text-right text-slate-600">
                      {o.proveedor?.nombre} · <span className="font-bold text-slate-800">Total {formatMoneda(o.total)}</span>
                    </p>
                  )}
                </div>

                <div className="mt-auto px-5 py-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
                  <p className="mr-auto text-xs text-slate-500">
                    Servicio{" "}
                    <button
                      onClick={() => navigate(`/admin/solicitudes/${o.servicio.id}`)}
                      className="font-mono font-semibold text-institucional hover:underline"
                    >
                      {o.servicio.folio}
                    </button>
                    {o.atendida_at && ` · Atendida ${formatFecha(o.atendida_at, true)}`}
                  </p>
                  <Boton variante="fantasma" tamano="sm" icono={<FileDown size={14} />} onClick={() => descargarOrdenCompraPdf(o)}>
                    PDF
                  </Boton>
                  {o.estado === "enviada" && (
                    <Boton tamano="sm" icono={<ClipboardCheck size={14} />} onClick={() => setAtendiendo(o)}>
                      Atender
                    </Boton>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {atendiendo && (
        <AtenderOrden
          orden={atendiendo}
          onClose={() => setAtendiendo(null)}
          onGuardada={(o) => setItems((lista) => lista.map((x) => (x.id === o.id ? o : x)))}
          onAtendida={(o) => {
            setAtendiendo(null);
            setItems((lista) => lista.filter((x) => x.id !== o.id));
          }}
        />
      )}
    </DashboardLayout>
  );
}

// Proveedor, precios unitarios, IVA y adicionales. El importe, subtotal y total se calculan solos.
function AtenderOrden({ orden, onClose, onGuardada, onAtendida }) {
  const [proveedor, setProveedor] = useState({
    nombre: orden.proveedor?.nombre || "",
    direccion: orden.proveedor?.direccion || "",
    telefono: orden.proveedor?.telefono || "",
  });
  const [precios, setPrecios] = useState(() =>
    Object.fromEntries(orden.piezas.map((p) => [p.id, p.precio_unitario ?? ""]))
  );
  const [iva, setIva] = useState(String(orden.iva_porcentaje ?? 16));
  const [adicionales, setAdicionales] = useState(orden.adicionales || "");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(null); // "guardar" | "atender"

  const importe = (p) => (precios[p.id] === "" ? null : Number(p.cantidad) * Number(precios[p.id]));
  const totales = useMemo(() => {
    const subtotal = orden.piezas.reduce((s, p) => s + (importe(p) || 0), 0);
    const ivaMonto = subtotal * (Number(iva) || 0) / 100;
    return { subtotal, iva: ivaMonto, total: subtotal + ivaMonto };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [precios, iva]);

  const payload = () => ({ proveedor, precios, iva_porcentaje: iva, adicionales });

  const enviar = async (accion) => {
    setError("");
    if (accion === "atender") {
      if (!proveedor.nombre.trim()) return setError("Escribe el nombre o razón social del proveedor");
      const falta = orden.piezas.find((p) => precios[p.id] === "");
      if (falta) return setError(`Falta el precio unitario de «${falta.concepto}»`);
    }
    setGuardando(accion);
    try {
      if (accion === "atender") {
        onAtendida(await ordenesCompraApi.atender(orden.id, payload()));
      }
      else {
        onGuardada(await ordenesCompraApi.guardar(orden.id, payload()));
        onClose();
      }
    } catch (e) {
      setError(e.message || "No se pudo guardar");
      setGuardando(null);
    }
  };

  const setProv = (campo) => (e) => setProveedor((p) => ({ ...p, [campo]: e.target.value }));

  return (
    <Modal
      titulo="Atender orden de compra"
      subtitulo={`${orden.folio} · ${orden.vehiculo?.nombre} · ${orden.vehiculo?.area || ""}`}
      onClose={onClose}
      ancho="max-w-3xl"
    >
      <div className="p-6 space-y-5">
        {error && <Alerta>{error}</Alerta>}

        <div>
          <h4 className="text-sm font-semibold text-slate-800 mb-3">Datos del proveedor</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre / Razón social" required className="sm:col-span-2">
              <input value={proveedor.nombre} onChange={setProv("nombre")} maxLength={200} className={inputClass} />
            </Field>
            <Field label="Dirección">
              <input value={proveedor.direccion} onChange={setProv("direccion")} maxLength={255} className={inputClass} />
            </Field>
            <Field label="Teléfono">
              <input value={proveedor.telefono} onChange={setProv("telefono")} maxLength={50} inputMode="tel" className={inputClass} />
            </Field>
          </div>
        </div>

        {/* Firmas que ya trae la orden (las pone parque vehicular) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            ["Mecánico/Almacén", orden.mecanico_nombre, orden.mecanico_firma],
            ["Autorizó", orden.autoriza_nombre, orden.autoriza_firma],
          ].map(([titulo, nombre, firma]) => (
            <div key={titulo} className="rounded-xl border border-slate-200 px-3 py-2 flex items-center gap-3 min-w-0">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">{titulo}</p>
                <p className="text-sm font-semibold text-slate-800 truncate">{nombre || "—"}</p>
              </div>
              {firma && <img src={firma} alt={`Firma de ${nombre}`} className="h-10 w-auto max-w-[45%] object-contain shrink-0" />}
            </div>
          ))}
        </div>

        {/* Siempre los mismos: los del municipio (no se editan) */}
        <div>
          <h4 className="text-sm font-semibold text-slate-800 mb-3">Datos del cliente</h4>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-px rounded-xl border border-slate-200 bg-slate-200 overflow-hidden text-sm">
            {[
              ["Nombre", DATOS_CLIENTE.nombre],
              ["Dirección", DATOS_CLIENTE.direccion],
              ["Municipio", DATOS_CLIENTE.municipio],
              ["Teléfono", DATOS_CLIENTE.telefono],
            ].map(([etiqueta, valor]) => (
              <div key={etiqueta} className="bg-slate-50 px-3 py-2">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{etiqueta}</dt>
                <dd className="mt-0.5 font-medium text-slate-800">{valor}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-800 mb-3">Refacciones</h4>
          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
            {orden.piezas.map((p) => {
              const imp = importe(p);
              return (
                <li key={p.id} className="p-3 grid grid-cols-1 sm:grid-cols-[1fr_9rem_7rem] gap-2 sm:items-center">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 break-words">{p.concepto}</p>
                    <p className="text-xs text-slate-500">
                      {Number(p.cantidad).toLocaleString("es-MX")} {p.unidad_medida}
                    </p>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none">$</span>
                    <input
                      type="number" min="0" step="0.01" inputMode="decimal"
                      value={precios[p.id]}
                      onChange={(e) => setPrecios((pr) => ({ ...pr, [p.id]: e.target.value }))}
                      placeholder="Precio unitario"
                      aria-label={`Precio unitario de ${p.concepto}`}
                      className={`${inputClass} pl-7`}
                    />
                  </div>
                  <p className="text-sm sm:text-right font-semibold text-slate-800 tabular-nums">
                    {imp != null && !Number.isNaN(imp) ? formatMoneda(imp) : "—"}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_14rem] gap-5">
          <Field label="Adicionales">
            <TextArea value={adicionales} onChange={setAdicionales} placeholder="Ej. Incluye envío" rows={3} />
          </Field>
          <div className="space-y-3">
            <Field label="IVA (%)">
              <input
                type="number" min="0" max="100" step="0.01" inputMode="decimal"
                value={iva}
                onChange={(e) => setIva(e.target.value)}
                className={inputClass}
              />
            </Field>
            <dl className="text-sm space-y-1">
              <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd className="tabular-nums">{formatMoneda(totales.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">I.V.A.</dt><dd className="tabular-nums">{formatMoneda(totales.iva)}</dd></div>
              <div className="flex justify-between font-bold text-slate-800"><dt>Total</dt><dd className="tabular-nums">{formatMoneda(totales.total)}</dd></div>
            </dl>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Boton variante="fantasma" onClick={onClose}>Cancelar</Boton>
          <Boton variante="contorno" icono={<Save size={16} />} onClick={() => enviar("guardar")} disabled={!!guardando}>
            {guardando === "guardar" ? "Guardando..." : "Guardar sin atender"}
          </Boton>
          <Boton icono={<ClipboardCheck size={16} />} onClick={() => enviar("atender")} disabled={!!guardando}>
            {guardando === "atender" ? "Guardando..." : "Atender orden"}
          </Boton>
        </div>
      </div>
    </Modal>
  );
}
