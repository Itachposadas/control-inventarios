// src/components/servicio/PasoOrdenCompra.jsx
// Paso 3 del servicio (solo si el diagnóstico tiene refacciones): parque vehicular
// manda la orden de compra con las refacciones y la hoja. No lleva firmas: el
// formato imprime "Autorizó" con el nombre del coordinador de parque vehicular.
// Administración captura proveedor y precios y la atiende (en "Órdenes de compra").
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Section, Field, Boton, Alerta, Insignia, inputClass } from "../ui";
import { TablaRefacciones, BotonFormato } from "./PasoDiagnostico";
import { solicitudesApi } from "../../api/solicitudes";
import { ESTADO_ORDEN } from "../../api/ordenesCompra";
import { AUTORIZA } from "../../config/ordenCompra";
import { descargarOrdenCompraPdf } from "../../utils/pdfs";
import { formatFecha, formatMoneda } from "../../config/solicitudes";
import { FileDown, Send, Loader2, Clock } from "lucide-react";
import { useCamposVacios } from "../../hooks/useCamposVacios";

export default function PasoOrdenCompra({ s, editable, esAdmin, onEnviada }) {
  const o = s.orden_compra;
  if (!o) {
    return editable ? (
      <Formulario s={s} onEnviada={onEnviada} />
    ) : (
      <Section title="3. Orden de compra">
        <p className="text-sm text-slate-500">El mecánico aún no envía la orden de compra.</p>
      </Section>
    );
  }
  return <Resumen o={o} esAdmin={esAdmin} />;
}

function Formulario({ s, onEnviada }) {
  const [hoja, setHoja] = useState({ no: 1, total: 1 });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const hojaValida = hoja.no >= 1 && hoja.total >= 1 && Number(hoja.no) <= Number(hoja.total);
  const { errores, validar, limpiar } = useCamposVacios();

  const enviar = async () => {
    setError("");
    const ok = validar({
      hoja: !(hoja.no >= 1 && hoja.total >= 1)
        ? "Rellena el número de hoja y el total de hojas"
        : !hojaValida && "El número de hoja no puede ser mayor que el total",
    });
    if (!ok) return;
    setEnviando(true);
    try {
      onEnviada(await solicitudesApi.enviarOrdenCompra(s.id, {
        hoja_no: Number(hoja.no), hoja_total: Number(hoja.total),
      }));
    } catch (e) {
      setError(e.message || "No se pudo enviar la orden de compra");
      setEnviando(false);
    }
  };

  // Se puede descargar antes de enviarla (proveedor y precios quedan en blanco)
  const descargar = () => {
    const ing = s.ingreso || {};
    descargarOrdenCompraPdf({
      id: s.folio, // aún no tiene folio de orden: el archivo lleva el del servicio
      fecha: new Date().toISOString(),
      hoja_no: hoja.no,
      hoja_total: hoja.total,
      vehiculo: {
        nombre: s.vehiculo?.numeroEconomico || s.vehiculo?.unidad || s.vehiculo?.noInventario,
        unidad: ing.unidad, area: ing.area, modelo: ing.modelo, marca: ing.marca,
        no_inventario: ing.no_inventario, serie: ing.serie, placas: ing.placas,
      },
      proveedor: {},
      piezas: s.refacciones,
    });
  };

  return (
    <Section
      title="3. Orden de compra"
      subtitle="Se manda a administración con las refacciones del diagnóstico; administración captura proveedor y precios"
      actions={<BotonFormato listo={hojaValida} onClick={descargar} falta="Revisa el número de hoja" />}
    >
      <div className="space-y-5">
        {error && <Alerta>{error}</Alerta>}
        <TablaRefacciones refacciones={s.refacciones} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Field label="Hoja no." error={errores.hoja}>
            <div className="flex items-center gap-2">
              <input
                type="number" min="1" max="99" inputMode="numeric"
                value={hoja.no}
                onChange={(e) => {
                  setHoja((h) => ({ ...h, no: e.target.value }));
                  limpiar("hoja");
                }}
                aria-label="Hoja número"
                className={`${inputClass} text-center`}
              />
              <span className="text-sm text-slate-500 shrink-0">de</span>
              <input
                type="number" min="1" max="99" inputMode="numeric"
                value={hoja.total}
                onChange={(e) => {
                  setHoja((h) => ({ ...h, total: e.target.value }));
                  limpiar("hoja");
                }}
                aria-label="Total de hojas"
                className={`${inputClass} text-center`}
              />
            </div>
          </Field>
          <div>
            <p className="text-sm font-medium text-slate-700 mb-1">Autorizó</p>
            <p className="text-sm text-slate-800">{AUTORIZA.nombre}</p>
            <p className="text-xs text-slate-500">{AUTORIZA.cargo}</p>
          </div>
        </div>

        <div className="flex justify-end">
          <Boton
            onClick={enviar}
            disabled={enviando}
            icono={enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          >
            {enviando ? "Enviando..." : "Enviar a administración"}
          </Boton>
        </div>
      </div>
    </Section>
  );
}

function Resumen({ o, esAdmin }) {
  const navigate = useNavigate();
  const estado = ESTADO_ORDEN[o.estado];
  return (
    <Section
      title="3. Orden de compra"
      actions={
        <Boton variante="contorno" tamano="sm" icono={<FileDown size={14} />} onClick={() => descargarOrdenCompraPdf(o)}>
          Ver orden de compra
        </Boton>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-mono font-semibold text-institucional">{o.folio}</span>
          <Insignia tono={estado.tono}>{estado.texto}</Insignia>
          <span className="text-xs text-slate-500">
            Enviada {formatFecha(o.fecha, true)} · Hoja {o.hoja_no} de {o.hoja_total}
          </span>
        </div>
        {o.estado === "enviada" ? (
          <Alerta tipo="info" icono={<Clock size={16} />}>
            Esperando a que administración capture el proveedor y los precios.
            {esAdmin && (
              <>
                {" "}
                <button onClick={() => navigate("/admin/ordenes-compra")} className="font-semibold underline">
                  Atenderla en Órdenes de compra
                </button>
              </>
            )}
          </Alerta>
        ) : (
          <p className="text-sm text-slate-600">
            Atendida por <span className="font-medium text-slate-800">{o.atendida_por}</span> el{" "}
            {formatFecha(o.atendida_at, true)} · Proveedor:{" "}
            <span className="font-medium text-slate-800">{o.proveedor?.nombre}</span>
          </p>
        )}
        {/* Precios y totales solo para el admin */}
        <TablaRefacciones refacciones={o.piezas} conPrecios={esAdmin} />
        {o.estado === "atendida" && esAdmin && (
          <p className="text-sm text-right text-slate-600">
            Subtotal {formatMoneda(o.subtotal)} · IVA {formatMoneda(o.iva)} ·{" "}
            <span className="font-semibold text-slate-800">Total {formatMoneda(o.total)}</span>
          </p>
        )}
      </div>
    </Section>
  );
}
