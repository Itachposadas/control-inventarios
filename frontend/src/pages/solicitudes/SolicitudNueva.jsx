// src/pages/solicitudes/SolicitudNueva.jsx
// FORMATO DE INGRESO A TALLER (Municipio de Atlacomulco). Solo lo llena el mecánico.
//  1. Encabezado: fecha de ingreso y "Hoja no. __ de __"
//  2. Datos del vehículo/maquinaria: los de la solicitud del área (?peticion=ID),
//     tomados del catálogo (solo lectura)
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
import { peticionesApi } from "../../api/peticiones";
import TablaMateriales from "../../components/peticiones/TablaMateriales";
import { MECANICO_MENU, MECANICO_SECONDARY_MENU } from "../../config/menus";
import { CHECKLIST_ITEMS, conceptosSinMarcar } from "../../config/solicitudes";
import { ArrowLeft, CarFront, Loader2, Inbox } from "lucide-react";

// Fecha local de hoy en formato AAAA-MM-DD (para el <input type="date">)
function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function SolicitudNueva() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const accesoriosRef = useRef(null);

  // Solicitud del área que se atiende con este ingreso (?peticion=ID).
  // El vehículo es el de la solicitud: el mecánico ya no lo busca.
  const [peticion, setPeticion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorPeticion, setErrorPeticion] = useState("");
  const vehiculo = peticion?.vehiculo || null;

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

  useEffect(() => {
    const id = searchParams.get("peticion");
    if (!id) {
      setErrorPeticion("El ingreso a taller se registra desde una solicitud.");
      setCargando(false);
      return;
    }
    peticionesApi
      .obtener(id)
      .then((p) => {
        if (p.estado !== "pendiente") setErrorPeticion(`La solicitud ${p.folio} ya fue atendida.`);
        else setPeticion(p);
      })
      .catch(() => setErrorPeticion("No se encontró la solicitud."))
      .finally(() => setCargando(false));
  }, [searchParams]);

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
    if (!vehiculo) return setError("No hay solicitud que atender");

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
        fecha_ingreso: form.fecha_ingreso,
        hoja_no: hojaNo,
        hoja_total: hojaTotal,
        checklist: form.checklist,
        observaciones_ingreso: form.observaciones_ingreso,
        peticion_id: peticion.id,
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

      {cargando ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 size={28} className="animate-spin" />
        </div>
      ) : errorPeticion ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Inbox size={44} className="mx-auto text-slate-300" />
          <p className="mt-4 text-sm font-medium text-slate-700">{errorPeticion}</p>
          <p className="mt-1 text-xs text-slate-500">Elige en Solicitudes la unidad que llegó y pulsa “Atender”.</p>
          <Boton className="mt-5" onClick={() => navigate("/mecanico/solicitudes-areas", { replace: true })}>
            Ir a Solicitudes
          </Boton>
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="space-y-5 pb-24">
        {peticion && (
          <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <Inbox size={18} className="shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p>
                Atiende la solicitud <span className="font-mono font-semibold">{peticion.folio}</span> del área{" "}
                <span className="font-semibold">{peticion.area}</span>. Materiales solicitados:
              </p>
              <div className="mt-2 bg-white text-slate-700">
                <TablaMateriales materiales={peticion.materiales} total={peticion.total} />
              </div>
            </div>
          </div>
        )}

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
        <Section title="DATOS DEL VEHÍCULO/MAQUINARIA" subtitle="Los de la solicitud del área, tomados del catálogo (solo lectura)">
          <div className="space-y-5">
            <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="w-11 h-11 rounded-xl bg-institucional/10 text-institucional flex items-center justify-center shrink-0">
                <CarFront size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800 truncate">{vehiculo.nombre}</p>
                <p className="text-xs text-slate-500 truncate">{vehiculo.unidad || vehiculo.descripcion}</p>
              </div>
            </div>
            <DatosVehiculo datos={datosDesdeVehiculo(vehiculo)} />
          </div>
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
                {sinMarcar.length
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
      )}
    </DashboardLayout>
  );
}
