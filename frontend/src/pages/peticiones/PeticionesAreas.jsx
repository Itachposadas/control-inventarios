// src/pages/peticiones/PeticionesAreas.jsx
// "Solicitudes": lo que piden las áreas desde la página de inicio.
// Mecánico: cuando llega la unidad la atiende (registra el ingreso a taller,
// que queda ligado a la solicitud) o la descarta con un motivo. Admin: consulta.
// Las pendientes se ordenan por tiempo de espera: las más antiguas son prioridad.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import { Boton, Alerta, Modal, Field, TextArea, inputClass } from "../../components/ui";
import { peticionesApi } from "../../api/peticiones";
import { useAuth } from "../../context/AuthContext";
import { menusForRole } from "../../config/menus";
import { ROLES } from "../../config/roles";
import { SOLICITUDES_BASE } from "../../config/solicitudes";
import TablaMateriales from "../../components/peticiones/TablaMateriales";
import { Loader2, Inbox, CarFront, ClipboardPlus, XCircle, Building2, Clock } from "lucide-react";

const PESTANAS = [
  { valor: "pendiente", label: "Pendientes" },
  { valor: "atendida", label: "Atendidas" },
  { valor: "descartada", label: "Descartadas" },
];

const VACIO = {
  pendiente: "No hay solicitudes pendientes",
  atendida: "Aún no se ha atendido ninguna solicitud",
  descartada: "No hay solicitudes descartadas",
};

// Prioridad según cuánto lleva esperando una solicitud pendiente
const PRIORIDADES = [
  { valor: "alta", label: "Alta", desde: 3, chip: "bg-red-100 text-red-700", borde: "border-l-red-500", punto: "bg-red-500" },
  { valor: "media", label: "Media", desde: 1, chip: "bg-amber-100 text-amber-700", borde: "border-l-amber-500", punto: "bg-amber-500" },
  { valor: "baja", label: "Reciente", desde: 0, chip: "bg-slate-100 text-slate-600", borde: "border-l-slate-200", punto: "bg-slate-300" },
];

const aFecha = (iso) => new Date(iso.endsWith("Z") ? iso : `${iso}Z`);

const diasEsperando = (iso) => Math.floor((Date.now() - aFecha(iso)) / 86400000);

const prioridadDe = (p) => {
  const dias = diasEsperando(p.fecha);
  return PRIORIDADES.find((x) => dias >= x.desde);
};

