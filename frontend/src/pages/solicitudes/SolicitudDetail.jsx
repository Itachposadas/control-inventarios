// src/pages/solicitudes/SolicitudDetail.jsx
// Detalle de una solicitud: formato de ingreso, diagnóstico, trabajo realizado,
// taller foráneo, costo (admin) y avance de estado.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import ConfirmModal from "../../components/ConfirmModal";
import DatosVehiculo from "../../components/solicitudes/DatosVehiculo";
import Checklist from "../../components/solicitudes/Checklist";
import FotosEvidencia from "../../components/solicitudes/FotosEvidencia";
import { EstadoBadge, PrioridadBadge } from "../../components/solicitudes/Badges";
import { Section, Field, TextArea, inputClass, Boton, Alerta } from "../../components/ui";
import { solicitudesApi } from "../../api/solicitudes";
import { usuariosApi } from "../../api/usuarios";
import { useAuth } from "../../context/AuthContext";
import { menusForRole } from "../../config/menus";
import { ROLES } from "../../config/roles";
import {
  ESTADOS, TIPOS, PRIORIDADES, TIPO_LABEL, SOLICITUDES_BASE,
  FORANEO_BASE, TALLERES_FORANEOS, formatFecha, formatMoneda, pasoSiguiente,
} from "../../config/solicitudes";
import { fechaCorta } from "../../config/reportes";
import {
  ArrowLeft, ArrowRight, Undo2, Check, Loader2, CarFront, Trash2, Save, Camera, Truck, Plus,
  PencilLine, CheckCircle2,
} from "lucide-react";

const NOMBRE_FOTO = { llegada: "de llegada", reparacion: "de la reparación", final: "final" };

