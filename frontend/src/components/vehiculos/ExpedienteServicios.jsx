// src/components/vehiculos/ExpedienteServicios.jsx
// Expediente de mantenimiento de una unidad: resumen y línea de tiempo de sus
// servicios con sus formatos (solicitud, diagnóstico, ingreso, orden de compra y entrega) en PDF.
// El gasto y los costos solo se muestran si vienen (el backend solo los manda al admin).
import { useState } from "react";
import { EstadoBadge } from "../solicitudes/Badges";
import { Boton } from "../ui";
import { peticionesApi } from "../../api/peticiones";
import { ordenesCompraApi } from "../../api/ordenesCompra";
import { solicitudesApi } from "../../api/solicitudes";
import { descargarSolicitudPdf } from "../../utils/solicitudPdf";
import { descargarDiagnosticoPdf } from "../../utils/diagnosticoPdf";
import { descargarIngresoPdf } from "../../utils/ingresoPdf";
import { descargarOrdenCompraPdf } from "../../utils/ordenCompraPdf";
import { descargarEntregaPdf } from "../../utils/entregaPdf";
import { formatFecha, formatMoneda } from "../../config/solicitudes";
import {
  Wrench, CheckCircle2, Clock, DollarSign, Timer, FileDown, ExternalLink, Loader2, Building2, UserRound,
} from "lucide-react";

export function ResumenExpediente({ resumen }) {
  const tarjetas = [
    { label: "Servicios", value: resumen.servicios, icon: <Wrench size={18} />, color: "text-institucional", bg: "bg-institucional/10" },
    { label: "Entregados", value: resumen.entregados, icon: <CheckCircle2 size={18} />, color: "text-emerald-700", bg: "bg-emerald-100" },
    { label: "En taller", value: resumen.en_taller, icon: <Clock size={18} />, color: "text-amber-900", bg: "bg-amber-100" },
    {
      label: "Días promedio en taller",
      value: resumen.dias_promedio ?? "—",
      icon: <Timer size={18} />,
      color: "text-blue-700",
      bg: "bg-blue-100",
    },
  ];
  // Solo el admin recibe el gasto
  if (resumen.gasto_total != null) {
    tarjetas.push({
      label: "Gasto total", value: formatMoneda(resumen.gasto_total), icon: <DollarSign size={18} />,
      color: "text-purple-700", bg: "bg-purple-100",
    });
  }
  return (
    <div className={`grid grid-cols-2 gap-3 ${tarjetas.length === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
      {tarjetas.map((c) => (
        <div key={c.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className={`w-9 h-9 rounded-lg ${c.bg} ${c.color} flex items-center justify-center`}>{c.icon}</div>
          <p className="mt-3 text-xl font-bold text-slate-800 leading-none">{c.value}</p>
          <p className="mt-1 text-xs text-slate-500">{c.label}</p>
        </div>
      ))}
    </div>
  );
}

export default function ExpedienteServicios({ servicios, onAbrir }) {
  if (!servicios.length) {
    return (
      <div className="py-10 text-center">
        <Wrench size={32} className="mx-auto text-slate-300" />
        <p className="mt-3 text-sm text-slate-500">Esta unidad todavía no tiene servicios.</p>
      </div>
    );
  }
  return (
    <ol className="relative space-y-5">
      <span aria-hidden className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-200" />
      {servicios.map((s) => (
        <Servicio key={s.id} s={s} onAbrir={onAbrir} />
      ))}
    </ol>
  );
}

function Servicio({ s, onAbrir }) {
  const [descargando, setDescargando] = useState(null);
  const entregado = s.estado === "entregada";

  // Cada formato se pide al momento (trae las firmas)
  const descargar = async (cual) => {
    setDescargando(cual);
    try {
      if (cual === "solicitud") await descargarSolicitudPdf(await peticionesApi.obtener(s.solicitud.id));
      if (cual === "diagnostico") await descargarDiagnosticoPdf(await solicitudesApi.obtener(s.id));
      if (cual === "ingreso") await descargarIngresoPdf(await solicitudesApi.obtener(s.id));
      if (cual === "orden") await descargarOrdenCompraPdf(await ordenesCompraApi.obtener(s.orden_compra.id));
      if (cual === "entrega") await descargarEntregaPdf(await solicitudesApi.obtener(s.id));
    } catch {
      // si falla, el botón vuelve a quedar disponible
    } finally {
      setDescargando(null);
    }
  };

  const boton = (cual, texto) => (
    <Boton
      variante="contorno"
      tamano="sm"
      onClick={() => descargar(cual)}
      disabled={!!descargando}
      icono={descargando === cual ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
    >
      {texto}
    </Boton>
  );

  return (
    <li className="relative pl-11">
      <span
        className={`absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white
          ${entregado ? "bg-emerald-600 text-white" : "bg-amber-100 text-amber-900"}`}
      >
        {entregado ? <CheckCircle2 size={16} /> : <Clock size={16} />}
      </span>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-institucional">{s.folio}</span>
            <EstadoBadge estado={s.estado} />
          </div>
          {s.costo != null && <span className="text-sm font-bold text-slate-800">{formatMoneda(s.costo)}</span>}
        </div>

        <p className="mt-1 text-xs text-slate-500">
          Recibido {formatFecha(s.fecha_recepcion)}
          {s.fecha_entrega ? ` · Entregado ${formatFecha(s.fecha_entrega)}` : " · Sigue en el taller"}
          {s.dias_taller != null && ` · ${s.dias_taller} ${s.dias_taller === 1 ? "día" : "días"} en taller`}
        </p>
        <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
          {s.area && <span className="inline-flex items-center gap-1"><Building2 size={12} /> {s.area}</span>}
          {s.solicitud?.solicitante && <span className="inline-flex items-center gap-1"><UserRound size={12} /> Solicitó: {s.solicitud.solicitante}</span>}
          {s.solicitud?.recibio && <span className="inline-flex items-center gap-1"><Wrench size={12} /> Recibió: {s.solicitud.recibio}</span>}
        </p>

        <dl className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <Dato titulo="Diagnóstico" texto={s.fallas} />
          <Dato titulo="Trabajo realizado" texto={s.trabajo_realizado} vacio={entregado ? "—" : "Aún no se entrega"} />
        </dl>

        {s.refacciones.length > 0 && (
          <p className="mt-3 text-xs text-slate-600">
            <span className="font-semibold">Refacciones:</span>{" "}
            {s.refacciones.map((r) => `${Number(r.cantidad).toLocaleString("es-MX")} ${r.unidad_medida} ${r.concepto}`).join(" · ")}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {s.solicitud && boton("solicitud", "Solicitud")}
          {s.fallas && boton("diagnostico", "Diagnóstico")}
          {s.ingreso_at && boton("ingreso", "Ingreso a taller")}
          {s.orden_compra && boton("orden", "Orden de compra")}
          {entregado && boton("entrega", "Formato de entrega")}
          <Boton variante="fantasma" tamano="sm" onClick={() => onAbrir(s)} icono={<ExternalLink size={14} />} className="ml-auto">
            Ver servicio
          </Boton>
        </div>
      </div>
    </li>
  );
}

function Dato({ titulo, texto, vacio = "—" }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 min-w-0">
      <dt className="text-[10px] uppercase tracking-wide text-slate-500">{titulo}</dt>
      <dd className="mt-0.5 text-slate-800 whitespace-pre-line line-clamp-4">{texto || vacio}</dd>
    </div>
  );
}
