// src/pages/peticiones/PeticionesAreas.jsx
// "Solicitudes": lo que piden las áreas desde la página de inicio.
// Cada solicitud es una carta del área dirigida al Coordinador de Parque
// Vehicular: unidad, falla que presenta y nombre de quien solicita (sin firmas).
// Mecánico: cuando llega la unidad pulsa "Atender" y se abre el servicio
// (diagnóstico, formato de ingreso, orden de compra, evidencia y entrega).
// También puede descartarla con un motivo. La carta se descarga en PDF.
// Admin: solo consulta (los precios se capturan en la orden de compra).
// Cada pendiente tiene vigencia (config/espera.js): vigente, por vencer (amarillo)
// y, pasado el límite, se cancela sola y pasa a "Vencidas" con el motivo.
// La búsqueda, los filtros y la paginación los resuelve el backend (10 por página).
import { useCallback, useEffect, useState } from "react";
import { useAutoActualizar } from "../../hooks/useAutoActualizar";
import { useDebounce } from "../../hooks/useDebounce";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import { Boton, Alerta, Modal, Field, TextArea, Paginacion, inputClass } from "../../components/ui";
import { peticionesApi } from "../../api/peticiones";
import { useAuth } from "../../context/AuthContext";
import { menusForRole } from "../../config/menus";
import { ROLES } from "../../config/roles";
import { SOLICITUDES_BASE } from "../../config/solicitudes";
import { PLAZOS, DIAS_LIMITE, plazoDe, textoVence, fechaCorta, aFecha, tiempoEsperando } from "../../config/espera";
import TablaMateriales from "../../components/peticiones/TablaMateriales";
import { descargarSolicitudPdf } from "../../utils/pdfs";
import {
  Loader2, Inbox, CarFront, XCircle, Building2, Clock, FileDown, UserRound,
  CheckCircle2, ArrowRight, Search,
} from "lucide-react";
import { useCamposVacios } from "../../hooks/useCamposVacios";

const PESTANAS = [
  { valor: "pendiente", label: "Pendientes" },
  { valor: "atendida", label: "Atendidas" },
  { valor: "descartada", label: "Descartadas" },
  { valor: "vencida", label: "Vencidas" },
];

const VACIO = {
  pendiente: "No hay solicitudes pendientes",
  atendida: "Aún no se ha atendido ninguna solicitud",
  descartada: "No hay solicitudes descartadas",
  vencida: "Ninguna solicitud ha vencido",
};