function formDesdeSolicitud(s) {
  return {
    tipo: s.tipo,
    prioridad: s.prioridad,
    checklist: { ...s.checklist },
    observaciones_ingreso: s.observaciones_ingreso || "",
    fallas: s.fallas || "",
    acciones: s.acciones || "",
    observaciones: s.observaciones || "",
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
  const [confirmarFin, setConfirmarFin] = useState(false);
  // Secciones a las que lleva el botón "Escribir aquí" de "¿Qué sigue?"
  const fallasRef = useRef(null);
  const accionesRef = useRef(null);

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
          <div className="flex items-center justify-center py-20 text-slate-500">
            <Loader2 size={28} className="animate-spin" />
            <span className="ml-3 text-sm">Cargando solicitud...</span>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <p className="text-sm font-medium text-slate-700">{loadError || "Solicitud no encontrada"}</p>
            <button onClick={() => navigate(basePath)} className="mt-4 text-sm font-medium text-institucional hover:underline">
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
  const esMecanico = role === ROLES.MECANICO;
  const nombreVehiculo = s.vehiculo?.numeroEconomico || s.vehiculo?.unidad || s.vehiculo?.noInventario;
  const paso = pasoSiguiente(s, form);

  // Terminar la reparación no se puede deshacer (solo el admin la regresa): se pide confirmación
  const avanzar = () =>
    !esAdmin && siguiente?.value === "completada" ? setConfirmarFin(true) : handleEstado(siguiente.value);
  const etiquetaAvance = !esAdmin && siguiente?.value === "completada"
    ? "Terminar reparación"
    : `${dirty ? "Guardar y pasar a " : "Pasar a "}${siguiente?.label}`;

  const irAEscribir = (campo) => {
    const el = (campo === "fallas" ? fallasRef : accionesRef).current;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => el?.querySelector("textarea")?.focus({ preventScroll: true }), 400);
  };

  return (
    <DashboardLayout
      menu={menu}
      secondaryMenu={secondaryMenu}
      title={esMecanico ? `Reparación: ${nombreVehiculo}` : `Solicitud ${s.folio}`}
      subtitle={`${TIPO_LABEL[s.tipo]} · Ingresó ${formatFecha(s.fecha_ingreso)}${
        s.hoja_no ? ` · Hoja ${s.hoja_no} de ${s.hoja_total}` : ""
      }`}
    >
      <button
        onClick={volver}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium
                   text-slate-600 hover:text-institucional transition"
      >
        <ArrowLeft size={16} />
        Volver
      </button>

      {/* Encabezado */}
      <div className="bg-white rounded-2xl border border-slate-200
                      shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-5 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-institucional/10 flex items-center justify-center text-institucional shrink-0">
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

      {esMecanico && esSuya && (
        <div
          className={`rounded-2xl border-2 p-5 mb-5 flex flex-col sm:flex-row sm:items-center gap-4 ${
            cerrada ? "border-emerald-200 bg-emerald-50" : "border-institucional/30 bg-institucional/[0.04]"
          }`}
        >
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-bold uppercase tracking-wide ${cerrada ? "text-emerald-700" : "text-institucional"}`}>
              {cerrada ? "Listo" : "¿Qué sigue?"}
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-800 leading-snug">{paso.texto}</p>
          </div>
          {puedeLlenar && paso.accion === "foto" && (
            <Boton
              tamano="lg"
              onClick={() => navigate(`/mecanico/evidencia?servicio=${s.id}`)}
              icono={<Camera size={20} />}
              className="shrink-0"
            >
              Tomar foto {NOMBRE_FOTO[paso.foto]}
            </Boton>
          )}
          {puedeLlenar && paso.accion === "escribir" && (
            <Boton
              tamano="lg"
              onClick={() => irAEscribir(paso.campo)}
              icono={<PencilLine size={20} />}
              className="shrink-0"
            >
              Escribir aquí
            </Boton>
          )}
          {puedeLlenar && paso.accion === "avanzar" && puedeAvanzar && (
            <Boton
              tamano="lg"
              onClick={avanzar}
              disabled={saving}
              icono={siguiente.value === "completada" ? <CheckCircle2 size={20} /> : <ArrowRight size={20} />}
              className="shrink-0"
            >
              {saving ? "Guardando..." : etiquetaAvance}
            </Boton>
          )}
        </div>
      )}

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
              <Boton
                tamano="sm"
                onClick={() => navigate(`/mecanico/evidencia?servicio=${s.id}`)}
                icono={<Camera size={14} />}
                className="shrink-0"
              >
                Subir fotos
              </Boton>
            )}
          />

          <Section title="Accesorios y herramientas" subtitle="SI / NO según llegó el vehículo">
            <Checklist
              value={form.checklist}
              onChange={set("checklist")}
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

          <div ref={fallasRef} className="scroll-mt-24">
          <Section title="Diagnóstico de fallas presentadas">
            <TextArea
              value={form.fallas}
              onChange={set("fallas")}
              disabled={bloqueado}
              placeholder="Describe las fallas que presenta el vehículo..."
            />
          </Section>
          </div>

          <Section title="Trabajo realizado">
            <div className="space-y-4">
              <div ref={accionesRef} className="scroll-mt-24">
                <Field label="Acciones realizadas">
                  <TextArea
                    value={form.acciones}
                    onChange={set("acciones")}
                    disabled={bloqueado}
                    placeholder="Ej. Se cambió batería, se ajustaron frenos..."
                  />
                </Field>
              </div>
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

          {/* Órdenes de reparación en taller foráneo generadas desde este ingreso */}
          {(puedeLlenar || s.ordenes_foraneas.length > 0) && (
            <Section
              title="Taller foráneo"
              subtitle="Cuando la unidad no se puede reparar aquí y se manda a un taller externo"
              actions={puedeLlenar && (
                <Boton
                  tamano="sm"
                  onClick={() => navigate(`/mecanico/foraneo/nueva?servicio=${s.id}`)}
                  icono={<Plus size={14} />}
                  className="shrink-0"
                >
                  Generar orden foránea
                </Boton>
              )}
            >
              {s.ordenes_foraneas.length === 0 ? (
                <p className="text-sm text-slate-500">Este servicio no se ha remitido a ningún taller externo.</p>
              ) : (
                <ul className="divide-y divide-slate-100 -my-2">
                  {s.ordenes_foraneas.map((o) => (
                    <li key={o.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`${FORANEO_BASE[role]}/${o.id}`)}
                        className="w-full flex items-center gap-3 py-3 text-left hover:bg-slate-50 rounded-lg px-2 -mx-2 transition"
                      >
                        <span className="w-9 h-9 rounded-lg bg-institucional/10 text-institucional flex items-center justify-center shrink-0">
                          <Truck size={17} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-slate-800">
                            <span className="font-mono">{o.folio}</span>
                            <span className="ml-2 text-xs font-normal text-slate-500">{fechaCorta(o.fecha_remision)}</span>
                          </span>
                          <span className="block text-xs text-slate-500 truncate">
                            {TALLERES_FORANEOS.filter((t) => o.talleres[t.key])
                              .map((t) => `${t.label}: ${o.talleres[t.key]}`)
                              .join(" · ")}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}
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
                        ${hecho ? "bg-emerald-700 text-white"
                          : actual ? "bg-institucional text-white"
                          : "bg-slate-100 text-slate-500"}`}
                    >
                      {hecho ? <Check size={13} strokeWidth={3} /> : i + 1}
                    </span>
                    <span className={`text-sm ${actual ? "font-semibold text-slate-800" : hecho ? "text-slate-600" : "text-slate-500"}`}>
                      {e.label}
                    </span>
                  </li>
                );
              })}
            </ol>

            <p className="mt-4 text-xs text-slate-500">
              {esAdmin && !cerrada
                ? "El mecánico registra el avance. Podrás capturar el costo y entregarlo cuando esté Completada."
                : esMecanico
                ? paso.texto
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
                  <Boton onClick={avanzar} disabled={saving} className="w-full">
                    {etiquetaAvance}
                    <ArrowRight size={15} />
                  </Boton>
                )}
                {puedeRegresar && (
                  <Boton
                    variante="fantasma"
                    onClick={() => handleEstado(anterior.value)}
                    disabled={saving}
                    icono={<Undo2 size={15} />}
                    className="w-full"
                  >
                    Regresar a {anterior.label}
                  </Boton>
                )}
              </div>
            )}
          </Section>

          {/* Administración (el mecánico no la necesita) */}
          {esAdmin && (
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
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">$</span>
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
          )}

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
                  <p className="text-[11px] text-slate-500 mt-0.5">{formatFecha(e.fecha, true)}</p>
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
                <Boton variante="fantasma" onClick={() => { setForm(formDesdeSolicitud(s)); setError(""); }}>
                  Descartar
                </Boton>
                <Boton onClick={handleGuardar} disabled={saving} icono={<Save size={15} />}>
                  {saving ? "Guardando..." : "Guardar cambios"}
                </Boton>
              </>
            )}
          </div>
        </div>
      )}
      {/* Errores cuando no hay barra de guardado (ej. mecánico con la solicitud cerrada) */}
      {!puedeEditar && error && (
        <Alerta className="fixed bottom-4 right-4 z-20">{error}</Alerta>
      )}

      <ConfirmModal
        open={confirmarFin}
        tono="confirmar"
        onClose={() => setConfirmarFin(false)}
        onConfirm={async () => {
          setConfirmarFin(false);
          await handleEstado("completada");
        }}
        title="¿Terminaste la reparación?"
        confirmLabel="Sí, ya terminé"
        loadingLabel="Guardando..."
      >
        Después ya no podrás cambiar nada de este servicio. Si te equivocas, tendrás que pedirle al
        administrador que lo regrese.
      </ConfirmModal>

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
