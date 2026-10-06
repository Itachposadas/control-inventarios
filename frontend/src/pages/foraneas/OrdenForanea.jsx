// src/pages/foraneas/OrdenForanea.jsx
// ORDEN DE REPARACIÓN EN TALLER FORÁNEO (Municipio de Atlacomulco).
//  - Nueva:  /mecanico/foraneo/nueva?servicio=ID  (se genera desde un ingreso a taller)
//  - Ver:    /mecanico/foraneo/:id  y  /admin/foraneo/:id
// Los datos del vehículo se toman del ingreso a taller (no se capturan dos veces).
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import DatosVehiculo from "../../components/solicitudes/DatosVehiculo";
import ConfirmModal from "../../components/ConfirmModal";
import { Section, TextArea, inputClass, Boton } from "../../components/ui";
import { foraneasApi } from "../../api/foraneas";
import { solicitudesApi } from "../../api/solicitudes";
import { useAuth } from "../../context/AuthContext";
import { menusForRole } from "../../config/menus";
import { ROLES } from "../../config/roles";
import {
  CAMPOS_FORANEA, TALLERES_FORANEOS, FORANEO_BASE, SOLICITUDES_BASE,
} from "../../config/solicitudes";
import { ArrowLeft, Loader2, Trash2, ExternalLink } from "lucide-react";

const EN_TALLER = ["recibida", "diagnostico", "reparacion"];

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const VACIO = { fecha_remision: hoyISO(), diagnostico_inicial: "", talleres: { muelles: "", llantas: "", transmision: "" } };

function formDesdeOrden(o) {
  return {
    fecha_remision: o.fecha_remision,
    diagnostico_inicial: o.diagnostico_inicial || "",
    talleres: {
      muelles: o.talleres.muelles || "",
      llantas: o.talleres.llantas || "",
      transmision: o.talleres.transmision || "",
    },
  };
}

