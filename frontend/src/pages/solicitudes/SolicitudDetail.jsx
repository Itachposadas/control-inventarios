// src/pages/solicitudes/SolicitudDetail.jsx
// Detalle de una solicitud: formato de ingreso, diagnóstico, trabajo realizado,
// refacciones, costo (admin) y avance de estado.
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import ConfirmModal from "../../components/ConfirmModal";
import DatosVehiculo from "../../components/solicitudes/DatosVehiculo";
import Checklist from "../../components/solicitudes/Checklist";
import RefaccionesEditor from "../../components/solicitudes/RefaccionesEditor";
import FotosEvidencia from "../../components/solicitudes/FotosEvidencia";
import { EstadoBadge, PrioridadBadge } from "../../components/solicitudes/Badges";
import { Section, Field, TextArea, inputClass } from "../../components/solicitudes/ui";
import { solicitudesApi } from "../../api/solicitudes";
import { usuariosApi } from "../../api/usuarios";
import { useAuth } from "../../context/AuthContext";
import { menusForRole } from "../../config/menus";
import { ROLES } from "../../config/roles";
import {
  ESTADOS, TIPOS, PRIORIDADES, TIPO_LABEL, SOLICITUDES_BASE,
  formatFecha, formatMoneda,
} from "../../config/solicitudes";
import {
  ArrowLeft, ArrowRight, Undo2, Check, Loader2, CarFront, Trash2, Save, Camera,
} from "lucide-react";

function formDesdeSolicitud(s) {
  return {
    tipo: s.tipo,
    prioridad: s.prioridad,
    checklist: { ...s.checklist },
    total_birlos: s.total_birlos ?? "",
    observaciones_ingreso: s.observaciones_ingreso || "",
    fallas: s.fallas || "",
    acciones: s.acciones || "",
    observaciones: s.observaciones || "",
    refacciones: s.refacciones.map(({ tipo, descripcion, cantidad }) => ({ tipo, descripcion, cantidad })),
    costo: s.costo ?? "",
    mecanico_id: s.mecanico?.id ?? "",
  };
}

// Qué necesita cada paso para poder avanzar (se muestra como ayuda)
const AYUDA_PASO = {
  recibida: "Sube la foto de llegada en Evidencia fotográfica, revisa el vehículo y pasa a Diagnóstico.",
  diagnostico: "Captura el diagnóstico de fallas presentadas para pasar a Reparación.",
  reparacion: "Captura las acciones realizadas y sube las fotos de reparación y final (en Evidencia fotográfica) para marcarla como Completada.",
  completada: "El administrador captura el costo y la marca como Entregada.",
  entregada: "Servicio entregado.",
};

