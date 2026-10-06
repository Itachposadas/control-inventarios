// src/pages/reportes/Reportes.jsx
// Reportes del admin: gasto y servicios del taller, con descarga en PDF.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import KpiCard from "../../components/dashboard/KpiCard";
import BarrasPorMes from "../../components/reportes/BarrasPorMes";
import { inputClass, Boton, Alerta } from "../../components/ui";
import { reportesApi } from "../../api/reportes";
import { vehiculosApi } from "../../api/vehiculos";
import { ADMIN_MENU, ADMIN_SECONDARY_MENU } from "../../config/menus";
import { TIPO_LABEL } from "../../config/solicitudes";
import { PERIODOS, rangoDePeriodo, etiquetaMes, moneda, fechaCorta } from "../../config/reportes";
import {
  FileDown, Loader2, ClipboardList, DollarSign, Timer, Wrench, AlertTriangle, BarChart3,
} from "lucide-react";
import { COLORS } from "../../config/colors";

export default function Reportes() {
  const [periodo, setPeriodo] = useState("mes");
  const [rango, setRango] = useState(() => rangoDePeriodo("mes"));
  const [area, setArea] = useState("");
  const [areas, setAreas] = useState([]);

  const [reporte, setReporte] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generando, setGenerando] = useState(false);

  const graficaGasto = useRef(null);
  const graficaServicios = useRef(null);

  useEffect(() => {
    vehiculosApi.areas().then(setAreas).catch(() => {});
  }, []);

  useEffect(() => {
    if (!rango.desde || !rango.hasta) return;
    let cancel = false;
    setLoading(true);
    setError("");
    reportesApi
      .obtener({ ...rango, area })
      .then((r) => !cancel && setReporte(r))
      .catch((e) => !cancel && setError(e.message || "No se pudo generar el reporte"))
      .finally(() => !cancel && setLoading(false));
    return () => { cancel = true; };
  }, [rango, area]);

  const cambiarPeriodo = (valor) => {
    setPeriodo(valor);
    if (valor !== "personalizado") setRango(rangoDePeriodo(valor));
  };

  const handlePdf = async () => {
    setGenerando(true);
    try {
      // jsPDF es pesado: se descarga solo cuando se pide el PDF
      const { descargarReportePdf } = await import("../../utils/reportePdf");
      await descargarReportePdf(reporte, {
        gasto: graficaGasto.current?.toBase64Image("image/png", 1) || null,
        servicios: graficaServicios.current?.toBase64Image("image/png", 1) || null,
      });
    } catch (e) {
      console.error(e);
      setError("No se pudo generar el PDF");
    } finally {
      setGenerando(false);
    }
  };

  const res = reporte?.resumen;
  const vacio = res && res.servicios === 0;
  const meses = reporte?.por_mes || [];

  return (
    <DashboardLayout
      menu={ADMIN_MENU}
      secondaryMenu={ADMIN_SECONDARY_MENU}
      title="Reportes"
      subtitle="Gasto y servicios del taller"
    >
      {/* ─── Filtros ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4 mb-5">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <Filtro label="Periodo">
            <select value={periodo} onChange={(e) => cambiarPeriodo(e.target.value)} className={`${inputClass} lg:w-48`}>
              {PERIODOS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </Filtro>

          {periodo === "personalizado" && (
            <>
              <Filtro label="Desde">
                <input
                  type="date"
                  value={rango.desde}
                  max={rango.hasta}
                  onChange={(e) => setRango((r) => ({ ...r, desde: e.target.value }))}
                  className={`${inputClass} lg:w-44`}
                />
              </Filtro>
              <Filtro label="Hasta">
                <input
                  type="date"
                  value={rango.hasta}
                  min={rango.desde}
                  onChange={(e) => setRango((r) => ({ ...r, hasta: e.target.value }))}
                  className={`${inputClass} lg:w-44`}
                />
              </Filtro>
            </>
          )}

          <Filtro label="Área">
            <select value={area} onChange={(e) => setArea(e.target.value)} className={`${inputClass} lg:w-56`}>
              <option value="">Todas las áreas</option>
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </Filtro>

          <div className="lg:ml-auto">
            <Boton
              onClick={handlePdf}
              disabled={!reporte || loading || generando}
              icono={generando ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
              className="w-full lg:w-auto"
            >
              {generando ? "Generando PDF..." : "Descargar PDF"}
            </Boton>
          </div>
        </div>
        {reporte && (
          <p className="mt-3 text-xs text-slate-500">
            Servicios que ingresaron al taller del {fechaCorta(reporte.periodo.desde)} al {fechaCorta(reporte.periodo.hasta)}
            {reporte.periodo.area ? ` · Área: ${reporte.periodo.area}` : ""}
          </p>
        )}
      </div>

      {error && (
        <Alerta className="mb-4">{error}</Alerta>
      )}

      {loading && !reporte ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 size={28} className="animate-spin" />
          <span className="ml-3 text-sm">Generando reporte...</span>
        </div>
      ) : reporte && (
        <div className={`space-y-5 transition-opacity ${loading ? "opacity-60" : ""}`}>
          {/* ─── Resumen ─── */}
          <div className="stagger grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              label="Servicios ingresados"
              value={res.servicios}
              accent={COLORS.institucional}
              icon={<ClipboardList size={20} />}
              status={`${res.terminados} terminados`}
              statusType="info"
            />
            <KpiCard
              label="Gasto total"
              value={moneda(res.gasto_total, 0)}
              accent={COLORS.success}
              icon={<DollarSign size={20} />}
              status={`Promedio ${moneda(res.gasto_promedio, 0)} por servicio`}
              statusType="success"
            />
            <KpiCard
              label="Tiempo promedio en taller"
              value={res.dias_promedio_taller == null ? "—" : `${res.dias_promedio_taller} días`}
              accent={COLORS.info}
              icon={<Timer size={20} />}
              status="Del ingreso a completado"
              statusType="info"
            />
            <KpiCard
              label="Siguen en taller"
              value={res.en_taller}
              accent={COLORS.warning}
              icon={<Wrench size={20} />}
              status="Sin completar"
              statusType="warning"
            />
          </div>

          {res.sin_costo > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl">
              <AlertTriangle size={18} className="shrink-0" />
              {res.sin_costo} {res.sin_costo === 1 ? "servicio terminado no tiene" : "servicios terminados no tienen"} costo
              capturado; el gasto total puede estar incompleto.
            </div>
          )}

          {vacio ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <BarChart3 size={44} className="mx-auto text-slate-300" />
              <p className="mt-4 text-sm font-medium text-slate-700">No hay servicios en este periodo</p>
              <p className="mt-1 text-xs text-slate-500">Prueba con otro periodo o área.</p>
            </div>
          ) : (
            <>
              {/* ─── Gráficas ─── */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <Tarjeta titulo="Gasto por mes" subtitulo="Suma del costo de los servicios">
                  <div className="h-64">
                    <BarrasPorMes
                      ref={graficaGasto}
                      labels={meses.map((m) => etiquetaMes(m.mes))}
                      values={meses.map((m) => m.gasto)}
                      formato={(v) => moneda(v, 0)}
                    />
                  </div>
                </Tarjeta>
                <Tarjeta titulo="Servicios ingresados por mes" subtitulo="Entradas al taller">
                  <div className="h-64">
                    <BarrasPorMes
                      ref={graficaServicios}
                      labels={meses.map((m) => etiquetaMes(m.mes))}
                      values={meses.map((m) => m.servicios)}
                    />
                  </div>
                </Tarjeta>
              </div>

              {/* ─── Desgloses ─── */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <Tarjeta titulo="Gasto por área">
                  <TablaProporcion
                    filas={reporte.por_area.map((a) => ({ clave: a.area, nombre: a.area, servicios: a.servicios, gasto: a.gasto }))}
                    columna="Área"
                  />
                </Tarjeta>
                <Tarjeta titulo="Gasto por tipo de servicio">
                  <TablaProporcion
                    filas={reporte.por_tipo.map((t) => ({ clave: t.tipo, nombre: TIPO_LABEL[t.tipo] || t.tipo, servicios: t.servicios, gasto: t.gasto }))}
                    columna="Tipo"
                  />
                </Tarjeta>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <Tarjeta titulo="Vehículos con mayor gasto" subtitulo="Los 10 que más han costado en el periodo">
                  <TablaVehiculos filas={reporte.top_costo} />
                </Tarjeta>
                <Tarjeta titulo="Vehículos que más ingresan al taller" subtitulo="Los 10 con más servicios en el periodo">
                  <TablaVehiculos filas={reporte.top_ingresos} />
                </Tarjeta>
              </div>
            </>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}

/* ───── Sub-componentes ───── */

function Filtro({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Tarjeta({ titulo, subtitulo, children }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-800">{titulo}</h3>
        {subtitulo && <p className="text-xs text-slate-500 mt-0.5">{subtitulo}</p>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

// Tabla con barra de proporción del gasto (magnitud, un solo color)
function TablaProporcion({ filas, columna }) {
  if (!filas.length) return <p className="text-sm text-slate-500 py-4 text-center">Sin datos</p>;
  const max = Math.max(...filas.map((f) => f.gasto), 0);
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-[11px] uppercase tracking-wide text-slate-500">
          <th className="text-left font-semibold pb-2">{columna}</th>
          <th className="text-right font-semibold pb-2 w-20">Servicios</th>
          <th className="text-right font-semibold pb-2 w-44">Gasto</th>
        </tr>
      </thead>
      <tbody>
        {filas.map((f) => (
          <tr key={f.clave}>
            <td className="py-2 pr-3 text-slate-800">{f.nombre}</td>
            <td className="py-2 text-right text-slate-600 tabular-nums">{f.servicios}</td>
            <td className="py-2 pl-3">
              <div className="text-right font-semibold text-slate-800 tabular-nums">{moneda(f.gasto)}</div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-institucional origin-left animate-grow-x"
                  style={{ width: max ? `${(f.gasto / max) * 100}%` : 0 }}
                />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TablaVehiculos({ filas }) {
  if (!filas.length) return <p className="text-sm text-slate-500 py-4 text-center">Sin datos</p>;
  return (
    <div className="overflow-x-auto -mx-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-100">
            <th className="text-left font-semibold px-5 py-2 w-8">#</th>
            <th className="text-left font-semibold px-2 py-2">Vehículo</th>
            <th className="text-right font-semibold px-2 py-2">Servicios</th>
            <th className="text-right font-semibold px-5 py-2">Gasto</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filas.map((v, i) => (
            <tr key={v.vehiculo_id} className="hover:bg-slate-50 transition">
              <td className="px-5 py-2.5 text-xs text-slate-500 font-mono">{String(i + 1).padStart(2, "0")}</td>
              <td className="px-2 py-2.5">
                <Link to={`/admin/vehiculos/${v.vehiculo_id}`} className="font-medium text-slate-800 hover:text-institucional">
                  {v.nombre}
                </Link>
                <p className="text-xs text-slate-500">{[v.no_inventario, v.area].filter(Boolean).join(" · ")}</p>
              </td>
              <td className="px-2 py-2.5 text-right text-slate-600 tabular-nums">{v.servicios}</td>
              <td className="px-5 py-2.5 text-right font-semibold text-slate-800 tabular-nums">{moneda(v.gasto)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
