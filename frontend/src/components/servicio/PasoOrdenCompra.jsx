// src/components/servicio/PasoOrdenCompra.jsx
// Paso 3 del servicio (solo si el diagnóstico tiene refacciones): parque vehicular
// manda la orden de compra con la hoja, el nombre y firma del mecánico/almacén
// (se proponen los de quien firmó de recibido) y el nombre y firma de quien
// autoriza, el coordinador (se propone la de la última orden).
// Administración captura proveedor y precios y la atiende (en "Órdenes de compra").
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Section, Field, Boton, Alerta, Insignia, inputClass } from "../ui";
import CampoFirma from "../peticiones/CampoFirma";
import { TablaRefacciones, BotonFormato } from "./PasoDiagnostico";
import { solicitudesApi } from "../../api/solicitudes";
import { ESTADO_ORDEN, ordenesCompraApi } from "../../api/ordenesCompra";
import { AUTORIZA } from "../../config/ordenCompra";
import { descargarOrdenCompraPdf } from "../../utils/pdfs";
import { formatFecha, formatMoneda } from "../../config/solicitudes";
import { FileDown, Send, Loader2, Clock } from "lucide-react";

export default function PasoOrdenCompra({ s, editable, esAdmin, nombreInicial, onEnviada }) {
  const o = s.orden_compra;
  if (!o) {
    return editable ? (
      <Formulario s={s} nombreInicial={nombreInicial} onEnviada={onEnviada} />
    ) : (
      <Section title="3. Orden de compra">
        <p className="text-sm text-slate-500">El mecánico aún no envía la orden de compra.</p>
      </Section>
    );
  }
  return <Resumen o={o} esAdmin={esAdmin} />;
}

function Formulario({ s, nombreInicial, onEnviada }) {
  // Nombre y firma de quien recibió la solicitud; si no hay, el de la cuenta
  const recibio = s.peticion || {};
  const [hoja, setHoja] = useState({ no: 1, total: 1 });
  const [nombre, setNombre] = useState(recibio.mecanico_nombre || nombreInicial);
  const [firma, setFirma] = useState(recibio.mecanico_firma || null);
  const [faltaFirma, setFaltaFirma] = useState(false);
  // Autorizó: se propone el nombre y la firma de la última orden
  const [ultima, setUltima] = useState(undefined); // undefined = cargando
  const [autorizaNombre, setAutorizaNombre] = useState(AUTORIZA.nombre);
  const [autorizaFirma, setAutorizaFirma] = useState(null);
  const [faltaAutoriza, setFaltaAutoriza] = useState(false);

  useEffect(() => {
    ordenesCompraApi
      .ultimaAutorizacion()
      .then((u) => {
        setUltima(u);
        if (u?.nombre) setAutorizaNombre(u.nombre);
      })
      .catch(() => setUltima(null));
  }, []);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    setError("");
    if (!(hoja.no >= 1 && hoja.total >= 1 && Number(hoja.no) <= Number(hoja.total))) {
      return setError("Revisa la hoja (ej. hoja 1 de 1)");
    }
    if (nombre.trim().length < 3) return setError("Escribe el nombre completo del mecánico/almacén");
    if (!firma) {
      setFaltaFirma(true);
      return setError("Falta la firma del mecánico/almacén");
    }
    if (autorizaNombre.trim().length < 3) return setError("Escribe el nombre de quien autoriza");
    if (!autorizaFirma) {
      setFaltaAutoriza(true);
      return setError("Falta la firma de quien autoriza");
    }
    setEnviando(true);
    try {
      onEnviada(await solicitudesApi.enviarOrdenCompra(s.id, {
        hoja_no: Number(hoja.no), hoja_total: Number(hoja.total), mecanico_nombre: nombre.trim(), mecanico_firma: firma,
        autoriza_nombre: autorizaNombre.trim(), autoriza_firma: autorizaFirma,
      }));
    } catch (e) {
      setError(e.message || "No se pudo enviar la orden de compra");
      setEnviando(false);
    }
  };

  // Con nombres y firmas ya se puede descargar (proveedor y precios quedan en blanco)
  const completa = nombre.trim().length >= 3 && firma && autorizaNombre.trim().length >= 3 && autorizaFirma;
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
      mecanico_nombre: nombre.trim(),
      mecanico_firma: firma,
      autoriza_nombre: autorizaNombre.trim(),
      autoriza_firma: autorizaFirma,
    });
  };

  return (
    <Section
      title="3. Orden de compra"
      subtitle="Se manda a administración con las refacciones del diagnóstico; administración captura proveedor y precios"
      actions={
        <BotonFormato
          listo={completa}
          onClick={descargar}
          falta="Faltan el nombre y la firma del mecánico/almacén y de quien autoriza"
        />
      }
    >
      <div className="space-y-5">
        {error && <Alerta>{error}</Alerta>}
        <TablaRefacciones refacciones={s.refacciones} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-4">
            <Field label="Hoja no.">
              <div className="flex items-center gap-2">
                <input
                  type="number" min="1" max="99" inputMode="numeric"
                  value={hoja.no}
                  onChange={(e) => setHoja((h) => ({ ...h, no: e.target.value }))}
                  aria-label="Hoja número"
                  className={`${inputClass} text-center`}
                />
                <span className="text-sm text-slate-500 shrink-0">de</span>
                <input
                  type="number" min="1" max="99" inputMode="numeric"
                  value={hoja.total}
                  onChange={(e) => setHoja((h) => ({ ...h, total: e.target.value }))}
                  aria-label="Total de hojas"
                  className={`${inputClass} text-center`}
                />
              </div>
            </Field>
            <Field label="Mecánico/Almacén: nombre completo" required>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                maxLength={120}
                autoComplete="off"
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Firma" required>
            <CampoFirma
              propuesta={recibio.mecanico_firma}
              leyenda="Firma con la que se recibió la solicitud."
              invalido={faltaFirma && !firma}
              onChange={(f) => {
                setFirma(f);
                if (f) setFaltaFirma(false);
              }}
            />
          </Field>
        </div>
        {/* Autorizó: coordinador de parque vehicular */}
        <div className="border-t border-slate-100 pt-5">
          <h4 className="text-sm font-semibold text-slate-800">Autorizó</h4>
          <p className="text-xs text-slate-500 mb-3">{AUTORIZA.cargo}</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Field label="Nombre" required>
              <input
                value={autorizaNombre}
                onChange={(e) => setAutorizaNombre(e.target.value)}
                maxLength={120}
                autoComplete="off"
                className={inputClass}
              />
            </Field>
            <Field label="Firma" required>
              {ultima === undefined ? (
                <div className="flex items-center justify-center h-[170px] text-slate-400">
                  <Loader2 size={22} className="animate-spin" />
                </div>
              ) : (
                <CampoFirma
                  propuesta={ultima?.firma || null}
                  leyenda="Firma de la última orden autorizada."
                  invalido={faltaAutoriza && !autorizaFirma}
                  onChange={(f) => {
                    setAutorizaFirma(f);
                    if (f) setFaltaAutoriza(false);
                  }}
                />
              )}
            </Field>
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
            Enviada {formatFecha(o.fecha, true)} · Hoja {o.hoja_no} de {o.hoja_total} · {o.mecanico_nombre}
            {o.autoriza_nombre && <> · Autorizó {o.autoriza_nombre}</>}
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