export default function SolicitudDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { menu, secondaryMenu } = menusForRole(role);
  const basePath = SOLICITUDES_BASE[role];
  const esAdmin = role === ROLES.ADMIN;

  const [s, setS] = useState(null);
  const [form, setForm] = useState(null);
  const [mecanicos, setMecanicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [saving, setSaving] = useState(false);
  const [nota, setNota] = useState("");
  const [deleteModal, setDeleteModal] = useState({ open: false, loading: false });

  const cargar = (data) => {
    setS(data);
    setForm(formDesdeSolicitud(data));
  };

  useEffect(() => {
    setLoading(true);
    solicitudesApi
      .obtener(id)
      .then(cargar)
      .catch((e) => setLoadError(e.message || "No se pudo cargar la solicitud"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (esAdmin) {
      usuariosApi.listar({ role: "mecanico", activo: "true" }).then(setMecanicos).catch(() => {});
    }
  }, [esAdmin]);

  const dirty = useMemo(
    () => s && form && JSON.stringify(form) !== JSON.stringify(formDesdeSolicitud(s)),
    [s, form]
  );

  if (loading || loadError || !s || !form) {
    return (
      <DashboardLayout menu={menu} secondaryMenu={secondaryMenu} title="Solicitud">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 size={28} className="animate-spin" />
            <span className="ml-3 text-sm">Cargando solicitud...</span>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <p className="text-sm font-medium text-slate-700">{loadError || "Solicitud no encontrada"}</p>
            <button onClick={() => navigate(basePath)} className="mt-4 text-sm font-medium text-[#9F2241] hover:underline">
              Volver a la lista
            </button>
          </div>
        )}
      </DashboardLayout>
    );
  }

  // ─── Permisos ───
  // Mecánico: llena el formato y el trabajo (solo las suyas, hasta completarlas).
  // Admin: no llena nada del formato; solo captura costo, reasigna y entrega.
  const esSuya = s.mecanico?.id === user?.id;
  const cerrada = ["completada", "entregada"].includes(s.estado);
  const puedeLlenar = role === ROLES.MECANICO && esSuya && !cerrada;
  const puedeEditar = puedeLlenar || esAdmin;

  const idx = ESTADOS.findIndex((e) => e.value === s.estado);
  const siguiente = ESTADOS[idx + 1];
  const anterior = ESTADOS[idx - 1];
  const puedeAvanzar = esAdmin
    ? siguiente?.value === "entregada"
    : puedeLlenar && siguiente && siguiente.value !== "entregada";
  const puedeRegresar = esAdmin && anterior;

  // Regresa a la pantalla anterior (lista o historial del vehículo)
  const volver = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate(esAdmin ? `/admin/vehiculos/${s.vehiculo?.id}` : basePath);
  };

  const set = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const guardar = async () => {
    const payload = esAdmin
      ? { costo: form.costo, mecanico_id: form.mecanico_id }
      : (({ costo, mecanico_id, ...resto }) => resto)(form);
    const actualizada = await solicitudesApi.editar(s.id, payload);
    cargar(actualizada);
    return actualizada;
  };

  const handleGuardar = async () => {
    setError("");
    setAviso("");
    setSaving(true);
    try {
      await guardar();
      setAviso("Cambios guardados");
    } catch (e) {
      setError(e.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleEstado = async (estado) => {
    setError("");
    setAviso("");
    setSaving(true);
    try {
      if (dirty && puedeEditar) await guardar(); // primero guarda lo capturado
      const actualizada = await solicitudesApi.cambiarEstado(s.id, estado, nota);
      cargar(actualizada);
      setNota("");
    } catch (e) {
      setError(e.message || "Error al cambiar el estado");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteModal({ open: true, loading: true });
    try {
      await solicitudesApi.eliminar(s.id);
      navigate(`/admin/vehiculos/${s.vehiculo?.id}`, { replace: true });
    } catch (e) {
      setError(e.message || "Error al eliminar");
      setDeleteModal({ open: false, loading: false });
    }
  };

  const bloqueado = !puedeLlenar;

  return (
    <DashboardLayout
      menu={menu}
      secondaryMenu={secondaryMenu}
      title={`Solicitud ${s.folio}`}
      subtitle={`${TIPO_LABEL[s.tipo]} · Ingresó ${formatFecha(s.fecha_ingreso)}${
        s.hoja_no ? ` · Hoja ${s.hoja_no} de ${s.hoja_total}` : ""
      }`}
    >
      <button
        onClick={volver}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium
                   text-slate-600 hover:text-[#9F2241] transition"
      >
        <ArrowLeft size={16} />
        Volver
      </button>

      {/* Encabezado */}
      <div className="bg-white rounded-2xl border border-slate-200
                      shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-5 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#9F2241]/10 flex items-center justify-center text-[#9F2241] shrink-0">
            <CarFront size={28} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-800">
                {s.vehiculo?.numeroEconomico || s.vehiculo?.unidad || s.vehiculo?.noInventario}
              </h2>
              <EstadoBadge estado={s.estado} />
              <PrioridadBadge prioridad={s.prioridad} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              <span className="font-mono">{s.folio}</span>
              {" · "}Mecánico: <span className="font-medium text-slate-700">
                {s.mecanico?.nombre_completo || s.mecanico?.username || "Sin asignar"}
              </span>
            </p>
          </div>
          {esAdmin && (
            <button
              onClick={() => setDeleteModal({ open: true, loading: false })}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200
                         text-sm font-medium text-red-600 hover:bg-red-50 transition self-start sm:self-center"
            >
              <Trash2 size={15} />
              Eliminar
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 pb-24">
        {/* ═════ Columna principal ═════ */}
        <div className="xl:col-span-2 space-y-5">
          <Section title="Datos del vehículo/maquinaria" subtitle="Registrados al ingresar al taller">
            <DatosVehiculo datos={s.ingreso} nota={puedeLlenar} />
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Tipo de servicio">
                <select value={form.tipo} onChange={(e) => set("tipo")(e.target.value)} disabled={bloqueado} className={inputClass}>
                  {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
              <Field label="Prioridad">
                <select value={form.prioridad} onChange={(e) => set("prioridad")(e.target.value)} disabled={bloqueado} className={inputClass}>
                  {PRIORIDADES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </Field>
            </div>
          </Section>

          <FotosEvidencia
            solicitud={s}
            puedeSubir={false}
            accion={puedeLlenar && (
              <button
                onClick={() => navigate(`/mecanico/evidencia?servicio=${s.id}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                           bg-[#9F2241] hover:bg-[#7d1a33] text-white transition shrink-0"
              >
                <Camera size={14} />
                Subir fotos
              </button>
            )}
          />

          <Section title="Accesorios y herramientas" subtitle="SI / NO según llegó el vehículo">
            <Checklist
              value={form.checklist}
              onChange={set("checklist")}
              birlos={form.total_birlos}
              onBirlosChange={set("total_birlos")}
              disabled={bloqueado}
            />
            <div className="mt-5">
              <Field label="Observaciones">
                <TextArea
                  value={form.observaciones_ingreso}
                  onChange={set("observaciones_ingreso")}
                  disabled={bloqueado}
                  placeholder="Ej. No tenía defensa delantera"
                  rows={3}
                />
              </Field>
            </div>
          </Section>

          <Section title="Diagnóstico de fallas presentadas">
            <TextArea
              value={form.fallas}
              onChange={set("fallas")}
              disabled={bloqueado}
              placeholder="Describe las fallas que presenta el vehículo..."
            />
          </Section>

          <Section title="Trabajo realizado">
            <div className="space-y-4">
              <Field label="Acciones realizadas">
                <TextArea
                  value={form.acciones}
                  onChange={set("acciones")}
                  disabled={bloqueado}
                  placeholder="Ej. Se cambió batería, se ajustaron frenos..."
                />
              </Field>
              <Field label="Observaciones">
                <TextArea
                  value={form.observaciones}
                  onChange={set("observaciones")}
                  disabled={bloqueado}
                  placeholder="Detalles de lo que se trabajó, recomendaciones..."
                  rows={3}
                />
              </Field>
            </div>
          </Section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Section title="Refacciones utilizadas">
              <RefaccionesEditor
                items={form.refacciones}
                tipo="utilizada"
                onChange={set("refacciones")}
                disabled={bloqueado}
                vacio="Sin refacciones registradas"
              />
            </Section>
            <Section title="Piezas a comprar">
              <RefaccionesEditor
                items={form.refacciones}
                tipo="por_comprar"
                onChange={set("refacciones")}
                disabled={bloqueado}
                vacio="Sin piezas por comprar"
              />
            </Section>
          </div>
        </div>

        {/* ═════ Columna lateral ═════ */}
        <div className="space-y-5">
          {/* Avance */}
          <Section title="Avance">
            <ol className="space-y-2.5">
              {ESTADOS.map((e, i) => {
                const hecho = i < idx;
                const actual = i === idx;
                return (
                  <li key={e.value} className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 transition-colors duration-300
                        ${hecho ? "bg-emerald-600 text-white"
                          : actual ? "bg-[#9F2241] text-white"
                          : "bg-slate-100 text-slate-400"}`}
                    >
                      {hecho ? <Check size={13} strokeWidth={3} /> : i + 1}
                    </span>
                    <span className={`text-sm ${actual ? "font-semibold text-slate-800" : hecho ? "text-slate-600" : "text-slate-400"}`}>
                      {e.label}
                    </span>
                  </li>
                );
              })}
            </ol>

            <p className="mt-4 text-xs text-slate-500">
              {esAdmin && !cerrada
                ? "El mecánico registra el avance. Podrás capturar el costo y entregarlo cuando esté Completada."
                : AYUDA_PASO[s.estado]}
            </p>

            {(puedeAvanzar || puedeRegresar) && (
              <div className="mt-4 space-y-2">
                <input
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder={siguiente?.value === "entregada" ? "Nota (ej. quién recibió)" : "Nota opcional"}
                  className={inputClass}
                />
                {puedeAvanzar && (
                  <button
                    onClick={() => handleEstado(siguiente.value)}
                    disabled={saving}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg
                               bg-[#9F2241] hover:bg-[#7d1a33] text-white text-sm font-semibold
                               disabled:bg-slate-300 transition"
                  >
                    {dirty ? "Guardar y pasar a " : "Pasar a "}{siguiente.label}
                    <ArrowRight size={15} />
                  </button>
                )}
                {puedeRegresar && (
                  <button
                    onClick={() => handleEstado(anterior.value)}
                    disabled={saving}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg
                               text-slate-600 hover:bg-slate-100 text-sm font-medium transition"
                  >
                    <Undo2 size={15} />
                    Regresar a {anterior.label}
                  </button>
                )}
              </div>
            )}
          </Section>

          {/* Administración */}
          <Section title="Administración" subtitle={esAdmin ? "Solo el administrador puede modificar esto" : undefined}>
            <div className="space-y-4">
              <Field label="Mecánico asignado">
                {esAdmin ? (
                  <select
                    value={form.mecanico_id}
                    onChange={(e) => set("mecanico_id")(Number(e.target.value))}
                    className={inputClass}
                  >
                    {/* Si el asignado ya fue desactivado, se sigue mostrando */}
                    {s.mecanico && !mecanicos.some((m) => m.id === s.mecanico.id) && (
                      <option value={s.mecanico.id}>{s.mecanico.nombre_completo || s.mecanico.username}</option>
                    )}
                    {mecanicos.map((m) => (
                      <option key={m.id} value={m.id}>{m.nombre_completo || m.username}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-slate-700">{s.mecanico?.nombre_completo || s.mecanico?.username || "—"}</p>
                )}
              </Field>
              <Field label="Costo">
                {esAdmin ? (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.costo}
                      onChange={(e) => set("costo")(e.target.value)}
                      placeholder="0.00"
                      className={`${inputClass} pl-7`}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-slate-700">{formatMoneda(s.costo)}</p>
                )}
              </Field>
              {s.fecha_entrega && (
                <Field label="Fecha de entrega">
                  <p className="text-sm text-slate-700">{formatFecha(s.fecha_entrega, true)}</p>
                </Field>
              )}
            </div>
          </Section>

          {/* Bitácora */}
          <Section title="Bitácora" subtitle="Movimientos de esta solicitud">
            <ul className="space-y-3">
              {[...s.eventos].reverse().map((e) => (
                <li key={e.id} className="text-sm">
                  <p className="text-slate-800">
                    <span className="font-medium">{e.usuario}</span>{" "}
                    <span className="text-slate-600">{e.accion.charAt(0).toLowerCase() + e.accion.slice(1)}</span>
                  </p>
                  {e.nota && <p className="text-xs text-slate-500 mt-0.5">“{e.nota}”</p>}
                  <p className="text-[11px] text-slate-400 mt-0.5">{formatFecha(e.fecha, true)}</p>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>

      {/* Barra para guardar */}
      {puedeEditar && (dirty || error || aviso) && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-20 bg-white/95 backdrop-blur border-t border-slate-200">
          <div className="px-4 sm:px-6 py-3 flex items-center justify-end gap-3">
            {error && <p className="text-sm text-red-600 mr-auto">{error}</p>}
            {!error && aviso && !dirty && <p className="text-sm text-emerald-700 mr-auto">{aviso}</p>}
            {!error && dirty && <p className="text-sm text-slate-500 mr-auto">Tienes cambios sin guardar</p>}
            {dirty && (
              <>
                <button
                  onClick={() => { setForm(formDesdeSolicitud(s)); setError(""); }}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-100 transition"
                >
                  Descartar
                </button>
                <button
                  onClick={handleGuardar}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-lg
                             bg-[#9F2241] hover:bg-[#7d1a33] text-white disabled:bg-slate-300 transition"
                >
                  <Save size={15} />
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {/* Errores cuando no hay barra de guardado (ej. mecánico con la solicitud cerrada) */}
      {!puedeEditar && error && (
        <div className="fixed bottom-4 right-4 z-20 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      <ConfirmModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, loading: false })}
        onConfirm={handleDelete}
        loading={deleteModal.loading}
        title="¿Eliminar solicitud?"
      >
        Vas a eliminar la solicitud <strong className="text-slate-700">{s.folio}</strong> con todo su
        historial. Esta acción no se puede deshacer.
      </ConfirmModal>
    </DashboardLayout>
  );
}
