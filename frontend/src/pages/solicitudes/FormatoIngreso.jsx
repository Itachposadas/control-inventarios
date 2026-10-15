// src/pages/solicitudes/FormatoIngreso.jsx
// FORMATO DE INGRESO A TALLER (Municipio de Atlacomulco). Paso 2 del servicio,
// después del diagnóstico. Solo lo llena el mecánico asignado.
//  1. Encabezado: fecha de ingreso (automática) y "Hoja no. __ de __"
//  2. Datos del vehículo/maquinaria: tomados del catálogo (solo lectura)
//  3. Accesorios y herramientas: SI / NO por concepto
//  4. Observaciones
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import DatosVehiculo from "../../components/solicitudes/DatosVehiculo";
import Checklist from "../../components/solicitudes/Checklist";
import { Section, Field, TextArea, inputClass, Boton } from "../../components/ui";
import { solicitudesApi } from "../../api/solicitudes";
import { descargarIngresoPdf } from "../../utils/ingresoPdf";
import { useAuth } from "../../context/AuthContext";
import { MECANICO_MENU, MECANICO_SECONDARY_MENU } from "../../config/menus";
import { CHECKLIST_ITEMS, conceptosSinMarcar } from "../../config/solicitudes";
import { ArrowLeft, CarFront, Loader2, Inbox, CalendarCheck, FileDown } from "lucide-react";

