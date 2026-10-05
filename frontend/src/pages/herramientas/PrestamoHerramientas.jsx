// src/pages/herramientas/PrestamoHerramientas.jsx
// Apartado "Préstamo de herramientas" (mecánico). Reemplaza la hoja de papel:
// se anota a qué mecánico se le prestó qué, y al regresar las herramientas
// se marcan como devueltas (el préstamo pasa al historial).
import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import ConfirmModal from "../../components/ConfirmModal";
import { inputClass, Field } from "../../components/solicitudes/ui";
import { herramientasApi } from "../../api/herramientas";
import { useAuth } from "../../context/AuthContext";
import { menusForRole } from "../../config/menus";
import { formatFecha } from "../../config/solicitudes";
import {
  Plus, Loader2, Hammer, X, Undo2, Check, Pencil, Trash2, Search, Clock, ListChecks,
} from "lucide-react";

const PESTANAS = [
  { key: "activos", label: "Prestadas" },
  { key: "devueltos", label: "Devueltas" },
  { key: "catalogo", label: "Catálogo" },
];

const card = "bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)]";
const btnPrimario = `inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg
  bg-institucional hover:bg-institucional-dark text-white text-sm font-semibold transition shrink-0
  disabled:bg-slate-300 disabled:cursor-not-allowed`;