function fechaHora(iso) {
  if (!iso) return "—";
  return aFecha(iso).toLocaleString("es-MX", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function PeticionesAreas() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { menu, secondaryMenu } = menusForRole(role);
  const esMecanico = role === ROLES.MECANICO;

  const [estado, setEstado] = useState("pendiente");
  const [datos, setDatos] = useState(null); // página actual: { items, total, paginas, conteo, areas, ... }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [descartando, setDescartando] = useState(null);
  const [recibiendo, setRecibiendo] = useState(null);

  // Filtros (las pendientes llegan del backend de la más antigua a la más reciente)
  const [pagina, setPagina] = useState(1);
  const [q, setQ] = useState("");
  const [plazo, setPlazo] = useState("");
  const [area, setArea] = useState("");
  const [orden, setOrden] = useState("antiguas");

  const buscar = useDebounce(q.trim()); // lo escrito, cuando se deja de escribir
  // Una búsqueda nueva empieza en la página 1
  useEffect(() => setPagina(1), [buscar]);

  const cargar = useCallback(() => {
    setLoading(true);
    setError("");
    peticionesApi
      .pagina({ estado, pagina, q: buscar, area, plazo, orden })
      .then(setDatos)
      .catch((e) => setError(e.message || "No se pudieron cargar las solicitudes"))
      .finally(() => setLoading(false));
  }, [estado, pagina, buscar, area, plazo, orden]);

  useEffect(cargar, [cargar]);

  // Las solicitudes nuevas de las áreas aparecen sin recargar la página
  useAutoActualizar(() =>
    peticionesApi
      .pagina({ estado, pagina, q: buscar, area, plazo, orden })
      .then(setDatos)
      .catch(() => {})
  );

  // Cada filtro nuevo empieza en la página 1
  const filtrar = (setter) => (valor) => {
    setter(valor);
    setPagina(1);
  };

  const cambiarPestana = (valor) => {
    setEstado(valor);
    setPagina(1);
    setPlazo("");
    setArea("");
    setOrden(valor === "pendiente" ? "antiguas" : "recientes");
  };

  const pendientes = estado === "pendiente";
  const visibles = datos?.items || [];
  const areas = datos?.areas || [];
  const conteo = datos?.conteo || {};
  const hayFiltro = Boolean(buscar || area || plazo);

  const irAlServicio = (p) => navigate(`${SOLICITUDES_BASE[role]}/${p.solicitud.id}`);
  const actualizar = (p) =>
    setDatos((d) => (d ? { ...d, items: d.items.map((x) => (x.id === p.id ? p : x)) } : d));

  return (
    <DashboardLayout
      menu={menu}
      secondaryMenu={secondaryMenu}
      title="Solicitudes"
      subtitle="Lo que piden las áreas para sus vehículos"
    >
      <div className="mb-4 inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200">
        {PESTANAS.map((t) => (
          <button
            key={t.valor}
            onClick={() => cambiarPestana(t.valor)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              estado === t.valor ? "bg-white text-institucional shadow-sm" : "text-slate-600 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filtros: plazo en un renglón y búsqueda debajo */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4 mb-5
                      flex flex-col gap-3">
        {pendientes && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Vigencia">
              <Chip activo={!plazo} onClick={() => filtrar(setPlazo)("")}>
                Todas <Cuenta>{conteo.todas || 0}</Cuenta>
              </Chip>
              {PLAZOS.map((x) => (
                <Chip key={x.valor} activo={plazo === x.valor} onClick={() => filtrar(setPlazo)(x.valor)}>
                  <span className={`w-2 h-2 rounded-full ${x.punto}`} />
                  {x.label}
                  <span className="hidden sm:inline text-slate-500 font-normal">({x.rango})</span>
                  <Cuenta>{conteo[x.valor] || 0}</Cuenta>
                </Chip>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Si la unidad no llega en {DIAS_LIMITE} días, la solicitud se cancela sola y pasa a “Vencidas”.
            </p>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Folio, vehículo, placas o solicitante"
              aria-label="Buscar solicitud"
              className={`${inputClass} pl-9`}
            />
          </div>
          <select
            value={area}
            onChange={(e) => filtrar(setArea)(e.target.value)}
            aria-label="Área"
            className={`${inputClass} sm:w-56`}
          >
            <option value="">Todas las áreas</option>
            {areas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select
            value={orden}
            onChange={(e) => filtrar(setOrden)(e.target.value)}
            aria-label="Orden"
            className={`${inputClass} sm:w-52`}
          >
            <option value="antiguas">Más antiguas primero</option>
            <option value="recientes">Más recientes primero</option>
          </select>
        </div>
      </div>

      {error && <Alerta className="mb-4">{error}</Alerta>}

      {loading && !datos ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 size={28} className="animate-spin" />
        </div>
      ) : visibles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Inbox size={44} className="mx-auto text-slate-300" />
          <p className="mt-4 text-sm font-medium text-slate-700">
            {hayFiltro ? "Ninguna solicitud coincide con la búsqueda o el filtro" : VACIO[estado]}
          </p>
        </div>
      ) : (
        <>
        <ul className={`grid grid-cols-1 xl:grid-cols-2 gap-4 transition-opacity ${loading ? "opacity-60" : ""}`}>
          {visibles.map((p) => {
            const prio = pendientes ? plazoDe(p.fecha) : null;
            return (
            <li
              key={p.id}
              className={`animate-fade-up bg-white rounded-2xl border border-slate-200
                         shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col
                         ${prio ? `border-l-4 ${prio.borde}` : ""}`}
            >
              <div className="px-5 pt-4 flex items-center justify-between gap-3 flex-wrap">
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-institucional">{p.folio}</span>
                  {prio && (
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${prio.chip}`}
                      title={`Fecha límite: ${fechaCorta(prio.vence)}`}
                    >
                      {prio.label} · {textoVence(p.fecha).toLowerCase()}
                    </span>
                  )}
                  {p.estado === "vencida" && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                      Vencida
                    </span>
                  )}
                </span>
                <span className="text-right">
                  <span className="block text-xs text-slate-500">{fechaHora(p.fecha)}</span>
                  {prio && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600">
                      <Clock size={11} /> {tiempoEsperando(p.fecha)}
                    </span>
                  )}
                </span>
              </div>

              <div className="px-5 py-4 flex items-start gap-3">
                <span className="w-11 h-11 rounded-xl bg-institucional/10 text-institucional flex items-center justify-center shrink-0">
                  <CarFront size={21} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 truncate">{p.vehiculo?.nombre}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {[p.vehiculo?.marca, p.vehiculo?.modelo, p.vehiculo?.placas, p.vehiculo?.noInventario]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <Building2 size={13} />
                    {p.area || "Sin área"}
                  </p>
                </div>
              </div>

              <Falla p={p} />

              <Solicitante p={p} />

              <div className="mt-auto px-5 py-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
                {p.estado === "pendiente" && esMecanico && (
                  <>
                    {p.vehiculo?.estado === "mantenimiento" && (
                      <span className="mr-auto text-xs font-medium text-amber-900">La unidad ya está en el taller</span>
                    )}
                    <Boton
                      variante="secundario"
                      tamano="sm"
                      icono={<XCircle size={14} />}
                      onClick={() => setDescartando(p)}
                    >
                      Descartar
                    </Boton>
                    <Boton
                      tamano="sm"
                      icono={<CheckCircle2 size={14} />}
                      onClick={() => setRecibiendo(p)}
                      disabled={p.vehiculo?.estado === "mantenimiento"}
                      title="Recibe la unidad y abre su servicio"
                    >
                      Atender
                    </Boton>
                  </>
                )}
                {p.estado === "pendiente" && !esMecanico && (
                  <span className="mr-auto text-xs text-slate-500">
                    Esperando a que llegue la unidad al taller
                  </span>
                )}
                {p.estado === "atendida" && (
                  <p className="mr-auto text-xs text-slate-500">
                    Servicio{" "}
                    {p.solicitud ? (
                      <button
                        onClick={() => irAlServicio(p)}
                        className="font-mono font-semibold text-institucional hover:underline"
                      >
                        {p.solicitud.folio}
                      </button>
                    ) : (
                      "—"
                    )}
                    {p.atendida_por && ` · ${p.atendida_por}`} · {fechaHora(p.atendida_at)}
                  </p>
                )}
                {p.estado === "vencida" && (
                  <p className="mr-auto text-xs text-slate-500">
                    <span className="font-semibold text-red-700">La unidad no llegó.</span> Se canceló sola el{" "}
                    {fechaHora(p.atendida_at)}
                  </p>
                )}
                {p.estado === "descartada" && (
                  <p className="mr-auto text-xs text-slate-500">
                    <span className="font-semibold text-slate-600">Motivo:</span> {p.motivo_descarte}
                    {p.atendida_por && ` · ${p.atendida_por}`}
                  </p>
                )}
                <Boton
                  variante="fantasma"
                  tamano="sm"
                  icono={<FileDown size={14} />}
                  onClick={() => descargarSolicitudPdf(p)}
                  title="Descarga la carta de solicitud en PDF"
                >
                  Carta
                </Boton>
              </div>
            </li>
            );
          })}
        </ul>
        <Paginacion
          className="mt-5"
          pagina={datos.pagina}
          paginas={datos.paginas}
          total={datos.total}
          porPagina={datos.por_pagina}
          onCambiar={(n) => {
            setPagina(n);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
        </>
      )}

      {recibiendo && (
        <Recibir
          peticion={recibiendo}
          onClose={() => setRecibiendo(null)}
          onRecibida={actualizar}
          onContinuar={irAlServicio}
        />
      )}

      {descartando && (
        <Descartar
          peticion={descartando}
          onClose={() => setDescartando(null)}
          onListo={() => {
            setDescartando(null);
            cargar();
          }}
        />
      )}
    </DashboardLayout>
  );
}

// Lo que el área escribió en su carta. Las solicitudes anteriores al cambio no
// tienen descripción: muestran los materiales que pidieron.
function Falla({ p }) {
  if (p.descripcion_falla) {
    return (
      <div className="mx-5 mb-4 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Falla que presenta</p>
        <p className="mt-1 text-sm text-slate-700 whitespace-pre-line break-words line-clamp-6">{p.descripcion_falla}</p>
      </div>
    );
  }
  if (p.materiales?.length) {
    return (
      <div className="mx-5 mb-4">
        <TablaMateriales materiales={p.materiales} />
      </div>
    );
  }
  return null;
}

// Quién hace la solicitud (la cuenta del área la usan varias personas)
function Solicitante({ p }) {
  if (!p.solicitante_nombre) return null;
  return (
    <p className="mx-5 mb-4 inline-flex items-center gap-2 text-sm text-slate-600 min-w-0">
      <UserRound size={15} className="text-slate-500 shrink-0" />
      <span className="text-slate-500">Solicita:</span>
      <span className="font-semibold text-slate-800 break-words">{p.solicitante_nombre}</span>
    </p>
  );
}

function Chip({ activo, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition
        ${activo
          ? "border-institucional bg-institucional/5 text-institucional"
          : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
    >
      {children}
    </button>
  );
}

function Cuenta({ children }) {
  return <span className="ml-0.5 px-1.5 rounded-full bg-slate-100 text-slate-600 tabular-nums">{children}</span>;
}

// "Atender": parque vehicular recibe la unidad y se abre su servicio (paso Diagnóstico).
function Recibir({ peticion, onClose, onRecibida, onContinuar }) {
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [recibida, setRecibida] = useState(null);

  const atender = async () => {
    setError("");
    setGuardando(true);
    try {
      const p = await peticionesApi.recibir(peticion.id);
      setRecibida(p);
      onRecibida(p);
    } catch (e) {
      setError(e.message || "No se pudo atender la solicitud");
      setGuardando(false);
    }
  };

  const v = peticion.vehiculo || {};

  if (recibida) {
    return (
      <Modal titulo="Solicitud atendida" subtitulo={`${recibida.folio} · ${v.nombre}`} onClose={onClose} ancho="max-w-xl">
        <div className="p-6 text-center">
          <span className="mx-auto w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center animate-check">
            <CheckCircle2 size={30} />
          </span>
          <p className="mt-4 text-sm text-slate-600">
            Se abrió el servicio <span className="font-mono font-semibold text-slate-800">{recibida.solicitud?.folio}</span>.
            Sigue el diagnóstico de la unidad.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-2">
            <Boton variante="contorno" icono={<FileDown size={16} />} onClick={() => descargarSolicitudPdf(recibida)}>
              Ver carta de solicitud
            </Boton>
            <Boton icono={<ArrowRight size={16} />} onClick={() => onContinuar(recibida)}>
              Continuar con el diagnóstico
            </Boton>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal titulo="Atender solicitud" subtitulo={`${peticion.folio} · ${v.nombre} · ${peticion.area}`} onClose={onClose} ancho="max-w-xl">
      <div className="p-6 space-y-4">
        {error && <Alerta>{error}</Alerta>}
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-slate-50 px-3 py-2 min-w-0">
            <dt className="text-slate-500">Vehículo</dt>
            <dd className="mt-0.5 font-semibold text-slate-800 truncate">
              {[v.nombre, v.placas].filter(Boolean).join(" · ")}
            </dd>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2 min-w-0">
            <dt className="text-slate-500">Solicita</dt>
            <dd className="mt-0.5 font-semibold text-slate-800 truncate">{peticion.solicitante_nombre || "—"}</dd>
          </div>
        </dl>
        {peticion.descripcion_falla && (
          <div className="rounded-lg border border-slate-200 px-3 py-2">
            <p className="text-xs text-slate-500">Falla que presenta</p>
            <p className="mt-0.5 text-sm text-slate-700 whitespace-pre-line break-words">{peticion.descripcion_falla}</p>
          </div>
        )}
        <p className="text-sm text-slate-600">
          Al atenderla, la unidad queda en el taller y se abre su servicio en el paso de diagnóstico.
        </p>
        <div className="flex justify-end gap-2">
          <Boton variante="fantasma" onClick={onClose}>Cancelar</Boton>
          <Boton icono={<CheckCircle2 size={16} />} onClick={atender} disabled={guardando}>
            {guardando ? "Guardando..." : "Atender y abrir servicio"}
          </Boton>
        </div>
      </div>
    </Modal>
  );
}

function Descartar({ peticion, onClose, onListo }) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const { errores, validar, limpiar } = useCamposVacios();

  const confirmar = async () => {
    if (!validar({ motivo: !motivo.trim() && "Rellena este campo con el motivo por el que no procede" })) return;
    setGuardando(true);
    try {
      await peticionesApi.descartar(peticion.id, motivo);
      onListo();
    } catch (e) {
      setError(e.message || "No se pudo descartar");
      setGuardando(false);
    }
  };

  return (
    <Modal titulo="Descartar solicitud" subtitulo={`${peticion.folio} · ${peticion.vehiculo?.nombre}`} onClose={onClose}>
      <div className="p-6 space-y-4">
        {error && <Alerta>{error}</Alerta>}
        <Field label="Motivo" required error={errores.motivo}>
          <TextArea
            value={motivo}
            onChange={(v) => {
              setMotivo(v);
              limpiar("motivo");
            }}
            rows={3}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Boton variante="fantasma" onClick={onClose}>
            Cancelar
          </Boton>
          <Boton variante="peligro" onClick={confirmar} disabled={guardando}>
            {guardando ? "Descartando..." : "Descartar"}
          </Boton>
        </div>
      </div>
    </Modal>
  );
}