function tiempoEsperando(iso) {
  const horas = Math.floor((Date.now() - aFecha(iso)) / 3600000);
  if (horas < 1) return "Hace menos de 1 hora";
  if (horas < 24) return `Esperando ${horas} ${horas === 1 ? "hora" : "horas"}`;
  const dias = Math.floor(horas / 24);
  return `Esperando ${dias} ${dias === 1 ? "día" : "días"}`;
}

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
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [descartando, setDescartando] = useState(null);

  // Filtros (las pendientes llegan del backend de la más antigua a la más reciente)
  const [prioridad, setPrioridad] = useState("");
  const [area, setArea] = useState("");
  const [orden, setOrden] = useState("antiguas");

  const cargar = () => {
    setLoading(true);
    setError("");
    peticionesApi
      .listar({ estado })
      .then(setItems)
      .catch((e) => setError(e.message || "No se pudieron cargar las solicitudes"))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(cargar, [estado]);

  const cambiarPestana = (valor) => {
    setEstado(valor);
    setPrioridad("");
    setArea("");
    setOrden(valor === "pendiente" ? "antiguas" : "recientes");
  };

  const pendientes = estado === "pendiente";
  const areas = useMemo(() => [...new Set(items.map((p) => p.area).filter(Boolean))].sort(), [items]);
  const conteo = useMemo(() => {
    const c = {};
    items.forEach((p) => {
      const v = prioridadDe(p).valor;
      c[v] = (c[v] || 0) + 1;
    });
    return c;
  }, [items]);

  const visibles = useMemo(() => {
    const lista = items.filter(
      (p) => (!area || p.area === area) && (!pendientes || !prioridad || prioridadDe(p).valor === prioridad)
    );
    lista.sort((a, b) => (aFecha(a.fecha) - aFecha(b.fecha)) * (orden === "antiguas" ? 1 : -1));
    return lista;
  }, [items, area, prioridad, orden, pendientes]);

  const atender = (p) => navigate(`/mecanico/reparaciones/nueva?peticion=${p.id}`);

  return (
    <DashboardLayout
      menu={menu}
      secondaryMenu={secondaryMenu}
      title="Solicitudes"
      subtitle="Lo que piden las áreas; se atienden al ingresar la unidad al taller"
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

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4 mb-5
                      flex flex-col lg:flex-row lg:items-center gap-3">
        {pendientes && (
          <div className="flex flex-wrap gap-1.5 flex-1" role="group" aria-label="Prioridad">
            <Chip activo={!prioridad} onClick={() => setPrioridad("")}>
              Todas <Cuenta>{items.length}</Cuenta>
            </Chip>
            {PRIORIDADES.map((x) => (
              <Chip key={x.valor} activo={prioridad === x.valor} onClick={() => setPrioridad(x.valor)}>
                <span className={`w-2 h-2 rounded-full ${x.punto}`} />
                {x.label}
                <span className="hidden sm:inline text-slate-500 font-normal">
                  {x.desde === 0 ? "(menos de 1 día)" : x.desde === 1 ? "(1–2 días)" : `(${x.desde}+ días)`}
                </span>
                <Cuenta>{conteo[x.valor] || 0}</Cuenta>
              </Chip>
            ))}
          </div>
        )}
        <div className={`flex flex-col sm:flex-row gap-3 ${pendientes ? "" : "flex-1"}`}>
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            aria-label="Área"
            className={`${inputClass} sm:w-56`}
          >
            <option value="">Todas las áreas</option>
            {areas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            aria-label="Orden"
            className={`${inputClass} sm:w-52`}
          >
            <option value="antiguas">Más antiguas primero</option>
            <option value="recientes">Más recientes primero</option>
          </select>
        </div>
      </div>

      {error && <Alerta className="mb-4">{error}</Alerta>}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 size={28} className="animate-spin" />
        </div>
      ) : visibles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Inbox size={44} className="mx-auto text-slate-300" />
          <p className="mt-4 text-sm font-medium text-slate-700">
            {items.length ? "Ninguna solicitud coincide con el filtro" : VACIO[estado]}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {visibles.map((p) => {
            const prio = pendientes ? prioridadDe(p) : null;
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
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${prio.chip}`}>
                      Prioridad {prio.label.toLowerCase()}
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

              <div className="mx-5 mb-4">
                <TablaMateriales materiales={p.materiales} total={p.total} />
              </div>

              <div className="mt-auto px-5 py-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
                {p.estado === "pendiente" && esMecanico && (
                  <>
                    {p.vehiculo?.estado === "mantenimiento" && (
                      <span className="mr-auto text-xs font-medium text-amber-700">La unidad ya está en el taller</span>
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
                      icono={<ClipboardPlus size={14} />}
                      onClick={() => atender(p)}
                      disabled={p.vehiculo?.estado === "mantenimiento"}
                      title="Registra el ingreso a taller de esta unidad"
                    >
                      Atender
                    </Boton>
                  </>
                )}
                {p.estado === "pendiente" && !esMecanico && (
                  <span className="mr-auto text-xs text-slate-500">Esperando a que llegue la unidad al taller</span>
                )}
                {p.estado === "atendida" && (
                  <p className="mr-auto text-xs text-slate-500">
                    Ingresó con{" "}
                    {p.solicitud ? (
                      <button
                        onClick={() => navigate(`${SOLICITUDES_BASE[role]}/${p.solicitud.id}`)}
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
                {p.estado === "descartada" && (
                  <p className="mr-auto text-xs text-slate-500">
                    <span className="font-semibold text-slate-600">Motivo:</span> {p.motivo_descarte}
                    {p.atendida_por && ` · ${p.atendida_por}`}
                  </p>
                )}
              </div>
            </li>
            );
          })}
        </ul>
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

function Descartar({ peticion, onClose, onListo }) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const confirmar = async () => {
    if (!motivo.trim()) return setError("Escribe el motivo");
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
        <Field label="Motivo" required>
          <TextArea
            value={motivo}
            onChange={setMotivo}
            placeholder="Ej. Solicitud duplicada / la unidad no se presentó"
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
