// src/pages/solicitudes/SolicitudNueva.jsx
// FORMATO DE INGRESO A TALLER (Municipio de Atlacomulco). Solo lo llena el mecánico.
//  1. Encabezado: fecha de ingreso y "Hoja no. __ de __"
//  2. Datos del vehículo/maquinaria (del catálogo, solo lectura)
//  3. Accesorios y herramientas: SI / NO por concepto
//  4. Observaciones
// Las fotos se suben después en "Evidencia fotográfica".
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import DatosVehiculo, { datosDesdeVehiculo } from "../../components/solicitudes/DatosVehiculo";
import Checklist from "../../components/solicitudes/Checklist";
import { Section, Field, TextArea, inputClass, Boton } from "../../components/ui";
import { solicitudesApi } from "../../api/solicitudes";
import { vehiculosApi } from "../../api/vehiculos";
import { MECANICO_MENU, MECANICO_SECONDARY_MENU } from "../../config/menus";
import { CHECKLIST_ITEMS, conceptosSinMarcar } from "../../config/solicitudes";
import { ArrowLeft, Search, CarFront, Loader2, MapPin } from "lucide-react";

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
  const [area, setArea] = useState("");
  const [areas, setAreas] = useState([]);
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [vehiculo, setVehiculo] = useState(null);

  // Formato
  const [form, setForm] = useState({
    fecha_ingreso: hoyISO(),
    hoja_no: 1,
    hoja_total: 1,
    checklist: {},
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

  useEffect(() => {
    vehiculosApi.areas().then(setAreas).catch(() => {});
  }, []);

  // Búsqueda de vehículos: por texto (2+ letras) y/o por área.
  // Con un área elegida se muestran todas sus unidades aunque no se escriba nada.
  const hayBusqueda = busqueda.trim().length >= 2 || Boolean(area);
  useEffect(() => {
    if (!hayBusqueda) {
      setResultados([]);
      return;
    }
    let cancel = false;
    setBuscando(true);
    const timer = setTimeout(() => {
      vehiculosApi
        .listar({ q: busqueda.trim(), area })
        .then((data) => !cancel && setResultados(data.slice(0, 50)))
        .catch(() => !cancel && setResultados([]))
        .finally(() => !cancel && setBuscando(false));
    }, 250);
    return () => {
      cancel = true;
      clearTimeout(timer);
    };
  }, [busqueda, area, hayBusqueda]);

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

    if (sinMarcar.length) {
      setResaltarFaltantes(true);
      accesoriosRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return setError(
        `Falta en accesorios y herramientas: ${sinMarcar.length} ${sinMarcar.length === 1 ? "concepto" : "conceptos"} sin marcar`
      );
    }

    setSaving(true);
    try {
      const creada = await solicitudesApi.crear({
        vehiculo_id: vehiculo.id,
        fecha_ingreso: form.fecha_ingreso,
        hoja_no: hojaNo,
        hoja_total: hojaTotal,
        checklist: form.checklist,
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
                   text-slate-600 hover:text-institucional transition"
      >
        <ArrowLeft size={16} />
        Volver
      </button>

      <form onSubmit={handleSubmit} className="space-y-5 pb-24">
        {/* ═════ ENCABEZADO ═════ */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
          <div className="h-1.5 bg-institucional" />
          <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center gap-5">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <img src="/logo-atlacomulco.png" alt="Municipio de Atlacomulco" className="h-14 w-auto object-contain shrink-0" />
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight leading-tight">
                  FORMATO DE INGRESO A TALLER
                </h2>
                <p className="text-sm font-medium text-institucional">Municipio de Atlacomulco</p>
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
                <div className="w-11 h-11 rounded-xl bg-institucional/10 text-institucional flex items-center justify-center shrink-0">
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
                  className="text-sm font-medium text-institucional hover:underline shrink-0"
                >
                  Cambiar
                </button>
              </div>
              <DatosVehiculo datos={datosDesdeVehiculo(vehiculo)} />
            </div>
          ) : (
            <div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative sm:w-64 shrink-0">
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    aria-label="Área"
                    className={`${inputClass} pl-9 cursor-pointer ${area ? "border-institucional/50 font-medium" : ""}`}
                  >
                    <option value="">Todas las áreas</option>
                    {areas.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Escribe placas, No. económico, marca, área (ej. BOMBEROS)..."
                    className={`${inputClass} pl-9`}
                    autoFocus
                  />
                  {buscando && (
                    <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 animate-spin" />
                  )}
                </div>
              </div>
              {!hayBusqueda && (
                <p className="mt-2 text-xs text-slate-500">
                  Elige el área de donde viene el vehículo para ver todas sus unidades, o escribe para buscarlo.
                </p>
              )}
              {hayBusqueda && !buscando && resultados.length > 0 && (
                <p className="mt-2 text-xs text-slate-500">
                  {resultados.length === 50 ? "Más de 50" : resultados.length}{" "}
                  {resultados.length === 1 ? "unidad encontrada" : "unidades encontradas"}
                  {area && ` en ${area}`} · toca la que llegó
                </p>
              )}
              {resultados.length > 0 && (
                <ul className="mt-2 max-h-96 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 animate-pop origin-top">
                  {resultados.map((v) => {
                    const deBaja = v.estado === "baja";
                    return (
                      <li key={v.id}>
                        <button
                          type="button"
                          disabled={deBaja}
                          onClick={() => elegirVehiculo(v)}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 transition
                                     disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <p className="text-sm font-semibold text-slate-800">
                            {v.numeroEconomico || v.unidad || v.noInventario}
                            {deBaja && <span className="ml-2 text-xs font-medium text-red-600">(de baja)</span>}
                            {v.estado === "mantenimiento" && (
                              <span className="ml-2 text-xs font-medium text-amber-700">(ya está en taller)</span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500">
                            {[v.area, v.placas, v.marca, v.modelo, v.color, v.noInventario].filter(Boolean).join(" · ")}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {hayBusqueda && !buscando && resultados.length === 0 && (
                <p className="mt-2 text-sm text-slate-500">
                  No se encontró{area && busqueda.trim() ? ` en ${area}; prueba con “Todas las áreas”` : ""}.
                  Si es un vehículo nuevo, primero el administrador debe darlo de alta en Vehículos.
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
            {!vehiculo && <PrimeroElVehiculo />}
            {/* Atenuado y sin poder tocarse hasta que haya vehículo */}
            <div className={vehiculo ? "" : "opacity-50 pointer-events-none select-none"} aria-disabled={!vehiculo}>
              <Checklist
                value={form.checklist}
                onChange={(v) => set("checklist", v)}
                resaltarFaltantes={resaltarFaltantes}
                disabled={!vehiculo}
              />
            </div>
          </Section>
        </div>

        {/* ═════ OBSERVACIONES ═════ */}
        <Section title="OBSERVACIONES">
          {!vehiculo && <PrimeroElVehiculo />}
          <TextArea
            value={form.observaciones_ingreso}
            onChange={(v) => set("observaciones_ingreso", v)}
            placeholder="Ej. No trae faros delanteros"
            rows={4}
            disabled={!vehiculo}
          />
        </Section>

        {/* Barra de acciones */}
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-20 bg-white/95 backdrop-blur border-t border-slate-200">
          <div className="px-4 sm:px-6 py-3 flex items-center justify-end gap-3">
            {error ? (
              <p className="text-sm text-red-600 mr-auto">{error}</p>
            ) : (
              <p className="hidden sm:block text-sm text-slate-500 mr-auto">
                {!vehiculo
                  ? "Primero selecciona el vehículo que ingresa al taller"
                  : sinMarcar.length
                  ? `Faltan ${sinMarcar.length} conceptos por marcar`
                  : "Accesorios y herramientas completos"}
              </p>
            )}
            <Boton variante="fantasma" onClick={() => navigate(-1)}>
              Cancelar
            </Boton>
            <Boton type="submit" disabled={saving || !vehiculo}>
              {saving ? "Registrando..." : "Registrar ingreso"}
            </Boton>
          </div>
        </div>
      </form>
    </DashboardLayout>
  );
}

// Aviso mientras no se ha elegido el vehículo: el formato se llena sobre una unidad concreta
function PrimeroElVehiculo() {
  return (
    <p className="mb-4 flex items-center gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
      <CarFront size={16} className="shrink-0" />
      Primero selecciona arriba el vehículo que ingresa al taller.
    </p>
  );
}