export default function PrestamoHerramientas() {
  const { role } = useAuth();
  const { menu, secondaryMenu } = menusForRole(role);
  const [pestana, setPestana] = useState("activos");

  return (
    <DashboardLayout
      menu={menu}
      secondaryMenu={secondaryMenu}
      title="Préstamo de herramientas"
      subtitle="Quién tiene qué herramienta del taller"
    >
      <div className="mb-5 inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200">
        {PESTANAS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPestana(p.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              pestana === p.key ? "bg-white text-institucional shadow-sm" : "text-slate-600 hover:text-slate-800"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {pestana === "catalogo" ? <Catalogo /> : <Prestamos key={pestana} estado={pestana} />}
    </DashboardLayout>
  );
}

// ─────────────────────────── Préstamos ───────────────────────────

// Para buscar sin importar acentos ni mayúsculas ("hidraulico" encuentra "hidráulico")
const normalizar = (t) => (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const piezas = (n) => `${n} pieza${n === 1 ? "" : "s"}`;

// "Luis (2), Pepe (1)"
const quienLaTiene = (h) => h.en_uso.map((e) => `${e.mecanico} (${e.cantidad})`).join(", ");

function Prestamos({ estado }) {
  const activos = estado === "activos";
  const [items, setItems] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nuevo, setNuevo] = useState(false);
  const [devolviendo, setDevolviendo] = useState(null); // id del préstamo en proceso

  const cargar = () => {
    setLoading(true);
    setError("");
    return herramientasApi
      .prestamos({ estado })
      .then(setItems)
      .catch((e) => setError(e.message || "No se pudieron cargar los préstamos"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  // Préstamos donde coincide el mecánico o alguna herramienta (en Prestadas, solo las que siguen fuera)
  const q = normalizar(busqueda.trim());
  const coincide = (i) => q && normalizar(i.herramienta).includes(q) && (!activos || !i.devuelto_at);
  const visibles = q
    ? items.filter((p) => normalizar(p.mecanico).includes(q) || p.items.some(coincide))
    : items;

  // Devuelve true si se guardó
  const devolver = async (prestamo, itemsDevueltos) => {
    setDevolviendo(prestamo.id);
    setError("");
    try {
      const actualizado = await herramientasApi.devolver(prestamo.id, itemsDevueltos);
      // Si ya regresó todo, sale de la lista de prestadas
      setItems((lista) =>
        actualizado.fecha_devolucion
          ? lista.filter((p) => p.id !== prestamo.id)
          : lista.map((p) => (p.id === prestamo.id ? actualizado : p))
      );
      return true;
    } catch (e) {
      setError(e.message || "No se pudo registrar la devolución");
      return false;
    } finally {
      setDevolviendo(null);
    }
  };

  return (
    <>
      <div className={`${card} p-4 mb-5`}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={
                activos
                  ? "Buscar herramienta o mecánico (ej. gato, Luis)..."
                  : "Buscar en el historial por herramienta o mecánico..."
              }
              className={`${inputClass} pl-9`}
            />
          </div>
          {activos && (
            <button onClick={() => setNuevo(true)} className={btnPrimario}>
              <Plus size={16} />
              Nuevo préstamo
            </button>
          )}
        </div>
        {q && !loading && (
          <p className="mt-2 text-xs text-slate-500">
            {visibles.length === 0
              ? activos
                ? "Nadie tiene esa herramienta prestada."
                : "No hay préstamos que coincidan."
              : `${visibles.length} préstamo${visibles.length === 1 ? "" : "s"} con “${busqueda.trim()}”`}
          </p>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 size={28} className="animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className={`${card} p-12 text-center`}>
          <Hammer size={44} className="mx-auto text-slate-300" />
          <p className="mt-4 text-sm font-medium text-slate-700">
            {activos ? "No hay herramientas prestadas" : "Aún no hay préstamos devueltos"}
          </p>
          {activos && (
            <p className="mt-1 text-xs text-slate-500">
              Pulsa “Nuevo préstamo” cuando un mecánico pida herramientas.
            </p>
          )}
        </div>
      ) : (
        <div className="stagger grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {visibles.map((p) => (
            <TarjetaPrestamo
              key={p.id}
              prestamo={p}
              activo={activos}
              resaltar={coincide}
              ocupado={devolviendo === p.id}
              onDevolver={(itemsDevueltos) => devolver(p, itemsDevueltos)}
            />
          ))}
        </div>
      )}

      {nuevo && (
        <NuevoPrestamo
          onClose={() => setNuevo(false)}
          onGuardado={() => {
            setNuevo(false);
            cargar();
          }}
        />
      )}
    </>
  );
}

function TarjetaPrestamo({ prestamo: p, activo, resaltar, ocupado, onDevolver }) {
  // Primero lo que sigue fuera, después lo ya devuelto
  const pendientes = p.items.filter((i) => !i.devuelto_at);
  const devueltos = p.items.filter((i) => i.devuelto_at);
  const piezasPendientes = pendientes.reduce((t, i) => t + i.cantidad, 0);
  const parcial = activo && devueltos.length > 0;

  // Modo "registrar devolución": { item_id: piezas que regresó }
  const [marcando, setMarcando] = useState(null);

  const alternar = (i) =>
    setMarcando((m) => {
      const { [i.id]: actual, ...resto } = m;
      return actual ? resto : { ...m, [i.id]: i.cantidad };
    });
  const cambiarPiezas = (i, delta) =>
    setMarcando((m) => ({ ...m, [i.id]: Math.min(Math.max((m[i.id] || 0) + delta, 1), i.cantidad) }));

  const marcadas = marcando ? Object.entries(marcando) : [];
  const piezasMarcadas = marcadas.reduce((t, [, n]) => t + n, 0);
  const faltarian = piezasPendientes - piezasMarcadas;

  const confirmar = async () => {
    const ok = await onDevolver(marcadas.map(([id, cantidad]) => ({ id: Number(id), cantidad })));
    if (ok) setMarcando(null);
  };

  return (
    <div className={`${card} p-5 ${marcando ? "ring-2 ring-institucional/30" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-base font-semibold text-slate-800 truncate">{p.mecanico}</p>
            {parcial && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                <Clock size={11} />
                Pendiente: faltan {piezas(piezasPendientes)}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Prestado el {formatFecha(p.fecha_prestamo, true)}
            {p.registrado_por && p.registrado_por !== p.mecanico && ` · lo registró ${p.registrado_por}`}
          </p>
          {!activo && (
            <p className="text-xs text-emerald-700 mt-0.5">Devuelto el {formatFecha(p.fecha_devolucion, true)}</p>
          )}
        </div>
      </div>

      {marcando && (
        <p className="mt-3 text-xs text-institucional bg-institucional/5 rounded-lg px-3 py-2">
          Marca las herramientas que regresó. Lo que no marques se queda como pendiente.
        </p>
      )}

      <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
        {pendientes.map((i) => {
          const marcada = marcando?.[i.id];
          return (
            <li
              key={i.id}
              className={`flex items-center gap-3 py-2.5 px-1 -mx-1 rounded-md ${
                resaltar(i) ? "bg-yellow-50" : ""
              }`}
            >
              {marcando && (
                <input
                  type="checkbox"
                  checked={Boolean(marcada)}
                  onChange={() => alternar(i)}
                  aria-label={`Regresó ${i.herramienta}`}
                  className="w-4 h-4 rounded border-slate-300 text-institucional focus:ring-institucional cursor-pointer shrink-0"
                />
              )}
              <span
                onClick={marcando ? () => alternar(i) : undefined}
                className={`flex-1 min-w-0 text-sm text-slate-800 ${marcando ? "cursor-pointer select-none" : ""}`}
              >
                <span className="font-semibold">{i.cantidad}×</span> {i.herramienta}
              </span>
              {marcando ? (
                marcada && i.cantidad > 1 && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 shrink-0">
                    regresó
                    <span className="inline-flex items-center rounded-lg border border-slate-200 bg-white">
                      <button
                        type="button"
                        onClick={() => cambiarPiezas(i, -1)}
                        aria-label="Una pieza menos"
                        className="px-1.5 text-slate-500 hover:text-institucional"
                      >
                        −
                      </button>
                      <span className="min-w-[1.25rem] text-center text-xs font-semibold text-slate-800">{marcada}</span>
                      <button
                        type="button"
                        onClick={() => cambiarPiezas(i, 1)}
                        aria-label="Una pieza más"
                        className="px-1.5 text-slate-500 hover:text-institucional"
                      >
                        +
                      </button>
                    </span>
                    de {i.cantidad}
                  </span>
                )
              ) : (
                parcial && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 shrink-0">
                    Pendiente
                  </span>
                )
              )}
            </li>
          );
        })}
        {devueltos.map((i) => (
          <li
            key={i.id}
            className={`flex items-center gap-3 py-2.5 px-1 -mx-1 rounded-md ${resaltar(i) ? "bg-yellow-50" : ""}`}
          >
            <span className="flex-1 min-w-0 text-sm text-slate-400 line-through">
              <span className="font-semibold">{i.cantidad}×</span> {i.herramienta}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 shrink-0">
              <Check size={13} />
              {formatFecha(i.devuelto_at, true)}
            </span>
          </li>
        ))}
      </ul>

      {p.observaciones && (
        <p className="mt-3 text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">{p.observaciones}</p>
      )}

      {activo && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
          {marcando ? (
            <>
              <span className="mr-auto text-xs text-slate-500">
                {piezasMarcadas === 0
                  ? "Nada marcado"
                  : faltarian > 0
                  ? `Quedarán pendientes ${piezas(faltarian)}`
                  : "Regresó todo"}
              </span>
              <button
                onClick={() => setMarcando(null)}
                disabled={ocupado}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmar}
                disabled={ocupado || piezasMarcadas === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                           bg-institucional hover:bg-institucional-dark text-white
                           disabled:bg-slate-300 disabled:cursor-not-allowed transition"
              >
                <Check size={14} />
                {ocupado ? "Guardando..." : "Confirmar devolución"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setMarcando({})}
                disabled={ocupado}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                           text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition"
              >
                <ListChecks size={14} />
                Devolvió algunas
              </button>
              <button
                onClick={() => onDevolver()}
                disabled={ocupado}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                           border border-institucional/30 text-institucional hover:bg-institucional/5
                           disabled:opacity-50 transition"
              >
                <Undo2 size={14} />
                {ocupado ? "Guardando..." : "Devolvió todo"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function NuevoPrestamo({ onClose, onGuardado }) {
  const [catalogo, setCatalogo] = useState(null);
  const [mecanico, setMecanico] = useState("");
  const [busqueda, setBusqueda] = useState("");
  // { herramienta_id: piezas } — cada clic en una herramienta suma una pieza
  const [seleccion, setSeleccion] = useState({});
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    herramientasApi.listar().then(setCatalogo).catch(() => setCatalogo([]));
  }, []);

  const porId = useMemo(
    () => Object.fromEntries((catalogo || []).map((h) => [h.id, h])),
    [catalogo]
  );

  const filtradas = useMemo(() => {
    const q = normalizar(busqueda.trim());
    return (catalogo || []).filter((h) => !q || normalizar(h.nombre).includes(q));
  }, [catalogo, busqueda]);

  const elegidas = Object.entries(seleccion).map(([id, cantidad]) => ({ h: porId[id], cantidad }));
  const totalPiezas = elegidas.reduce((t, e) => t + e.cantidad, 0);

  const agregar = (h) =>
    setSeleccion((s) => {
      const actual = s[h.id] || 0;
      return actual >= h.disponibles ? s : { ...s, [h.id]: actual + 1 };
    });

  const quitarUna = (id) =>
    setSeleccion((s) => {
      const { [id]: actual, ...resto } = s;
      return actual > 1 ? { ...resto, [id]: actual - 1 } : resto;
    });

  const quitar = (id) =>
    setSeleccion((s) => {
      const { [id]: _omitida, ...resto } = s;
      return resto;
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!mecanico.trim()) return setError("Escribe el nombre del mecánico que recibe las herramientas");
    if (elegidas.length === 0) return setError("Da clic en las herramientas que se van a prestar");

    setSaving(true);
    try {
      await herramientasApi.prestar({
        mecanico: mecanico.trim(),
        items: elegidas.map((x) => ({ herramienta_id: x.h.id, cantidad: x.cantidad })),
        observaciones,
      });
      onGuardado();
    } catch (err) {
      setError(err.message || "No se pudo registrar el préstamo");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 animate-fade-in">
      <div className="animate-pop bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Nuevo préstamo</h3>
            <p className="text-xs text-slate-500 mt-0.5">Da clic en las herramientas que se lleva el mecánico</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">{error}</div>
          )}

          <Field label="Nombre del mecánico" required>
            <input
              value={mecanico}
              onChange={(e) => setMecanico(e.target.value)}
              autoFocus
              maxLength={150}
              placeholder="Luis Hernández"
              className={inputClass}
            />
          </Field>

          {catalogo === null ? (
            <div className="flex justify-center py-6 text-slate-500"><Loader2 size={20} className="animate-spin" /></div>
          ) : catalogo.length === 0 ? (
            <p className="text-sm text-slate-500 bg-slate-50 rounded-lg px-3 py-3">
              El catálogo está vacío. Primero registra las herramientas en la pestaña “Catálogo”.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Catálogo para elegir */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Herramientas <span className="text-red-600">*</span>
                </label>
                <div className="relative mb-2">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar por nombre (llave, dado, gato...)"
                    className={`${inputClass} pl-9`}
                  />
                </div>
                <ul className="h-72 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {filtradas.length === 0 ? (
                    <li className="px-3 py-8 text-center text-sm text-slate-500">No se encontraron herramientas</li>
                  ) : (
                    filtradas.map((h) => {
                      const elegida = seleccion[h.id] || 0;
                      const agotada = h.disponibles === 0;
                      const completa = elegida >= h.disponibles;
                      return (
                        <li key={h.id}>
                          <button
                            type="button"
                            onClick={() => agregar(h)}
                            disabled={completa}
                            className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm transition
                              disabled:cursor-not-allowed ${
                                elegida ? "bg-institucional/5" : "hover:bg-slate-50"
                              } ${agotada ? "opacity-50" : ""}`}
                          >
                            <span className="flex-1 min-w-0">
                              <span className={`block truncate ${elegida ? "font-semibold text-institucional" : "text-slate-800"}`}>
                                {h.nombre}
                              </span>
                              <span className="block text-[11px] text-slate-500">
                                {agotada
                                  ? "Sin piezas disponibles"
                                  : `${h.disponibles - elegida} de ${h.disponibles} disponible${h.disponibles === 1 ? "" : "s"}`}
                              </span>
                              {h.en_uso.length > 0 && (
                                <span className="block text-[11px] text-amber-700 truncate">
                                  La tiene: {quienLaTiene(h)}
                                </span>
                              )}
                            </span>
                            {elegida > 0 ? (
                              <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-institucional shrink-0">
                                <Check size={14} /> {elegida}
                              </span>
                            ) : (
                              !agotada && <Plus size={15} className="text-slate-400 shrink-0" />
                            )}
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>

              {/* Vista de lo que se va a prestar */}
              <div className="flex flex-col">
                <p className="block text-sm font-medium text-slate-700 mb-1">
                  Herramientas a prestar
                  {totalPiezas > 0 && (
                    <span className="ml-1.5 text-xs font-semibold text-institucional">
                      ({totalPiezas} pieza{totalPiezas === 1 ? "" : "s"})
                    </span>
                  )}
                </p>
                <div className="flex-1 min-h-[14rem] [contain:size] overflow-y-auto rounded-xl border border-dashed border-slate-300 bg-slate-50/60">
                  {elegidas.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center px-6 text-center text-slate-500">
                      <Hammer size={30} className="text-slate-300" />
                      <p className="mt-2 text-sm">Aún no hay herramientas</p>
                      <p className="text-xs">Da clic en una herramienta de la lista para agregarla</p>
                    </div>
                  ) : (
                    <ul className="p-2 space-y-1.5">
                      {elegidas.map(({ h, cantidad }) => (
                        <li
                          key={h.id}
                          className="animate-pop flex items-center gap-2 bg-white rounded-lg border border-slate-200 px-3 py-2"
                        >
                          <span className="flex-1 min-w-0 text-sm text-slate-800 truncate">{h.nombre}</span>
                          <span className="inline-flex items-center rounded-lg border border-slate-200 shrink-0">
                            <button
                              type="button"
                              onClick={() => quitarUna(h.id)}
                              aria-label={`Una pieza menos de ${h.nombre}`}
                              className="px-2 py-0.5 text-slate-500 hover:text-institucional"
                            >
                              −
                            </button>
                            <span className="min-w-[1.5rem] text-center text-sm font-semibold text-slate-800">{cantidad}</span>
                            <button
                              type="button"
                              onClick={() => agregar(h)}
                              disabled={cantidad >= h.disponibles}
                              aria-label={`Una pieza más de ${h.nombre}`}
                              className="px-2 py-0.5 text-slate-500 hover:text-institucional disabled:opacity-30"
                            >
                              +
                            </button>
                          </span>
                          <button
                            type="button"
                            onClick={() => quitar(h.id)}
                            aria-label={`Quitar ${h.nombre}`}
                            className="p-1 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 shrink-0"
                          >
                            <X size={15} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          <Field label="Observaciones">
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              placeholder="Opcional (ej. para la unidad PV-204)"
              className={`${inputClass} resize-y`}
            />
          </Field>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-100 transition"
            >
              Cancelar
            </button>
            <button type="submit" disabled={saving || !catalogo?.length} className={btnPrimario}>
              {saving ? "Guardando..." : "Registrar préstamo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────── Catálogo ───────────────────────────

function Catalogo() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editando, setEditando] = useState(null); // {} = nueva, objeto = editar
  const [borrando, setBorrando] = useState(null);
  const [eliminandoLoading, setEliminandoLoading] = useState(false);

  const cargar = () =>
    herramientasApi
      .listar()
      .then(setItems)
      .catch((e) => setError(e.message || "No se pudo cargar el catálogo"))
      .finally(() => setLoading(false));

  useEffect(() => {
    cargar();
  }, []);

  const texto = normalizar(q.trim());
  const filtrados = items.filter(
    (h) => normalizar(h.nombre).includes(texto) || h.en_uso.some((e) => normalizar(e.mecanico).includes(texto))
  );

  const eliminar = async () => {
    setEliminandoLoading(true);
    setError("");
    try {
      await herramientasApi.eliminar(borrando.id);
      setItems((l) => l.filter((h) => h.id !== borrando.id));
    } catch (e) {
      setError(e.message || "No se pudo eliminar la herramienta");
    } finally {
      setEliminandoLoading(false);
      setBorrando(null);
    }
  };

  return (
    <>
      <div className={`${card} p-4 mb-5`}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar herramienta o mecánico..."
              className={`${inputClass} pl-9`}
            />
          </div>
          <button onClick={() => setEditando({})} className={btnPrimario}>
            <Plus size={16} />
            Registrar herramienta
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 size={28} className="animate-spin" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className={`${card} p-12 text-center`}>
          <Hammer size={44} className="mx-auto text-slate-300" />
          <p className="mt-4 text-sm font-medium text-slate-700">
            {q ? "No se encontraron herramientas" : "El catálogo está vacío"}
          </p>
          {!q && <p className="mt-1 text-xs text-slate-500">Agrega las herramientas que tiene el taller.</p>}
        </div>
      ) : (
        <div className={`${card} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
                  <th className="text-left font-medium px-5 py-3">Herramienta</th>
                  <th className="text-right font-medium px-5 py-3">Total</th>
                  <th className="text-right font-medium px-5 py-3">Prestadas</th>
                  <th className="text-right font-medium px-5 py-3">Disponibles</th>
                  <th className="text-left font-medium px-5 py-3">La tiene</th>
                  <th className="px-5 py-3"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrados.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-3 font-medium text-slate-800">{h.nombre}</td>
                    <td className="px-5 py-3 text-right text-slate-600">{h.cantidad}</td>
                    <td className="px-5 py-3 text-right text-slate-600">{h.prestadas}</td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className={`inline-block min-w-[2rem] px-2 py-0.5 rounded-md text-xs font-semibold text-center ${
                          h.disponibles === 0 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {h.disponibles}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-600">
                      {h.en_uso.length > 0 ? quienLaTiene(h) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setEditando(h)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium
                                     text-slate-600 hover:bg-slate-100 hover:text-institucional transition"
                        >
                          <Pencil size={13} />
                          Editar
                        </button>
                        <button
                          onClick={() => setBorrando(h)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium
                                     text-slate-600 hover:bg-red-50 hover:text-red-600 transition"
                        >
                          <Trash2 size={13} />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editando && (
        <HerramientaModal
          herramienta={editando.id ? editando : null}
          onClose={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null);
            cargar();
          }}
        />
      )}

      <ConfirmModal
        open={Boolean(borrando)}
        onClose={() => setBorrando(null)}
        onConfirm={eliminar}
        loading={eliminandoLoading}
        title="¿Eliminar herramienta?"
      >
        Se quitará <span className="font-semibold">{borrando?.nombre}</span> del catálogo.
      </ConfirmModal>
    </>
  );
}

function HerramientaModal({ herramienta, onClose, onGuardado }) {
  const [nombre, setNombre] = useState(herramienta?.nombre || "");
  const [cantidad, setCantidad] = useState(herramienta?.cantidad ?? 1);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!nombre.trim()) return setError("Escribe el nombre de la herramienta");
    if (!(Number(cantidad) >= 1)) return setError("La cantidad debe ser al menos 1");

    setSaving(true);
    try {
      const payload = { nombre: nombre.trim(), cantidad: Number(cantidad) };
      if (herramienta) await herramientasApi.editar(herramienta.id, payload);
      else await herramientasApi.crear(payload);
      onGuardado();
    } catch (err) {
      setError(err.message || "No se pudo guardar la herramienta");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 animate-fade-in">
      <div className="animate-pop bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">
            {herramienta ? "Editar herramienta" : "Registrar herramienta"}
          </h3>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">{error}</div>
          )}
          <Field label="Nombre" required>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoFocus
              maxLength={120}
              placeholder="Gato hidráulico"
              className={inputClass}
            />
          </Field>
          <Field label="Cantidad (piezas en el taller)" required>
            <input
              type="number"
              min={Math.max(herramienta?.prestadas || 0, 1)}
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-100 transition"
            >
              Cancelar
            </button>
            <button type="submit" disabled={saving} className={btnPrimario}>
              {saving ? "Guardando..." : herramienta ? "Guardar cambios" : "Registrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
