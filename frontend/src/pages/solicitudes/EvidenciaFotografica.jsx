// src/pages/solicitudes/EvidenciaFotografica.jsx
// Apartado del mecánico: elige uno de sus servicios en Reparación (ya con la
// orden de compra atendida) y sube sus 3 fotos (llegada, reparación, final).
// ?servicio=ID lo preselecciona. Con las 3 fotos aparece el botón para ir al
// formato de entrega.
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import FotosEvidencia, { FOTOS } from "../../components/solicitudes/FotosEvidencia";
import DatosVehiculo from "../../components/solicitudes/DatosVehiculo";
import { EstadoBadge } from "../../components/solicitudes/Badges";
import { solicitudesApi } from "../../api/solicitudes";
import { useAuth } from "../../context/AuthContext";
import { MECANICO_MENU, MECANICO_SECONDARY_MENU } from "../../config/menus";
import { Camera, CarFront, ChevronRight, ExternalLink, Loader2, CheckCircle2, FileCheck2 } from "lucide-react";

import { Alerta, Boton } from "../../components/ui";

function nombreVehiculo(v) {
  return v?.numeroEconomico || v?.unidad || v?.noInventario || "Vehículo";
}

// Qué foto falta para poder llenar el formato de entrega
function siguientePaso(s) {
  const tiene = new Set(Object.keys(s.fotos || {}));
  const nombres = { llegada: "llegada", reparacion: "reparación", final: "final" };
  const faltan = Object.keys(nombres).filter((t) => !tiene.has(t));
  if (faltan.length) {
    return `Falta la foto de ${faltan.map((t) => nombres[t]).join(", ")} para poder llenar el formato de entrega.`;
  }
  return "Las 3 fotos están listas. Ya puedes llenar el formato de entrega en el servicio.";
}

