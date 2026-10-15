// src/pages/historial/HistorialServicios.jsx
// HISTORIAL DE SERVICIOS: solo las unidades que ya tuvieron servicio. A la
// izquierda la lista (buscar, filtrar por área, ordenar); a la derecha el
// expediente de la unidad elegida. ?vehiculo=ID la preselecciona y
// ?preventivo=avisos abre la lista filtrada por mantenimiento preventivo.
// La lista se pagina en el backend (25 por página).
// Admin y parque vehicular; el gasto solo lo ve el admin.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import ExpedienteServicios, { ResumenExpediente } from "../../components/vehiculos/ExpedienteServicios";
import { Alerta, Paginacion, inputClass } from "../../components/ui";
import { historialApi } from "../../api/historial";
import { useAuth } from "../../context/AuthContext";
import { menusForRole } from "../../config/menus";
import { ROLES } from "../../config/roles";
import { SOLICITUDES_BASE, formatFecha, formatMoneda } from "../../config/solicitudes";
import { Search, Loader2, CarFront, ChevronRight, History, Wrench, CalendarClock } from "lucide-react";

const FILTROS_PREVENTIVO = [
  { valor: "", label: "Todas las unidades" },
  { valor: "avisos", label: "Con aviso de mantenimiento preventivo" },
  { valor: "vencido", label: "Preventivo vencido" },
  { valor: "proximo", label: "Preventivo próximo" },
];

// "Vencido hace 12 días" / "Toca en 5 días" / "Toca hoy"
function textoPreventivo(p) {
  if (p.dias < 0) return `Preventivo vencido hace ${-p.dias} ${p.dias === -1 ? "día" : "días"}`;
  if (p.dias === 0) return "Preventivo: toca hoy";
  return `Preventivo en ${p.dias} ${p.dias === 1 ? "día" : "días"}`;
}

