// src/pages/solicitudes/SolicitudNueva.jsx
// FORMATO DE INGRESO A TALLER (Municipio de Atlacomulco). Solo lo llena el mecánico.
//  1. Encabezado: fecha de ingreso y "Hoja no. __ de __"
//  2. Datos del vehículo/maquinaria (del catálogo, solo lectura)
//  3. Accesorios y herramientas: SI / NO por concepto + total de birlos
//  4. Observaciones
// Las fotos se suben después en "Evidencia fotográfica".
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import DatosVehiculo, { datosDesdeVehiculo } from "../../components/solicitudes/DatosVehiculo";
import Checklist from "../../components/solicitudes/Checklist";
import { Section, Field, TextArea, inputClass } from "../../components/solicitudes/ui";
import { solicitudesApi } from "../../api/solicitudes";
import { vehiculosApi } from "../../api/vehiculos";
import { MECANICO_MENU, MECANICO_SECONDARY_MENU } from "../../config/menus";
import { CHECKLIST_ITEMS, conceptosSinMarcar } from "../../config/solicitudes";
import { ArrowLeft, Search, CarFront, Loader2 } from "lucide-react";

// Fecha local de hoy en formato AAAA-MM-DD (para el <input type="date">)
function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function SolicitudNueva() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const accesoriosRef = useRef(null);

  // Selección de vehículo
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [vehiculo, setVehiculo] = useState(null);

  // Formato
  const [form, setForm] = useState({
    fecha_ingreso: hoyISO(),
    hoja_no: 1,
    hoja_total: 1,
    checklist: {},
    total_birlos: "",
    observaciones_ingreso: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [resaltarFaltantes, setResaltarFaltantes] = useState(false);

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const elegirVehiculo = (v) => {
    setVehiculo(v);
    setResultados([]);
    setBusqueda("");
  };

  // Vehículo preseleccionado: /nueva?vehiculo=12 (desde el detalle del vehículo)
  useEffect(() => {
    const id = searchParams.get("vehiculo");
    if (id) vehiculosApi.obtener(id).then(elegirVehiculo).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Búsqueda de vehículos
  useEffect(() => {
    if (busqueda.trim().length < 2) {
      setResultados([]);
      return;
    }
    let cancel = false;
    setBuscando(true);
    const timer = setTimeout(() => {
      vehiculosApi
        .listar({ q: busqueda.trim() })
        .then((data) => !cancel && setResultados(data.slice(0, 8)))
        .catch(() => !cancel && setResultados([]))
        .finally(() => !cancel && setBuscando(false));
    }, 250);
    return () => {
      cancel = true;
      clearTimeout(timer);
    };
  }, [busqueda]);

  const sinMarcar = conceptosSinMarcar(form.checklist);
  const marcados = CHECKLIST_ITEMS.length - sinMarcar.length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.fecha_ingreso) return setError("Captura la fecha de ingreso");
    if (form.fecha_ingreso > hoyISO()) return setError("La fecha de ingreso no puede ser futura");
    const hojaNo = Number(form.hoja_no);
    const hojaTotal = Number(form.hoja_total);
    if (!hojaNo || !hojaTotal || hojaNo > hojaTotal) return setError("Revisa la hoja (ej. hoja 1 de 1)");
    if (!vehiculo) return setError("Selecciona el vehículo o maquinaria que ingresa al taller");

    if (sinMarcar.length || form.total_birlos === "") {
      setResaltarFaltantes(true);
      accesoriosRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      const partes = [];
      if (sinMarcar.length) partes.push(`${sinMarcar.length} ${sinMarcar.length === 1 ? "concepto" : "conceptos"} sin marcar`);
      if (form.total_birlos === "") partes.push("el total de birlos");
      return setError(`Falta en accesorios y herramientas: ${partes.join(" y ")}`);
    }

    setSaving(true);
    try {
      const creada = await solicitudesApi.crear({
        vehiculo_id: vehiculo.id,
        fecha_ingreso: form.fecha_ingreso,
        hoja_no: hojaNo,
        hoja_total: hojaTotal,
        checklist: form.checklist,
        total_birlos: Number(form.total_birlos),
        observaciones_ingreso: form.observaciones_ingreso,
      });
      // Siguiente paso natural: tomar la foto de llegada
      navigate(`/mecanico/evidencia?servicio=${creada.id}`, { replace: true });
    } catch (err) {
      setError(err.message || "Error al registrar el ingreso");
      setSaving(false);
    }
  };

  return (
    <DashboardLayout
      menu={MECANICO_MENU}
      secondaryMenu={MECANICO_SECONDARY_MENU}
      title="Formato de ingreso a taller"
      subtitle="Registra cómo llega el vehículo o maquinaria"
    >
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium
                   text-slate-600 hover:text-[#9F2241] transition"
      >
        <ArrowLeft size={16} />
        Volver
      </button>

      <form onSubmit={handleSubmit} className="space-y-5 pb-24">
        {/* ═════ ENCABEZADO ═════ */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
          <div className="h-1.5 bg-[#9F2241]" />
          <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center gap-5">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <img src="/logo-atlacomulco.png" alt="Municipio de Atlacomulco" className="h-14 w-auto object-contain shrink-0" />
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight leading-tight">
                  FORMATO DE INGRESO A TALLER
                </h2>
                <p className="text-sm font-medium text-[#9F2241]">Municipio de Atlacomulco</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:w-[26rem] shrink-0">
              <Field label="Fecha de ingreso" required>
                <input
                  type="date"
                  value={form.fecha_ingreso}
                  max={hoyISO()}
                  onChange={(e) => set("fecha_ingreso", e.target.value)}
                  required
                  className={inputClass}
                />
              </Field>
              <Field label="Hoja no.">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="99"
                    inputMode="numeric"
                    value={form.hoja_no}
                    onChange={(e) => set("hoja_no", e.target.value)}
                    aria-label="Hoja número"
                    className={`${inputClass} text-center`}
                  />
                  <span className="text-sm text-slate-500 shrink-0">de</span>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    inputMode="numeric"
                    value={form.hoja_total}
                    onChange={(e) => set("hoja_total", e.target.value)}
                    aria-label="Total de hojas"
                    className={`${inputClass} text-center`}
                  />
                </div>
              </Field>
            </div>
          </div>
        </section>

        {/* ═════ DATOS DEL VEHÍCULO/MAQUINARIA ═════ */}
        <Section title="DATOS DEL VEHÍCULO/MAQUINARIA" subtitle="Búscalo en el catálogo; sus datos se llenan solos (solo lectura)">
          {vehiculo ? (
            <div className="space-y-5">
              <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-11 h-11 rounded-xl bg-[#9F2241]/10 text-[#9F2241] flex items-center justify-center shrink-0">
                  <CarFront size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 truncate">
                    {vehiculo.numeroEconomico || vehiculo.unidad || vehiculo.noInventario}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{vehiculo.unidad || vehiculo.descripcion}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setVehiculo(null)}
                  className="text-sm font-medium text-[#9F2241] hover:underline shrink-0"
                >
                  Cambiar
                </button>
              </div>
              <DatosVehiculo datos={datosDesdeVehiculo(vehiculo)} />
            </div>
          ) : (
            <div className="relative">
              <Search size={16} className="absolute left-3 top-[11px] text-slate-400" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Escribe No. inventario, placas, No. económico o unidad..."
                className={`${inputClass} pl-9`}
                autoFocus
              />
              {buscando && (
                <Loader2 size={16} className="absolute right-3 top-[11px] text-slate-400 animate-spin" />
              )}
              {resultados.length > 0 && (
                <ul className="mt-2 border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden animate-pop origin-top">
                  {resultados.map((v) => {
                    const deBaja = v.estado === "baja";
                    return (
                      <li key={v.id}>
                        <button
                          type="button"
                          disabled={deBaja}
                          onClick={() => elegirVehiculo(v)}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition
                                     disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <p className="text-sm font-semibold text-slate-800">
                            {v.numeroEconomico || v.unidad || v.noInventario}
                            {deBaja && <span className="ml-2 text-xs font-medium text-red-600">(de baja)</span>}
                            {v.estado === "mantenimiento" && (
                              <span className="ml-2 text-xs font-medium text-amber-600">(ya está en taller)</span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500">
                            {[v.noInventario, v.placas, v.marca, v.area].filter(Boolean).join(" · ")}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {busqueda.trim().length >= 2 && !buscando && resultados.length === 0 && (
                <p className="mt-2 text-sm text-slate-500">
                  No se encontró. Si es un vehículo nuevo, primero el administrador debe darlo de alta en Vehículos.
                </p>
              )}
            </div>
          )}
        </Section>

        {/* ═════ ACCESORIOS Y HERRAMIENTAS ═════ */}
        <div ref={accesoriosRef} className="scroll-mt-20">
          <Section
            title="ACCESORIOS Y HERRAMIENTAS"
            subtitle="Marca cada concepto con SI o NO según llega el vehículo"
            actions={
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0
                  ${sinMarcar.length ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}
              >
                {marcados} de {CHECKLIST_ITEMS.length}
              </span>
            }
          >
            <Checklist
              value={form.checklist}
              onChange={(v) => set("checklist", v)}
              birlos={form.total_birlos}
              onBirlosChange={(v) => set("total_birlos", v)}
              resaltarFaltantes={resaltarFaltantes}
            />
          </Section>
        </div>

        {/* ═════ OBSERVACIONES ═════ */}
        <Section title="OBSERVACIONES">
          <TextArea
            value={form.observaciones_ingreso}
            onChange={(v) => set("observaciones_ingreso", v)}
            placeholder="Ej. No trae faros delanteros"
            rows={4}
          />
        </Section>

        {/* Barra de acciones */}
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-20 bg-white/95 backdrop-blur border-t border-slate-200">
          <div className="px-4 sm:px-6 py-3 flex items-center justify-end gap-3">
            {error ? (
              <p className="text-sm text-red-600 mr-auto">{error}</p>
            ) : (
              <p className="hidden sm:block text-sm text-slate-500 mr-auto">
                {sinMarcar.length
                  ? `Faltan ${sinMarcar.length} conceptos por marcar`
                  : "Accesorios y herramientas completos"}
              </p>
            )}
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-100 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-[#9F2241] hover:bg-[#7d1a33]
                         text-white disabled:bg-slate-300 disabled:cursor-not-allowed transition"
            >
              {saving ? "Registrando..." : "Registrar ingreso"}
            </button>
          </div>
        </div>
      </form>
    </DashboardLayout>
  );
}
