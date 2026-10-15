// src/pages/solicitudes/SolicitudDetail.jsx
// Servicio del taller, paso por paso:
//   1. Diagnóstico (fallas, acciones a realizar, refacciones a utilizar)
//   2. Formato de ingreso a taller
//   3. Orden de compra (solo si hay refacciones; la atiende administración)
//   4. Evidencia fotográfica
//   5. Formato de entrega (con esto queda entregado)
// El admin reasigna el mecánico, corrige el costo y puede regresar un paso.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import ConfirmModal from "../../components/ConfirmModal";
import DatosVehiculo from "../../components/solicitudes/DatosVehiculo";
import Checklist from "../../components/solicitudes/Checklist";
import FotosEvidencia from "../../components/solicitudes/FotosEvidencia";
import { EstadoBadge, PrioridadBadge } from "../../components/solicitudes/Badges";
import PasoDiagnostico from "../../components/servicio/PasoDiagnostico";
import PasoOrdenCompra from "../../components/servicio/PasoOrdenCompra";
import PasoEntrega from "../../components/servicio/PasoEntrega";
import { descargarIngresoPdf } from "../../utils/ingresoPdf";
import { Section, Field, inputClass, Boton, Alerta } from "../../components/ui";
import { solicitudesApi } from "../../api/solicitudes";
import { usuariosApi } from "../../api/usuarios";
import { useAuth } from "../../context/AuthContext";
import { menusForRole } from "../../config/menus";
import { ROLES } from "../../config/roles";
import {
  ESTADOS, TIPOS, PRIORIDADES, TIPO_LABEL, SOLICITUDES_BASE,
  FORANEO_BASE, TALLERES_FORANEOS, formatFecha, pasoSiguiente,
} from "../../config/solicitudes";
import { fechaCorta } from "../../config/reportes";
import {
  ArrowLeft, Undo2, Check, Loader2, CarFront, Trash2, Save, Camera, Truck, Plus,
  Stethoscope, ClipboardList, ShoppingCart, FileCheck2, FileDown,
} from "lucide-react";

const FOTOS_REQUERIDAS = ["llegada", "reparacion", "final"];
const NOMBRE_FOTO = { llegada: "de llegada", reparacion: "de la reparación", final: "final" };

function formDesdeSolicitud(s) {
  return {
    tipo: s.tipo,
    prioridad: s.prioridad,
    costo: s.costo ?? "",
    mecanico_id: s.mecanico?.id ?? "",
  };
}

// Mismo criterio que el backend para "regresar un paso"
function pasoAnterior(s) {
  if (s.estado === "reparacion") return s.orden_compra ? "compra" : "ingreso";
  if (s.estado === "compra") return "ingreso";
  if (s.estado === "ingreso") return "diagnostico";
  if (s.estado === "entregada") return "reparacion";
  return null;
}

