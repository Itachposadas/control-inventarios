// src/pages/solicitudes/SolicitudNueva.jsx
// Formato de ingreso a taller: vehículo, datos con que llegó,
// accesorios (palomitas) y observaciones. Solo lo llena el mecánico.
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import IngresoFields from "../../components/solicitudes/IngresoFields";
import Checklist from "../../components/solicitudes/Checklist";
import { Section, Field, TextArea, inputClass } from "../../components/solicitudes/ui";
import { solicitudesApi } from "../../api/solicitudes";
import { vehiculosApi } from "../../api/vehiculos";
import { MECANICO_MENU, MECANICO_SECONDARY_MENU } from "../../config/menus";
import { TIPOS, PRIORIDADES } from "../../config/solicitudes";

const BASE = "/mecanico/reparaciones";
import { ArrowLeft, Search, CarFront, Loader2 } from "lucide-react";

function ingresoDesdeVehiculo(v) {
  return {
    unidad: v.unidad || v.descripcion || "",
    marca: v.marca || "",
    modelo: v.modelo || "",
    placas: v.placas || "",
    color: "",
    area: v.area || "",
    serie: v.serie || "",
    no_inventario: v.noInventario || "",
  };
}

export default function SolicitudNueva() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Selección de vehículo
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [vehiculo, setVehiculo] = useState(null);

  // Formulario
  const [form, setForm] = useState({
    tipo: "correctivo",
    prioridad: "media",
    ingreso: {},
    checklist: {},
    observaciones_ingreso: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const elegirVehiculo = (v) => {
    setVehiculo(v);
    set("ingreso", ingresoDesdeVehiculo(v));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!vehiculo) return setError("Selecciona el vehículo que ingresa al taller");

    setSaving(true);
    try {
      const creada = await solicitudesApi.crear({ ...form, vehiculo_id: vehiculo.id });
      navigate(`${BASE}/${creada.id}`, { replace: true });
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
        {/* 1. Vehículo */}
        <Section title="1. Vehículo / maquinaria" subtitle="Búscalo en el catálogo; sus datos se llenan solos">
          {vehiculo ? (
            <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="w-11 h-11 rounded-xl bg-[#9F2241]/10 text-[#9F2241] flex items-center justify-center shrink-0">
                <CarFront size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800 truncate">
                  {vehiculo.numeroEconomico || vehiculo.unidad || vehiculo.noInventario}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {[vehiculo.noInventario, vehiculo.placas, vehiculo.area].filter(Boolean).join(" · ")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVehiculo(null)}
                className="text-sm font-medium text-[#9F2241] hover:underline shrink-0"
              >
                Cambiar
              </button>
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
                <ul className="mt-2 border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
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

        {vehiculo && (
          <>
            {/* 2. Datos del vehículo */}
            <Section title="2. Datos del vehículo" subtitle="Corrige lo que no coincida con cómo llegó (ej. placas) y agrega el color">
              <IngresoFields value={form.ingreso} onChange={(v) => set("ingreso", v)} />
            </Section>

            {/* 3. Servicio */}
            <Section title="3. Servicio">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Tipo de servicio">
                  <select value={form.tipo} onChange={(e) => set("tipo", e.target.value)} className={inputClass}>
                    {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
                <Field label="Prioridad">
                  <select value={form.prioridad} onChange={(e) => set("prioridad", e.target.value)} className={inputClass}>
                    {PRIORIDADES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </Field>
              </div>
            </Section>

            {/* 4. Accesorios */}
            <Section
              title="4. Accesorios"
              subtitle="Marca con palomita lo que SÍ trae el vehículo al llegar"
            >
              <Checklist value={form.checklist} onChange={(v) => set("checklist", v)} />
              <div className="mt-5">
                <Field label="Observaciones de ingreso">
                  <TextArea
                    value={form.observaciones_ingreso}
                    onChange={(v) => set("observaciones_ingreso", v)}
                    placeholder="Ej. No tenía defensa delantera, rayón en puerta trasera derecha..."
                    rows={3}
                  />
                </Field>
              </div>
            </Section>
          </>
        )}

        {/* Barra de acciones */}
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-20 bg-white/95 backdrop-blur border-t border-slate-200">
          <div className="px-4 sm:px-6 py-3 flex items-center justify-end gap-3">
            {error && <p className="text-sm text-red-600 mr-auto">{error}</p>}
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-100 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !vehiculo}
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