export default function OrdenForanea() {
  const { id } = useParams(); // "nueva" o el id de la orden
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { menu, secondaryMenu } = menusForRole(role);
  const base = FORANEO_BASE[role];
  const esNueva = id === "nueva";
  const servicioId = searchParams.get("servicio");

  const [orden, setOrden] = useState(null);        // orden guardada (ver/editar)
  const [servicio, setServicio] = useState(null);  // ingreso a taller del que sale
  const [form, setForm] = useState(VACIO);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [saving, setSaving] = useState(false);
  const [borrar, setBorrar] = useState({ open: false, loading: false });

  useEffect(() => {
    let cancel = false; // ignora respuestas que lleguen después de cambiar de orden
    setLoadError("");
    const carga = esNueva
      ? solicitudesApi.obtener(servicioId).then((s) => {
          if (cancel) return;
          setServicio(s);
          // El diagnóstico de fallas ya capturado se usa como punto de partida
          setForm({ ...VACIO, diagnostico_inicial: s.fallas || "" });
        })
      : foraneasApi.obtener(id).then((o) => {
          if (cancel) return;
          setOrden(o);
          setForm(formDesdeOrden(o));
        });
    carga.catch((e) => !cancel && setLoadError(e.message || "No se pudo cargar"));
    return () => { cancel = true; };
  }, [id, esNueva, servicioId]);

  // Al pasar de "nueva" a la orden recién creada, React reutiliza esta misma
  // pantalla: hasta tener los datos de ESTA orden se muestra "cargando"
  // (antes se intentaba dibujar sin datos y la página quedaba en blanco).
  const listo = esNueva ? Boolean(servicio) : Boolean(orden && String(orden.id) === String(id));

  // ─── Datos según el modo ───
  const datosVehiculo = esNueva ? servicio?.ingreso : orden?.vehiculo;
  const sol = esNueva
    ? servicio && { id: servicio.id, folio: servicio.folio, estado: servicio.estado, mecanico_id: servicio.mecanico?.id }
    : orden?.solicitud;
  const puedeEditar = Boolean(
    role === ROLES.MECANICO && sol && sol.mecanico_id === user?.id && EN_TALLER.includes(sol.estado)
  );
  const dirty = !esNueva && orden && JSON.stringify(form) !== JSON.stringify(formDesdeOrden(orden));

  const set = (campo, valor) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setAviso("");
  };
  const setTaller = (key, valor) => set("talleres", { ...form.talleres, [key]: valor });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.diagnostico_inicial.trim()) return setError("Escribe el diagnóstico inicial");
    if (!Object.values(form.talleres).some((t) => t.trim())) {
      return setError("Escribe al menos un taller: muelles, llantas o transmisión");
    }
    setSaving(true);
    try {
      if (esNueva) {
        const creada = await foraneasApi.crear(servicio.id, form);
        // Se muestra de inmediato la orden creada mientras cambia la dirección
        setOrden(creada);
        setForm(formDesdeOrden(creada));
        navigate(`${base}/${creada.id}`, { replace: true });
      } else {
        const actualizada = await foraneasApi.editar(orden.id, form);
        setOrden(actualizada);
        setForm(formDesdeOrden(actualizada));
        setAviso("Cambios guardados");
      }
    } catch (err) {
      setError(err.message || "No se pudo guardar la orden");
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async () => {
    setBorrar({ open: true, loading: true });
    try {
      await foraneasApi.eliminar(orden.id);
      navigate(base, { replace: true });
    } catch (err) {
      setError(err.message || "No se pudo eliminar");
      setBorrar({ open: false, loading: false });
    }
  };

  const titulo = esNueva ? "Nueva orden de taller foráneo" : `Orden ${orden?.folio || ""}`;

  if (loadError || !listo) {
    return (
      <DashboardLayout menu={menu} secondaryMenu={secondaryMenu} title={titulo}>
        {!loadError ? (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <Loader2 size={28} className="animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <p className="text-sm font-medium text-slate-700">{loadError}</p>
            <button onClick={() => navigate(base)} className="mt-4 text-sm font-medium text-institucional hover:underline">
              Ir a Taller foráneo
            </button>
          </div>
        )}
      </DashboardLayout>
    );
  }

  // Una orden nueva solo se genera de un ingreso que siga en el taller y sea del mecánico
  if (esNueva && !puedeEditar) {
    return (
      <DashboardLayout menu={menu} secondaryMenu={secondaryMenu} title={titulo}>
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-sm text-slate-600">
          Solo el mecánico asignado puede generar la orden, mientras la unidad siga en el taller.
          <div className="mt-4">
            <button onClick={() => navigate(-1)} className="font-medium text-institucional hover:underline">Volver</button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const soloLectura = !puedeEditar;

  return (
    <DashboardLayout
      menu={menu}
      secondaryMenu={secondaryMenu}
      title={titulo}
      subtitle="Reparación en taller externo"
    >
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-institucional transition"
      >
        <ArrowLeft size={16} />
        Volver
      </button>

      <form onSubmit={handleSubmit} className={`space-y-5 ${puedeEditar ? "pb-24" : ""}`}>
        {/* ═════ ENCABEZADO ═════ */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
          <div className="h-1.5 bg-institucional" />
          <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center gap-5">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <img src="/logo-atlacomulco.png" alt="Municipio de Atlacomulco" className="h-14 w-auto object-contain shrink-0" />
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight leading-tight">
                  ORDEN DE REPARACIÓN EN TALLER FORÁNEO
                </h2>
                <p className="text-sm font-medium text-institucional">Municipio de Atlacomulco</p>
                <p className="mt-1 text-xs text-slate-500">
                  {orden?.folio && <span className="font-mono font-semibold text-slate-700 mr-2">{orden.folio}</span>}
                  Ingreso a taller{" "}
                  <Link
                    to={`${SOLICITUDES_BASE[role]}/${sol.id}`}
                    className="font-mono text-institucional hover:underline inline-flex items-center gap-0.5"
                  >
                    {sol.folio}
                    <ExternalLink size={11} />
                  </Link>
                </p>
              </div>
            </div>
            <div className="lg:w-56 shrink-0">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Fecha de remisión {puedeEditar && <span className="text-red-600">*</span>}
              </label>
              <input
                type="date"
                value={form.fecha_remision}
                max={hoyISO()}
                onChange={(e) => set("fecha_remision", e.target.value)}
                disabled={soloLectura}
                required
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* ═════ DATOS DEL VEHÍCULO/MAQUINARIA ═════ */}
        <Section title="DATOS DEL VEHÍCULO/MAQUINARIA" subtitle="Tomados del ingreso a taller (solo lectura)">
          <DatosVehiculo datos={datosVehiculo || {}} campos={CAMPOS_FORANEA} nota={false} />
        </Section>

        {/* ═════ DIAGNÓSTICO INICIAL ═════ */}
        <Section
          title="DIAGNÓSTICO INICIAL"
          subtitle="Describe la falla y el motivo por el que no se pudo reparar en el taller del área"
        >
          <TextArea
            value={form.diagnostico_inicial}
            onChange={(v) => set("diagnostico_inicial", v)}
            disabled={soloLectura}
            placeholder="Ej. Muelle trasero izquierdo fracturado. En el taller no se cuenta con prensa hidráulica para el cambio de hojas de muelle..."
            rows={8}
          />
        </Section>

        {/* ═════ TALLER AL QUE SE REMITE ═════ */}
        <Section title="TALLER AL QUE SE REMITE" subtitle="Llena solo la columna que corresponda según el tipo de reparación">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {TALLERES_FORANEOS.map((t) => {
              const lleno = Boolean(form.talleres[t.key]?.trim());
              return (
                <div
                  key={t.key}
                  className={`rounded-xl border overflow-hidden transition-colors
                    ${lleno ? "border-institucional/40" : "border-slate-200"}`}
                >
                  <div
                    className={`px-4 py-2.5 text-sm font-semibold text-center transition-colors
                      ${lleno ? "bg-institucional text-white" : "bg-slate-50 text-slate-700"}`}
                  >
                    {t.label}
                  </div>
                  <div className="p-3">
                    {soloLectura ? (
                      <p className="min-h-[2.5rem] flex items-center justify-center text-sm text-slate-800 text-center">
                        {form.talleres[t.key] || <span className="text-slate-500">—</span>}
                      </p>
                    ) : (
                      <input
                        value={form.talleres[t.key]}
                        onChange={(e) => setTaller(t.key, e.target.value)}
                        placeholder="Nombre del taller"
                        aria-label={`Taller de ${t.label.toLowerCase()}`}
                        maxLength={150}
                        className={inputClass}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {orden?.creado_por && (
          <p className="text-xs text-slate-500">Generada por {orden.creado_por}</p>
        )}

        {/* Barra de acciones (solo el mecánico asignado, con la unidad en el taller) */}
        {puedeEditar && (
          <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-20 bg-white/95 backdrop-blur border-t border-slate-200">
            <div className="px-4 sm:px-6 py-3 flex items-center justify-end gap-3">
              {error ? (
                <p className="text-sm text-red-600 mr-auto">{error}</p>
              ) : aviso ? (
                <p className="text-sm text-emerald-700 mr-auto">{aviso}</p>
              ) : null}
              {!esNueva && (
                <button
                  type="button"
                  onClick={() => setBorrar({ open: true, loading: false })}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg
                             text-red-600 hover:bg-red-50 transition"
                >
                  <Trash2 size={15} />
                  Eliminar
                </button>
              )}
              <Boton type="submit" disabled={saving || (!esNueva && !dirty)}>
                {saving ? "Guardando..." : esNueva ? "Generar orden" : "Guardar cambios"}
              </Boton>
            </div>
          </div>
        )}
      </form>

      <ConfirmModal
        open={borrar.open}
        onClose={() => setBorrar({ open: false, loading: false })}
        onConfirm={handleEliminar}
        loading={borrar.loading}
        title="¿Eliminar orden?"
      >
        Vas a eliminar la orden <strong className="text-slate-700">{orden?.folio}</strong>. Esta acción no se puede deshacer.
      </ConfirmModal>
    </DashboardLayout>
  );
}