export default function SolicitudDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, role } = useAuth();
  const { menu, secondaryMenu } = menusForRole(role);
  const basePath = SOLICITUDES_BASE[role];
  const esAdmin = role === ROLES.ADMIN;
  const esMecanico = role === ROLES.MECANICO;

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
  const refs = { diagnostico: useRef(null), orden: useRef(null), entrega: useRef(null) };

  const cargar = (data) => {
    setS(data);
    setForm(formDesdeSolicitud(data));
  };

  useEffect(() => {
    setLoading(true);
    solicitudesApi
      .obtener(id)
      .then(cargar)
      .catch((e) => setLoadError(e.message || "No se pudo cargar el servicio"))
      .finally(() => setLoading(false));
  }, [id]);

  // Viene de Evidencia fotográfica con las 3 fotos: abre el formato de entrega
  const irAEntrega = searchParams.get("paso") === "entrega";
  useEffect(() => {
    if (!irAEntrega || !s) return;
    const t = setTimeout(() => {
      const el = refs.entrega.current;
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      el?.querySelector("textarea")?.focus({ preventScroll: true });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [irAEntrega, s?.id]);

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
      <DashboardLayout menu={menu} secondaryMenu={secondaryMenu} title="Servicio">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <Loader2 size={28} className="animate-spin" />
            <span className="ml-3 text-sm">Cargando servicio...</span>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <p className="text-sm font-medium text-slate-700">{loadError || "Servicio no encontrado"}</p>
            <button onClick={() => navigate(basePath)} className="mt-4 text-sm font-medium text-institucional hover:underline">
              Volver a la lista
            </button>
          </div>
        )}
      </DashboardLayout>
    );
  }

  // ─── Permisos y paso actual ───
  const esSuya = s.mecanico?.id === user?.id;
  const entregada = s.estado === "entregada";
  const puedeLlenar = esMecanico && esSuya && !entregada;
  const puedeEditar = puedeLlenar || esAdmin;
  const idx = ESTADOS.findIndex((e) => e.value === s.estado);
  const despuesDe = (estado) => idx > ESTADOS.findIndex((e) => e.value === estado);
  const anterior = esAdmin ? pasoAnterior(s) : null;
  const paso = pasoSiguiente(s);
  const fotosCompletas = FOTOS_REQUERIDAS.every((t) => s.fotos?.[t]);
  const sinCompra = s.refacciones.length === 0 && !s.orden_compra;
  const nombreVehiculo = s.vehiculo?.numeroEconomico || s.vehiculo?.unidad || s.vehiculo?.noInventario;

  const volver = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate(esAdmin ? `/admin/vehiculos/${s.vehiculo?.id}` : basePath);
  };

  const irAlPaso = () => {
    if (paso.accion === "ingreso") return navigate(`/mecanico/reparaciones/${s.id}/ingreso`);
    if (paso.accion === "foto") return navigate(`/mecanico/evidencia?servicio=${s.id}`);
    const destino = { diagnostico: refs.diagnostico, orden: refs.orden, entrega: refs.entrega }[paso.accion];
    destino?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const ETIQUETA_ACCION = {
    diagnostico: { texto: "Hacer diagnóstico", icono: <Stethoscope size={20} /> },
    ingreso: { texto: "Llenar formato de ingreso", icono: <ClipboardList size={20} /> },
    orden: { texto: "Llenar orden de compra", icono: <ShoppingCart size={20} /> },
    foto: { texto: `Tomar foto ${NOMBRE_FOTO[paso.foto] || ""}`, icono: <Camera size={20} /> },
    entrega: { texto: "Llenar formato de entrega", icono: <FileCheck2 size={20} /> },
  };

  const set = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const handleGuardar = async () => {
    setError("");
    setAviso("");
    setSaving(true);
    try {
      const payload = esAdmin
        ? { costo: form.costo, mecanico_id: form.mecanico_id }
        : { tipo: form.tipo, prioridad: form.prioridad };
      cargar(await solicitudesApi.editar(s.id, payload));
      setAviso("Cambios guardados");
    } catch (e) {
      setError(e.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const regresar = async () => {
    setError("");
    setAviso("");
    setSaving(true);
    try {
      cargar(await solicitudesApi.cambiarEstado(s.id, anterior, nota));
      setNota("");
    } catch (e) {
      setError(e.message || "No se pudo regresar el paso");
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

  // Al terminar un paso: se actualiza y, si toca el formato de ingreso, se abre
  const pasoGuardado = (actualizada) => {
    cargar(actualizada);
    setAviso("");
    if (actualizada.estado === "ingreso") navigate(`/mecanico/reparaciones/${actualizada.id}/ingreso`);
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <DashboardLayout
      menu={menu}
      secondaryMenu={secondaryMenu}
      title={esMecanico ? `Servicio: ${nombreVehiculo}` : `Servicio ${s.folio}`}
      subtitle={`${TIPO_LABEL[s.tipo]} · Recibido ${formatFecha(s.fecha_ingreso)}`}
    >
      <button
        onClick={volver}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-institucional transition"
      >
        <ArrowLeft size={16} />
        Volver
      </button>

      {/* Encabezado */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-5 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-institucional/10 flex items-center justify-center text-institucional shrink-0">
            <CarFront size={28} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-800">{nombreVehiculo}</h2>
              <EstadoBadge estado={s.estado} />
              <PrioridadBadge prioridad={s.prioridad} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              <span className="font-mono">{s.folio}</span>
              {s.peticion && <> · Solicitud <span className="font-mono">{s.peticion.folio}</span></>}
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

      {/* ¿Qué sigue? (mecánico) */}
      {esMecanico && esSuya && (
        <div
          className={`rounded-2xl border-2 p-5 mb-5 flex flex-col sm:flex-row sm:items-center gap-4 ${
            entregada ? "border-emerald-200 bg-emerald-50" : "border-institucional/30 bg-institucional/[0.04]"
          }`}
        >
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-bold uppercase tracking-wide ${entregada ? "text-emerald-700" : "text-institucional"}`}>
              {entregada ? "Listo" : "¿Qué sigue?"}
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-800 leading-snug">{paso.texto}</p>
          </div>
          {puedeLlenar && paso.accion && (
            <Boton tamano="lg" onClick={irAlPaso} icono={ETIQUETA_ACCION[paso.accion].icono} className="shrink-0">
              {ETIQUETA_ACCION[paso.accion].texto}
            </Boton>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 pb-24">
        {/* ═════ Columna principal: los pasos en orden ═════ */}
        <div className="xl:col-span-2 space-y-5">
          <Section title="Datos del vehículo/maquinaria" subtitle="Tomados del catálogo al recibir la unidad">
            <DatosVehiculo datos={s.ingreso} nota={puedeLlenar} />
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Tipo de servicio">
                <select value={form.tipo} onChange={(e) => set("tipo")(e.target.value)} disabled={!puedeLlenar} className={inputClass}>
                  {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
              <Field label="Prioridad">
                <select value={form.prioridad} onChange={(e) => set("prioridad")(e.target.value)} disabled={!puedeLlenar} className={inputClass}>
                  {PRIORIDADES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </Field>
            </div>
          </Section>

          {/* 1. Diagnóstico */}
          <div ref={refs.diagnostico} className="scroll-mt-24">
            <PasoDiagnostico s={s} editable={puedeLlenar && s.estado === "diagnostico"} onGuardado={pasoGuardado} />
          </div>

          {/* 2. Formato de ingreso */}
          <Section
            title="2. Formato de ingreso a taller"
            subtitle="Accesorios y herramientas con los que llegó la unidad"
            actions={
              s.ingreso_at ? (
                <Boton variante="contorno" tamano="sm" icono={<FileDown size={14} />} onClick={() => descargarIngresoPdf(s)}>
                  Ver formato de ingreso
                </Boton>
              ) : puedeLlenar && s.estado === "ingreso" && (
                <Boton tamano="sm" icono={<ClipboardList size={14} />} onClick={() => navigate(`/mecanico/reparaciones/${s.id}/ingreso`)}>
                  Llenar formato
                </Boton>
              )
            }
          >
            {s.ingreso_at ? (
              <>
                <p className="mb-4 text-xs text-slate-500">
                  Registrado {formatFecha(s.ingreso_at, true)}
                  {s.hoja_no ? ` · Hoja ${s.hoja_no} de ${s.hoja_total}` : ""}
                </p>
                <Checklist value={s.checklist} onChange={() => {}} disabled />
                <div className="mt-5">
                  <p className="text-xs font-medium text-slate-500">Observaciones</p>
                  <p className="mt-1 text-sm text-slate-800 whitespace-pre-line">{s.observaciones_ingreso || "—"}</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">
                {s.estado === "diagnostico" ? "Se llena después del diagnóstico." : "Pendiente de llenar."}
              </p>
            )}
          </Section>

          {/* 3. Orden de compra */}
          {despuesDe("ingreso") && (
            sinCompra ? (
              <Section title="3. Orden de compra">
                <p className="text-sm text-slate-500">No se requiere: el diagnóstico no tiene refacciones a utilizar.</p>
              </Section>
            ) : (
              <div ref={refs.orden} className="scroll-mt-24">
                <PasoOrdenCompra
                  s={s}
                  editable={puedeLlenar && s.estado === "compra"}
                  esAdmin={esAdmin}
                  nombreInicial=""
                  onEnviada={(a) => { cargar(a); setAviso("Orden de compra enviada a administración"); }}
                />
              </div>
            )
          )}

          {/* 4. Evidencia fotográfica */}
          {(despuesDe("compra") || Object.keys(s.fotos || {}).length > 0) && (
            <FotosEvidencia
              solicitud={s}
              puedeSubir={false}
              accion={puedeLlenar && s.estado === "reparacion" && (
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
          )}

          {/* 5. Formato de entrega */}
          {despuesDe("compra") && (
            <div ref={refs.entrega} className="scroll-mt-24">
              <PasoEntrega
                s={s}
                editable={puedeLlenar && s.estado === "reparacion"}
                fotosCompletas={fotosCompletas}
                onEntregada={(a) => { cargar(a); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              />
            </div>
          )}

          {/* Taller foráneo */}
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
          <Section title="Avance">
            <ol className="space-y-2.5">
              {ESTADOS.map((e, i) => {
                const hecho = i < idx || (entregada && i === idx);
                const actual = i === idx && !entregada;
                const noAplica = e.value === "compra" && sinCompra && i < idx;
                return (
                  <li key={e.value} className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 transition-colors duration-300
                        ${noAplica ? "bg-slate-100 text-slate-400"
                          : hecho ? "bg-emerald-700 text-white"
                          : actual ? "bg-institucional text-white"
                          : "bg-slate-100 text-slate-500"}`}
                    >
                      {hecho && !noAplica ? <Check size={13} strokeWidth={3} /> : i + 1}
                    </span>
                    <span className={`text-sm ${actual ? "font-semibold text-slate-800" : hecho ? "text-slate-600" : "text-slate-500"}`}>
                      {e.label}
                      {noAplica && <span className="text-xs text-slate-400"> · no se requirió</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
            <p className="mt-4 text-xs text-slate-500">{paso.texto}</p>

            {anterior && (
              <div className="mt-4 space-y-2">
                <input
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Motivo (opcional)"
                  className={inputClass}
                />
                <Boton variante="fantasma" onClick={regresar} disabled={saving} icono={<Undo2 size={15} />} className="w-full">
                  Regresar a {ESTADOS.find((e) => e.value === anterior)?.label}
                </Boton>
              </div>
            )}
          </Section>

          {esAdmin && (
            <Section title="Administración" subtitle="Solo el administrador puede modificar esto">
              <div className="space-y-4">
                <Field label="Mecánico asignado">
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
                </Field>
                <Field label="Costo">
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
                  <p className="mt-1 text-[11px] text-slate-500">Se llena solo con el total de la orden de compra.</p>
                </Field>
                {s.fecha_entrega && (
                  <Field label="Fecha de entrega">
                    <p className="text-sm text-slate-700">{formatFecha(s.fecha_entrega, true)}</p>
                  </Field>
                )}
              </div>
            </Section>
          )}

          <Section title="Bitácora" subtitle="Movimientos de este servicio">
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

      {/* Barra para guardar (tipo/prioridad del mecánico; costo/mecánico del admin) */}
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
      {!puedeEditar && error && <Alerta className="fixed bottom-4 right-4 z-20">{error}</Alerta>}

      <ConfirmModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, loading: false })}
        onConfirm={handleDelete}
        loading={deleteModal.loading}
        title="¿Eliminar servicio?"
      >
        Vas a eliminar el servicio <strong className="text-slate-700">{s.folio}</strong> con todo su
        historial. Esta acción no se puede deshacer.
      </ConfirmModal>
    </DashboardLayout>
  );
}