export default function HistorialServicios() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { menu, secondaryMenu } = menusForRole(role);
  const esAdmin = role === ROLES.ADMIN;
  const [params, setParams] = useSearchParams();
  const seleccion = Number(params.get("vehiculo")) || null;

  const [q, setQ] = useState("");
  const [area, setArea] = useState("");
  const [orden, setOrden] = useState("reciente");
  const [preventivo, setPreventivo] = useState(params.get("preventivo") || "");
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [expediente, setExpediente] = useState(null);
  const [cargandoExp, setCargandoExp] = useState(false);
  const panelRef = useRef(null);

  // La búsqueda espera a que se deje de escribir
  useEffect(() => {
    const t = setTimeout(() => {
      historialApi
        .vehiculos({ q, area, orden, preventivo, pagina })
        .then((d) => {
          setDatos(d);
          setError("");
        })
        .catch((e) => setError(e.message || "No se pudo cargar el historial"));
    }, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [q, area, orden, preventivo, pagina]);

  // Cada búsqueda o filtro nuevo empieza en la página 1
  const filtrar = (setter) => (valor) => {
    setter(valor);
    setPagina(1);
  };

  useEffect(() => {
    if (!seleccion) {
      setExpediente(null);
      return;
    }
    setCargandoExp(true);
    historialApi
      .vehiculo(seleccion)
      .then((d) => {
        setExpediente(d);
        if (window.innerWidth < 1024) panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      })
      .catch((e) => setError(e.message || "No se pudo cargar el expediente"))
      .finally(() => setCargandoExp(false));
  }, [seleccion]);

  const areas = useMemo(() => datos?.areas || [], [datos]);
  const lista = datos?.vehiculos || [];
  const total = datos?.total ?? lista.length;
  const elegir = (id) => setParams({ vehiculo: id });
  const v = expediente?.vehiculo;

  return (
    <DashboardLayout
      menu={menu}
      secondaryMenu={secondaryMenu}
      title="Historial de servicios"
      subtitle="Expediente de mantenimiento de las unidades que han tenido servicio"
    >
      {error && <Alerta className="mb-4">{error}</Alerta>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* ─── Unidades con servicio ─── */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="p-4 border-b border-slate-100 space-y-2.5">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                value={q}
                onChange={(e) => filtrar(setQ)(e.target.value)}
                placeholder="Buscar por placas, inventario o vehículo"
                aria-label="Buscar vehículo"
                className={`${inputClass} pl-9`}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={area} onChange={(e) => filtrar(setArea)(e.target.value)} aria-label="Área" className={inputClass}>
                <option value="">Todas las áreas</option>
                {areas.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <select value={orden} onChange={(e) => filtrar(setOrden)(e.target.value)} aria-label="Ordenar" className={inputClass}>
                <option value="reciente">Más recientes</option>
                <option value="servicios">Más servicios</option>
                {esAdmin && <option value="gasto">Mayor gasto</option>}
              </select>
            </div>
            <select
              value={preventivo}
              onChange={(e) => filtrar(setPreventivo)(e.target.value)}
              aria-label="Mantenimiento preventivo"
              className={inputClass}
            >
              {FILTROS_PREVENTIVO.map((f) => <option key={f.valor} value={f.valor}>{f.label}</option>)}
            </select>
          </div>

          {datos === null ? (
            <div className="flex justify-center py-14 text-slate-500"><Loader2 size={24} className="animate-spin" /></div>
          ) : lista.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <History size={34} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm text-slate-600">
                {q || area || preventivo
                  ? "Ninguna unidad coincide con la búsqueda o el filtro."
                  : "Todavía ninguna unidad ha tenido servicio."}
              </p>
            </div>
          ) : (
            <>
              <p className="px-4 pt-3 text-xs text-slate-500">
                {total} {total === 1 ? "unidad" : "unidades"} con servicio
              </p>
              <ul className="p-2 space-y-1 max-h-[65vh] overflow-y-auto">
                {lista.map((x) => {
                  const activo = x.id === seleccion;
                  return (
                    <li key={x.id}>
                      <button
                        onClick={() => elegir(x.id)}
                        aria-current={activo || undefined}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition
                          ${activo ? "bg-institucional/[0.06] ring-1 ring-institucional/30" : "hover:bg-slate-50"}`}
                      >
                        <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                          ${x.en_taller ? "bg-amber-100 text-amber-900" : "bg-institucional/10 text-institucional"}`}>
                          {x.en_taller ? <Wrench size={18} /> : <CarFront size={19} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-slate-800 truncate">{x.nombre}</span>
                          <span className="block text-xs text-slate-500 truncate">
                            {[x.placas, x.no_inventario, x.area].filter(Boolean).join(" · ")}
                          </span>
                          <span className="block text-[11px] text-slate-500 mt-0.5">
                            {x.servicios} {x.servicios === 1 ? "servicio" : "servicios"} · Último {formatFecha(x.ultimo)}
                            {x.en_taller && <span className="font-semibold text-amber-900"> · En taller</span>}
                          </span>
                          {x.preventivo && x.preventivo.estado !== "al_dia" && (
                            <span
                              className={`mt-1 inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded
                                ${x.preventivo.estado === "vencido" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-900"}`}
                            >
                              <CalendarClock size={11} />
                              {textoPreventivo(x.preventivo)}
                            </span>
                          )}
                        </span>
                        {x.gasto != null && (
                          <span className="text-xs font-semibold text-slate-700 shrink-0">{formatMoneda(x.gasto)}</span>
                        )}
                        <ChevronRight size={16} className="text-slate-300 shrink-0" />
                      </button>
                    </li>
                  );
                })}
              </ul>
              {datos.paginas > 1 && (
                <Paginacion
                  className="px-4 pb-4 pt-1 border-t border-slate-100 [&>p]:text-xs"
                  pagina={datos.pagina}
                  paginas={datos.paginas}
                  total={datos.total}
                  porPagina={datos.por_pagina}
                  onCambiar={setPagina}
                />
              )}
            </>
          )}
        </section>

        {/* ─── Expediente de la unidad ─── */}
        <div ref={panelRef} className="lg:col-span-2 space-y-5 scroll-mt-20">
          {cargandoExp && !expediente ? (
            <div className="flex items-center justify-center py-20 text-slate-500"><Loader2 size={26} className="animate-spin" /></div>
          ) : !expediente ? (
            lista.length > 0 && (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
                Elige una unidad de la lista para ver su historial de servicios.
              </div>
            )
          ) : (
            <>
              <section className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-5">
                <div className="flex items-start gap-4">
                  <span className="w-12 h-12 rounded-2xl bg-institucional/10 text-institucional flex items-center justify-center shrink-0">
                    <CarFront size={24} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold text-slate-800">{v.nombre}</h2>
                    <p className="text-sm text-slate-500">
                      {[v.unidad, [v.marca, v.modelo].filter(Boolean).join(" ")].filter(Boolean).join(" · ")}
                    </p>
                    <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {[["Placas", v.placas], ["No. inventario", v.noInventario], ["No. serie", v.serie], ["Área", v.area]].map(([e, val]) => (
                        <div key={e} className="rounded-lg bg-slate-50 px-2.5 py-1.5 min-w-0">
                          <dt className="text-slate-500">{e}</dt>
                          <dd className="font-semibold text-slate-800 truncate">{val || "—"}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              </section>

              <ResumenExpediente resumen={expediente.resumen} />

              <section className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-5">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">Servicios, del más reciente al más antiguo</h3>
                <ExpedienteServicios
                  servicios={expediente.servicios}
                  onAbrir={(s) => navigate(`${SOLICITUDES_BASE[role]}/${s.id}`)}
                />
              </section>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
