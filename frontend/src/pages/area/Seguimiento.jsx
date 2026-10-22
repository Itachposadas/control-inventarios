// src/pages/area/Seguimiento.jsx
// SEGUIMIENTO de la cuenta de un área: sus solicitudes con el avance de cada una.
// Se busca por folio (PET-… de la solicitud o SOL-… del servicio), vehículo o placas.
// Solo muestra la etapa y las fechas; los datos internos del taller no salen aquí.
// Cuando el mecánico firma de recibido, el área ya puede descargar o imprimir
// el formato de solicitud con las dos firmas. Cuando la reparación termina (ya
// tiene la foto final) se avisa que la unidad está lista para recogerse.
import { useEffect, useMemo, useState } from "react";
import { useAutoActualizar } from "../../hooks/useAutoActualizar";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { areaApi } from "../../api/area";
import { AREA_MENU, AREA_SECONDARY_MENU } from "../../config/menus";
import { Alerta, Boton, Insignia } from "../../components/ui";
import { descargarSolicitudPdf } from "../../utils/solicitudPdf";
import {
  Search, Loader2, CarFront, Check, XCircle, AlertCircle, FileText, FileDown, Printer, CheckCircle2,
} from "lucide-react";

// Etapas que ve el área, de la solicitud a la entrega
const ETAPAS = ["Enviada", "Recibida en taller", "Diagnóstico", "Reparación", "Entregada"];
// El área no ve los pasos internos (formato de ingreso, orden de compra): cuentan como reparación
const INDICE_SERVICIO = { diagnostico: 2, ingreso: 3, compra: 3, reparacion: 3, entregada: 4 };

const FILTROS = [
  { value: "todas", label: "Todas" },
  { value: "curso", label: "En curso" },
  { value: "concluidas", label: "Concluidas" },
];

const aFecha = (iso) => new Date(iso.endsWith("Z") ? iso : `${iso}Z`);