export default function EvidenciaFotografica() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const seleccionId = Number(searchParams.get("servicio")) || null;

  const [lista, setLista] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [detalle, setDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [error, setError] = useState("");
  const panelRef = useRef(null);

  // Mis servicios en Reparación
  useEffect(() => {
    solicitudesApi
      .listar({ estado: "reparacion" })
      .then((data) => {
        setLista(data);
        // En escritorio se abre el primero si no hay uno elegido
        if (!seleccionId && data.length && window.innerWidth >= 1024) {
          setSearchParams({ servicio: data[0].id }, { replace: true });
        }
      })
      .catch((e) => setError(e.message || "No se pudieron cargar tus vehículos"))
      .finally(() => setCargandoLista(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detalle del elegido
  useEffect(() => {
    if (!seleccionId) {
      setDetalle(null);
      return;
    }
    let cancel = false;
    setCargandoDetalle(true);
    solicitudesApi
      .obtener(seleccionId)
      .then((d) => {
        if (cancel) return;
        setDetalle(d);
        // En celular, baja hasta las fotos al elegir un vehículo
        if (window.innerWidth < 1024) panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      })
      .catch((e) => !cancel && setError(e.message || "No se pudo cargar el servicio"))
      .finally(() => !cancel && setCargandoDetalle(false));
    return () => { cancel = true; };
  }, [seleccionId]);

  const elegir = (id) => setSearchParams({ servicio: id });

  // Al subir/quitar una foto se actualiza el panel y el contador de la lista
  const onActualizada = (s) => {
    setDetalle(s);
    setLista((l) => l.map((x) => (x.id === s.id ? { ...x, fotos_tipos: Object.keys(s.fotos || {}) } : x)));
  };

  const puedeSubir = Boolean(
    detalle && detalle.mecanico?.id === user?.id && detalle.estado === "reparacion"
  );
  const fotosCompletas = Boolean(detalle) && FOTOS.every((f) => detalle.fotos?.[f.tipo]);
  const irAEntrega = () => navigate(`/mecanico/reparaciones/${detalle.id}?paso=entrega`);

  return (
    <DashboardLayout
      menu={MECANICO_MENU}
      secondaryMenu={MECANICO_SECONDARY_MENU}
      title="Evidencia fotográfica"
      subtitle="Fotos de tus vehículos en reparación"
    >
      {error && (
        <Alerta className="mb-4">{error}</Alerta>
      )}

      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-5 items-start ${puedeSubir && fotosCompletas ? "pb-24" : ""}`}>
        {/* ─── Vehículos en reparación ─── */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Vehículos en reparación</h3>
            <p className="text-xs text-slate-500 mt-0.5">Elige uno para subir sus fotos</p>
          </div>

          {cargandoLista ? (
            <div className="flex items-center justify-center py-10 text-slate-500">
              <Loader2 size={22} className="animate-spin" />
            </div>
          ) : lista.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <CarFront size={36} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm text-slate-600">No tienes vehículos en reparación</p>
              <p className="mt-1 text-xs text-slate-500">
                Un servicio llega aquí cuando administración atiende su orden de compra (o si no necesitó refacciones).
              </p>
              <button
                onClick={() => navigate("/mecanico/reparaciones")}
                className="mt-3 text-sm font-medium text-institucional hover:underline"
              >
                Ver mis servicios
              </button>
            </div>
          ) : (
            <ul className="p-2 space-y-1">
              {lista.map((s) => {
                const n = (s.fotos_tipos || []).length;
                const activo = s.id === seleccionId;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => elegir(s.id)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition
                        ${activo ? "bg-institucional/[0.06] ring-1 ring-institucional/30" : "hover:bg-slate-50"}`}
                    >
                      <span className="w-10 h-10 rounded-xl bg-institucional/10 text-institucional flex items-center justify-center shrink-0">
                        <CarFront size={20} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-800 truncate">
                          {nombreVehiculo(s.vehiculo)}
                        </span>
                        <span className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-mono text-slate-500">{s.folio}</span>
                          <EstadoBadge estado={s.estado} />
                        </span>
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0
                          ${n === 3 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-900"}`}
                      >
                        <Camera size={11} className="inline -mt-px mr-1" />
                        {n}/3
                      </span>
                      <ChevronRight size={16} className="text-slate-300 shrink-0" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ─── Vehículo elegido: datos + 3 fotos ─── */}
        <div ref={panelRef} className="lg:col-span-2 space-y-5 scroll-mt-20">
          {cargandoDetalle && !detalle ? (
            <div className="flex items-center justify-center py-20 text-slate-500">
              <Loader2 size={26} className="animate-spin" />
            </div>
          ) : !detalle ? (
            !cargandoLista && lista.length > 0 && (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
                Elige un vehículo de la lista para ver y subir sus fotos.
              </div>
            )
          ) : (
            <>
              <section className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-800">{nombreVehiculo(detalle.vehiculo)}</h3>
                      <EstadoBadge estado={detalle.estado} />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">{detalle.folio}</p>
                  </div>
                  <button
                    onClick={() => navigate(`/mecanico/reparaciones/${detalle.id}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200
                               text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-institucional transition shrink-0"
                  >
                    Ver servicio
                    <ExternalLink size={13} />
                  </button>
                </div>
                <div className="p-5">
                  <DatosVehiculo datos={detalle.ingreso} nota={false} />
                </div>
              </section>

              {puedeSubir && fotosCompletas ? (
                <ListoParaEntrega onIr={irAEntrega} />
              ) : puedeSubir ? (
                <p className="flex items-start gap-2 text-sm bg-blue-50 border border-blue-100 text-blue-800 px-4 py-3 rounded-xl">
                  <Camera size={17} className="shrink-0 mt-0.5" />
                  {siguientePaso(detalle)}
                </p>
              ) : (
                <p className="text-sm bg-slate-50 border border-slate-200 text-slate-600 px-4 py-3 rounded-xl">
                  Este servicio ya no está en el taller o no está asignado a ti; sus fotos solo se pueden consultar.
                </p>
              )}

              <FotosEvidencia solicitud={detalle} puedeSubir={puedeSubir} onActualizada={onActualizada} />

              <p className="text-xs text-slate-500">
                {FOTOS.map((f) => `${f.titulo}: ${f.requisito.toLowerCase()}`).join(" · ")}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Con las 3 fotos, el siguiente paso siempre a la vista (también al final de la página en celular) */}
      {puedeSubir && fotosCompletas && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-20 bg-white/95 backdrop-blur border-t border-slate-200">
          <div className="px-4 sm:px-6 py-3 flex items-center justify-end gap-3">
            <p className="hidden sm:flex items-center gap-2 text-sm font-medium text-emerald-700 mr-auto">
              <CheckCircle2 size={18} />
              Las 3 fotos están listas
            </p>
            <Boton tamano="lg" onClick={irAEntrega} icono={<FileCheck2 size={20} />} className="w-full sm:w-auto">
              Ir al formato de entrega
            </Boton>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function ListoParaEntrega({ onIr }) {
  return (
    <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5 flex flex-col sm:flex-row sm:items-center gap-4 animate-fade-in">
      <span className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
        <CheckCircle2 size={26} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold text-slate-800">¡Listo! Ya están las 3 fotos.</p>
        <p className="text-sm text-slate-600">Ahora llena el formato de entrega para entregar el vehículo.</p>
      </div>
      <Boton tamano="lg" onClick={onIr} icono={<FileCheck2 size={20} />} className="shrink-0">
        Ir al formato de entrega
      </Boton>
    </div>
  );
}