export default function FormatoIngreso() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  // Fecha de hoy (solo se muestra: el sistema registra el ingreso al guardar)
  const fechaHoy = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
  const accesoriosRef = useRef(null);

  const [servicio, setServicio] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");

  const [form, setForm] = useState({ hoja_no: 1, hoja_total: 1, checklist: {}, observaciones_ingreso: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [resaltarFaltantes, setResaltarFaltantes] = useState(false);

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  useEffect(() => {
    solicitudesApi
      .obtener(id)
      .then((s) => {
        if (s.mecanico?.id !== user?.id) setErrorCarga("Este servicio no está asignado a ti.");
        else if (s.estado !== "ingreso") {
          setErrorCarga(
            s.estado === "diagnostico"
              ? "Primero haz el diagnóstico del servicio."
              : "El formato de ingreso de este servicio ya se registró."
          );
        }
        setServicio(s);
      })
      .catch(() => setErrorCarga("No se encontró el servicio."))
      .finally(() => setCargando(false));
  }, [id, user?.id]);

  const sinMarcar = conceptosSinMarcar(form.checklist);
  const marcados = CHECKLIST_ITEMS.length - sinMarcar.length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const hojaNo = Number(form.hoja_no);
    const hojaTotal = Number(form.hoja_total);
    if (!hojaNo || !hojaTotal || hojaNo > hojaTotal) return setError("Revisa la hoja (ej. hoja 1 de 1)");

    if (sinMarcar.length) {
      setResaltarFaltantes(true);
      accesoriosRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return setError(
        `Falta en accesorios y herramientas: ${sinMarcar.length} ${sinMarcar.length === 1 ? "concepto" : "conceptos"} sin marcar`
      );
    }

    setSaving(true);
    try {
      await solicitudesApi.ingreso(servicio.id, {
        hoja_no: hojaNo,
        hoja_total: hojaTotal,
        checklist: form.checklist,
        observaciones_ingreso: form.observaciones_ingreso,
      });
      // Vuelve al servicio: sigue la orden de compra o la reparación
      navigate(`/mecanico/reparaciones/${servicio.id}`, { replace: true });
    } catch (err) {
      setError(err.message || "Error al registrar el ingreso");
      setSaving(false);
    }
  };

  const vehiculo = servicio?.vehiculo;
  // Con la hoja y todos los accesorios marcados ya se puede descargar (antes de registrar)
  const hojaValida = Number(form.hoja_no) >= 1 && Number(form.hoja_total) >= 1 && Number(form.hoja_no) <= Number(form.hoja_total);
  const completo = hojaValida && !sinMarcar.length;
  const descargar = () =>
    descargarIngresoPdf({
      ...servicio,
      hoja_no: form.hoja_no,
      hoja_total: form.hoja_total,
      checklist: form.checklist,
      observaciones_ingreso: form.observaciones_ingreso,
    });

  return (
    <DashboardLayout
      menu={MECANICO_MENU}
      secondaryMenu={MECANICO_SECONDARY_MENU}
      title="Formato de ingreso a taller"
      subtitle="Registra cómo llega el vehículo o maquinaria"
    >
      <button
        onClick={() => navigate(`/mecanico/reparaciones/${id}`)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-institucional transition"
      >
        <ArrowLeft size={16} />
        Volver al servicio
      </button>

      {cargando ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 size={28} className="animate-spin" />
        </div>
      ) : errorCarga ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Inbox size={44} className="mx-auto text-slate-300" />
          <p className="mt-4 text-sm font-medium text-slate-700">{errorCarga}</p>
          {servicio && (
            <Boton className="mt-5" onClick={() => navigate(`/mecanico/reparaciones/${servicio.id}`, { replace: true })}>
              Ir al servicio
            </Boton>
          )}
        </div>
      ) : (
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
                <p className="text-sm font-medium text-institucional">
                  Municipio de Atlacomulco · <span className="font-mono">{servicio.folio}</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:w-[26rem] shrink-0">
              {/* La fecha de ingreso la pone el sistema al registrar (no se edita) */}
              <Field label="Fecha de ingreso">
                <div className={`${inputClass} bg-slate-50 text-slate-700 flex items-center gap-2 cursor-default`}>
                  <CalendarCheck size={16} className="text-institucional shrink-0" />
                  <span className="truncate">{fechaHoy}</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">Se registra automáticamente al guardar.</p>
              </Field>
              <Field label="Hoja no.">
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="1" max="99" inputMode="numeric"
                    value={form.hoja_no}
                    onChange={(e) => set("hoja_no", e.target.value)}
                    aria-label="Hoja número"
                    className={`${inputClass} text-center`}
                  />
                  <span className="text-sm text-slate-500 shrink-0">de</span>
                  <input
                    type="number" min="1" max="99" inputMode="numeric"
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
        <Section title="DATOS DEL VEHÍCULO/MAQUINARIA" subtitle="Tomados del catálogo (solo lectura)">
          <div className="space-y-5">
            <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="w-11 h-11 rounded-xl bg-institucional/10 text-institucional flex items-center justify-center shrink-0">
                <CarFront size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800 truncate">
                  {vehiculo?.numeroEconomico || vehiculo?.unidad || vehiculo?.noInventario}
                </p>
                <p className="text-xs text-slate-500 truncate">{servicio.ingreso?.unidad}</p>
              </div>
            </div>
            <DatosVehiculo datos={servicio.ingreso} />
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
                  ${sinMarcar.length ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-700"}`}
              >
                {marcados} de {CHECKLIST_ITEMS.length}
              </span>
            }
          >
            <Checklist
              value={form.checklist}
              onChange={(v) => set("checklist", v)}
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
            <Boton variante="fantasma" onClick={() => navigate(`/mecanico/reparaciones/${id}`)}>
              Cancelar
            </Boton>
            <Boton
              variante="contorno"
              icono={<FileDown size={16} />}
              onClick={descargar}
              disabled={!completo}
              title={completo ? "Descarga el formato en PDF" : "Marca todos los accesorios y revisa la hoja"}
              aria-label="Descargar formato"
            >
              <span className="hidden sm:inline">Descargar formato</span>
            </Boton>
            <Boton type="submit" disabled={saving}>
              {saving ? "Registrando..." : "Registrar ingreso"}
            </Boton>
          </div>
        </div>
      </form>
      )}
    </DashboardLayout>
  );
}