function fechaHora(iso) {
  if (!iso) return "—";
  return aFecha(iso).toLocaleString("es-MX", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const normalizar = (t) =>
  (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Etapa actual (índice de ETAPAS) o null si la solicitud no procedió
function etapaDe(p) {
  if (p.estado === "descartada") return null;
  if (p.estado === "pendiente") return p.recibida_at ? 1 : 0;  // ya firmó de recibido el mecánico
  return p.servicio ? INDICE_SERVICIO[p.servicio.estado] ?? 1 : 1;
}

function situacion(p) {
  const i = etapaDe(p);
  if (i === null) return { texto: "No procedió", tono: "rojo" };
  if (i === 0) return { texto: "En espera", tono: "ambar" };
  if (i === 4) return { texto: "Entregada", tono: "verde" };
  if (p.servicio?.listo) return { texto: "Lista para entregar", tono: "verde" };
  return { texto: "En servicio", tono: "azul" };
}

const concluida = (p) => p.estado === "descartada" || p.servicio?.estado === "entregada";

export default function Seguimiento() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [lista, setLista] = useState(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState(params.get("folio") || "");
  // Al abrir un aviso de la campana estando ya en esta pantalla, busca ese folio
  const folio = params.get("folio");
  useEffect(() => {
    if (folio) setQ(folio);
  }, [folio]);
  const [filtro, setFiltro] = useState("todas");

  useEffect(() => {
    areaApi
      .peticiones()
      .then(setLista)
      .catch((e) => {
        setError(e.message || "No se pudieron cargar las solicitudes");
        setLista([]);
      });
  }, []);

  // El área ve el avance de su servicio sin recargar la página
  useAutoActualizar(() => areaApi.peticiones().then(setLista).catch(() => {}));

  const filtradas = useMemo(() => {
    if (!lista) return [];
    const palabras = normalizar(q).split(/\s+/).filter(Boolean);
    return lista.filter((p) => {
      if (filtro === "curso" && concluida(p)) return false;
      if (filtro === "concluidas" && !concluida(p)) return false;
      const v = p.vehiculo || {};
      const texto = normalizar(
        [p.folio, p.servicio?.folio, p.solicitante_nombre, v.nombre, v.marca, v.modelo, v.placas, v.noInventario].join(" ")
      );
      return palabras.every((w) => texto.includes(w));
    });
  }, [lista, q, filtro]);

  return (
    <DashboardLayout
      menu={AREA_MENU}
      secondaryMenu={AREA_SECONDARY_MENU}
      title="Seguimiento"
      subtitle={`Avance de las solicitudes de ${user?.area || "tu área"}`}
    >
      <div className="space-y-4">
        {/* Buscador y filtro */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por folio, vehículo o placas"
              aria-label="Buscar solicitud"
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm
                         focus:outline-none focus:border-institucional/60 focus:ring-4 focus:ring-institucional/10 transition"
            />
          </div>
          <div className="flex rounded-xl bg-slate-100 p-1 shrink-0" role="group" aria-label="Filtrar solicitudes">
            {FILTROS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFiltro(f.value)}
                aria-pressed={filtro === f.value}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-sm font-medium transition
                  ${filtro === f.value ? "bg-white text-institucional shadow-sm" : "text-slate-600 hover:text-slate-800"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {error && <Alerta icono={<AlertCircle size={16} />}>{error}</Alerta>}

        {lista === null ? (
          <div className="flex justify-center py-14 text-slate-500">
            <Loader2 size={26} className="animate-spin" />
          </div>
        ) : filtradas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 px-5 py-12 text-center text-sm text-slate-500">
            {lista.length === 0
              ? "Tu área todavía no tiene solicitudes."
              : "No se encontró ninguna solicitud con esa búsqueda."}
          </div>
        ) : (
          <ul className="space-y-3">
            {filtradas.map((p) => (
              <Tarjeta key={p.id} p={p} />
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
}

/* ───── Una solicitud ───── */

function Tarjeta({ p }) {
  const v = p.vehiculo || {};
  const etapa = etapaDe(p);
  const { texto, tono } = situacion(p);

  return (
    <li className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono font-bold text-institucional tracking-wide">{p.folio}</p>
            <p className="text-xs text-slate-500">
              Enviada el {fechaHora(p.fecha)}
              {p.solicitante_nombre && <> · Solicitó: {p.solicitante_nombre}</>}
            </p>
          </div>
          <Insignia tono={tono}>{texto}</Insignia>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-institucional/10 text-institucional flex items-center justify-center shrink-0">
            <CarFront size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{v.nombre}</p>
            <p className="text-xs text-slate-500 truncate">
              {[v.marca, v.modelo, v.placas && `Placas ${v.placas}`].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>

        {p.servicio?.listo && (
          <Alerta tipo="exito" className="mt-4" icono={<CheckCircle2 size={16} />}>
            <span className="font-semibold">Tu vehículo está listo.</span> La reparación terminó; pasa a recogerlo
            a la Coordinación de Parque Vehicular.
          </Alerta>
        )}

        {etapa === null ? (
          <Alerta className="mt-4" icono={<XCircle size={16} />}>
            <span className="font-semibold">La solicitud no procedió.</span>
            {p.motivo_descarte && <> Motivo: {p.motivo_descarte}</>}
          </Alerta>
        ) : (
          <Avance etapa={etapa} />
        )}

        {p.servicio && (
          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <Dato etiqueta="Folio del servicio" valor={p.servicio.folio} mono />
            <Dato etiqueta="Recibida en taller" valor={fechaHora(p.servicio.fecha_ingreso)} />
            <Dato etiqueta="Entregada" valor={p.servicio.fecha_entrega ? fechaHora(p.servicio.fecha_entrega) : "Pendiente"} />
          </dl>
        )}
      </div>

      {etapa !== null && p.recibida_at && <FormatoSolicitud p={p} />}
    </li>
  );
}

// Formato de solicitud firmado por el solicitante y el mecánico que la recibió.
// Se pide al momento porque trae las firmas.
function FormatoSolicitud({ p }) {
  const [ocupado, setOcupado] = useState(null);
  const [error, setError] = useState("");

  const generar = async (accion) => {
    // La pestaña se abre en el clic para que el navegador no la bloquee
    const ventana = accion === "imprimir" ? window.open("", "_blank") : null;
    setOcupado(accion);
    setError("");
    try {
      await descargarSolicitudPdf(await areaApi.formato(p.id), ventana || undefined);
    } catch (e) {
      ventana?.close();
      setError(e.message || "No se pudo generar el formato");
    } finally {
      setOcupado(null);
    }
  };

  const icono = (accion, Icono) =>
    ocupado === accion ? <Loader2 size={14} className="animate-spin" /> : <Icono size={14} />;

  return (
    <div className="border-t border-slate-100 bg-slate-50/70 px-4 sm:px-5 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-institucional flex items-center justify-center shrink-0">
          <FileText size={16} />
        </span>
        <div className="min-w-0 mr-auto">
          <p className="text-sm font-semibold text-slate-800">Formato de solicitud</p>
          <p className="text-xs text-slate-500">
            Firmado por el taller el {fechaHora(p.recibida_at)}
          </p>
        </div>
        <div className="flex gap-2">
          <Boton variante="secundario" tamano="sm" icono={icono("imprimir", Printer)}
            onClick={() => generar("imprimir")} disabled={!!ocupado}>
            Ver e imprimir
          </Boton>
          <Boton variante="contorno" tamano="sm" icono={icono("descargar", FileDown)}
            onClick={() => generar("descargar")} disabled={!!ocupado}>
            Descargar
          </Boton>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// Línea de etapas: completadas en verde, la actual en guinda
function Avance({ etapa }) {
  return (
    <ol className="mt-5 grid grid-cols-5 gap-1" aria-label={`Etapa actual: ${ETAPAS[etapa]}`}>
      {ETAPAS.map((nombre, i) => {
        const hecha = i < etapa || (i === etapa && i === ETAPAS.length - 1);
        const actual = i === etapa && !hecha;
        return (
          <li key={nombre} className="relative flex flex-col items-center text-center">
            {i > 0 && (
              <span
                aria-hidden
                className={`absolute top-3 right-1/2 w-full h-0.5 -z-0 ${i <= etapa ? "bg-emerald-500" : "bg-slate-200"}`}
              />
            )}
            <span
              className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold
                ${hecha ? "bg-emerald-600 text-white" : actual ? "bg-institucional text-white ring-4 ring-institucional/15" : "bg-slate-200 text-slate-500"}`}
            >
              {hecha ? <Check size={13} strokeWidth={3} /> : i + 1}
            </span>
            <span
              className={`mt-1.5 text-[10px] sm:text-xs leading-tight
                ${actual ? "font-semibold text-slate-800" : hecha ? "text-slate-600" : "text-slate-500"}`}
            >
              {nombre}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Dato({ etiqueta, valor, mono = false }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <dt className="text-slate-500">{etiqueta}</dt>
      <dd className={`mt-0.5 font-semibold text-slate-800 ${mono ? "font-mono" : ""}`}>{valor}</dd>
    </div>
  );
}
