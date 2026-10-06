// src/pages/area/NuevaSolicitud.jsx
// NUEVA SOLICITUD de la cuenta de un área (ej. Seguridad Pública):
//   1. Elige un vehículo de SU área   2. Agrega los materiales
// La fecha y la hora se registran solas al enviar y el área es la de la cuenta.
// Al enviar recibe un folio; el taller la atiende cuando llega la unidad.
import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { areaApi } from "../../api/area";
import { AREA_MENU, AREA_SECONDARY_MENU } from "../../config/menus";
import { Boton, Alerta, inputClass } from "../../components/ui";
import {
  Search, Loader2, CarFront, ChevronRight, ArrowLeft, CheckCircle2, Send, AlertCircle, Plus, Trash2,
} from "lucide-react";

const PASOS = ["Vehículo", "Materiales"];

const normalizar = (t) =>
  (t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function NuevaSolicitud() {
  const { user } = useAuth();
  const area = user?.area || "";

  const [paso, setPaso] = useState(0);
  const [vehiculo, setVehiculo] = useState(null);
  const [enviada, setEnviada] = useState(null);

  const reiniciar = () => {
    setPaso(0);
    setVehiculo(null);
    setEnviada(null);
  };

  return (
    <DashboardLayout
      menu={AREA_MENU}
      secondaryMenu={AREA_SECONDARY_MENU}
      title="Nueva solicitud"
      subtitle={`Materiales para un vehículo de ${area}`}
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
        {enviada ? (
          <Enviada datos={enviada} onOtra={reiniciar} />
        ) : (
          <>
            <Pasos actual={paso} />
            <div className="p-5 sm:p-8">
              {paso === 0 && (
                <ElegirVehiculo
                  area={area}
                  onElegir={(v) => {
                    setVehiculo(v);
                    setPaso(1);
                  }}
                />
              )}
              {paso === 1 && vehiculo && (
                <DatosSolicitud
                  area={area}
                  vehiculo={vehiculo}
                  onAtras={() => setPaso(0)}
                  onEnviada={setEnviada}
                />
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

/* ───── Indicador de pasos ───── */

function Pasos({ actual }) {
  return (
    <ol className="flex border-b border-slate-100 bg-slate-50/60">
      {PASOS.map((nombre, i) => {
        const hecho = i < actual;
        const activo = i === actual;
        return (
          <li
            key={nombre}
            className={`flex-1 flex items-center justify-center sm:justify-start gap-2.5 px-3 sm:px-6 py-3.5
              border-b-2 -mb-px transition
              ${activo ? "border-institucional" : "border-transparent"}`}
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition
                ${hecho ? "bg-emerald-600 text-white" : activo ? "bg-institucional text-white" : "bg-slate-200 text-slate-500"}`}
            >
              {hecho ? <CheckCircle2 size={15} /> : i + 1}
            </span>
            <span
              className={`text-sm font-medium hidden sm:inline ${activo ? "text-slate-800" : "text-slate-500"}`}
            >
              {nombre}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ───── Paso 1: vehículo ───── */

function ElegirVehiculo({ area, onElegir }) {
  const [lista, setLista] = useState(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    areaApi
      .vehiculos()
      .then(setLista)
      .catch((e) => {
        setError(e.message || "No se pudieron cargar los vehículos");
        setLista([]);
      });
  }, []);

  const filtrados = useMemo(() => {
    const palabras = normalizar(q).split(/\s+/).filter(Boolean);
    return (lista || []).filter((v) => {
      const texto = normalizar([v.nombre, v.unidad, v.marca, v.modelo, v.placas, v.noInventario].join(" "));
      return palabras.every((p) => texto.includes(p));
    });
  }, [lista, q]);

  return (
    <div>
      <Encabezado
        titulo="¿Cuál es tu vehículo?"
        texto={
          <>
            Unidades de <span className="font-semibold text-slate-700">{area}</span>.
          </>
        }
      />

      <div className="relative mt-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por placas, marca, modelo o No. de inventario..."
          aria-label="Buscar vehículo"
          className={`${inputClass} pl-9 py-2.5`}
        />
      </div>

      {error && <Alerta className="mt-4">{error}</Alerta>}

      {lista === null ? (
        <Cargando />
      ) : filtrados.length === 0 ? (
        !error && (
          <p className="py-10 text-center text-sm text-slate-500">
            No se encontró la unidad. Si no aparece, avisa al administrador del parque vehicular.
          </p>
        )
      ) : (
        <ul className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {filtrados.map((v) => {
            const ocupado = v.en_taller || v.peticion_pendiente;
            return (
              <li key={v.id}>
                <button
                  onClick={() => onElegir(v)}
                  disabled={ocupado}
                  className="group w-full h-full flex items-center gap-3 p-3.5 rounded-xl border border-slate-200
                             text-left hover:border-institucional/40 hover:bg-institucional/[0.03]
                             focus:outline-none focus-visible:ring-4 focus-visible:ring-institucional/15 transition
                             disabled:bg-slate-50 disabled:hover:border-slate-200 disabled:cursor-not-allowed"
                >
                  <span
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0
                      ${ocupado ? "bg-slate-200 text-slate-500" : "bg-institucional/10 text-institucional"}`}
                  >
                    <CarFront size={21} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-slate-800 truncate">{v.nombre}</span>
                    <span className="block text-xs text-slate-500 truncate">
                      {[v.marca, v.modelo, v.placas && `Placas ${v.placas}`].filter(Boolean).join(" · ")}
                    </span>
                    <span className="block text-[11px] text-slate-500 font-mono truncate">{v.noInventario}</span>
                    {ocupado && (
                      <span className="block mt-1 text-[11px] font-medium text-amber-700">{motivoBloqueo(v)}</span>
                    )}
                  </span>
                  {v.en_taller ? (
                    <Etiqueta>En el taller</Etiqueta>
                  ) : v.peticion_pendiente ? (
                    <Etiqueta>Ya solicitado</Etiqueta>
                  ) : (
                    <ChevronRight
                      size={18}
                      className="text-slate-300 group-hover:text-institucional group-hover:translate-x-0.5 transition shrink-0"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ───── Paso 2: materiales solicitados ───── */

// Sugerencias para "Unidad de medida" (se puede escribir otra)
const UNIDADES = ["Pieza", "Juego", "Litro", "Galón", "Kilogramo", "Metro", "Caja", "Paquete", "Servicio"];

let siguienteId = 1;
const materialVacio = () => ({
  id: siguienteId++, cantidad: "1", unidad_medida: "Pieza", concepto: "", precio_unitario: "",
});

const totalDe = (m) => (Number(m.cantidad) || 0) * (Number(m.precio_unitario) || 0);

const pesos = (n) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

function DatosSolicitud({ area, vehiculo, onAtras, onEnviada }) {
  const ahora = useReloj();
  const [materiales, setMateriales] = useState(() => [materialVacio()]);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cambiar = (id, campo, valor) =>
    setMateriales((lista) => lista.map((m) => (m.id === id ? { ...m, [campo]: valor } : m)));
  const quitar = (id) => setMateriales((lista) => lista.filter((m) => m.id !== id));
  const agregar = () => setMateriales((lista) => [...lista, materialVacio()]);

  const totalGeneral = materiales.reduce((s, m) => s + totalDe(m), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    for (const [i, m] of materiales.entries()) {
      const n = materiales.length > 1 ? `Material ${i + 1}: ` : "";
      if (!(Number(m.cantidad) > 0)) return setError(`${n}la cantidad debe ser mayor a 0`);
      if (!m.unidad_medida.trim()) return setError(`${n}indica la unidad de medida`);
      if (!m.concepto.trim()) return setError(`${n}escribe el concepto`);
      if (m.precio_unitario === "" || Number(m.precio_unitario) < 0) return setError(`${n}captura el precio unitario`);
    }

    setEnviando(true);
    try {
      const r = await areaApi.enviar({
        vehiculo_id: vehiculo.id,
        materiales: materiales.map(({ cantidad, unidad_medida, concepto, precio_unitario }) => ({
          cantidad, unidad_medida, concepto, precio_unitario,
        })),
      });
      onEnviada(r);
    } catch (err) {
      setError(err.message || "No se pudo enviar la solicitud");
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Atras onClick={onAtras}>Cambiar vehículo</Atras>
      <Encabezado titulo="Materiales solicitados" texto="Agrega uno o varios materiales para esta unidad." />

      {/* Datos generales: se llenan solos */}
      <dl className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-px rounded-xl border border-slate-200 bg-slate-200 overflow-hidden">
        <DatoGeneral
          etiqueta="Fecha"
          valor={ahora.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}
        />
        <DatoGeneral etiqueta="Hora" valor={ahora.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })} />
        <DatoGeneral etiqueta="Área" valor={area} />
        <DatoGeneral
          etiqueta="Vehículo"
          valor={vehiculo.nombre}
          detalle={[vehiculo.placas, vehiculo.noInventario].filter(Boolean).join(" · ")}
        />
      </dl>

      {error && (
        <Alerta icono={<AlertCircle size={16} />} className="mt-4">{error}</Alerta>
      )}

      <datalist id="unidades-medida">
        {UNIDADES.map((u) => <option key={u} value={u} />)}
      </datalist>

      {/* Encabezados de la tabla (escritorio) */}
      <div className={`hidden ${COLUMNAS} gap-2 mt-6 px-1
                      text-[11px] font-semibold uppercase tracking-wide text-slate-500`}>
        <span>Cantidad</span>
        <span>Unidad de medida</span>
        <span>Concepto</span>
        <span>Precio unitario</span>
        <span className="text-right">Total</span>
        <span />
      </div>

      <ul className="mt-3 md:mt-2 space-y-3 md:space-y-2">
        {materiales.map((m, i) => (
          <li
            key={m.id}
            className={`grid grid-cols-2 ${COLUMNAS} gap-2 md:items-center
                       p-3 md:p-1 rounded-xl border border-slate-200 md:border-0 animate-fade-in`}
          >
            <p className="col-span-2 md:hidden text-xs font-semibold text-slate-500">Material {i + 1}</p>
            <Celda etiqueta="Cantidad">
              <input
                type="number"
                min="0.01"
                step="any"
                inputMode="decimal"
                value={m.cantidad}
                onChange={(e) => cambiar(m.id, "cantidad", e.target.value)}
                aria-label={`Cantidad del material ${i + 1}`}
                className={`${inputClass} text-center`}
              />
            </Celda>
            <Celda etiqueta="Unidad de medida">
              <input
                list="unidades-medida"
                value={m.unidad_medida}
                onChange={(e) => cambiar(m.id, "unidad_medida", e.target.value)}
                maxLength={30}
                aria-label={`Unidad de medida del material ${i + 1}`}
                className={inputClass}
              />
            </Celda>
            <Celda etiqueta="Concepto" className="col-span-2 md:col-span-1">
              <input
                value={m.concepto}
                onChange={(e) => cambiar(m.id, "concepto", e.target.value)}
                maxLength={255}
                placeholder="Ej. Aceite de motor 15W-40"
                aria-label={`Concepto del material ${i + 1}`}
                className={inputClass}
                autoFocus={i > 0 && i === materiales.length - 1}
              />
            </Celda>
            <Celda etiqueta="Precio unitario">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={m.precio_unitario}
                  onChange={(e) => cambiar(m.id, "precio_unitario", e.target.value)}
                  placeholder="0.00"
                  aria-label={`Precio unitario del material ${i + 1}`}
                  className={`${inputClass} pl-7`}
                />
              </div>
            </Celda>
            <Celda etiqueta="Total">
              <p className="py-2 md:text-right text-sm font-semibold text-slate-800 tabular-nums">{pesos(totalDe(m))}</p>
            </Celda>
            <div className="col-span-2 md:col-span-1 flex justify-end">
              <button
                type="button"
                onClick={() => quitar(m.id)}
                disabled={materiales.length === 1}
                aria-label={`Quitar material ${i + 1}`}
                title="Quitar"
                className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition
                           disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500 disabled:cursor-not-allowed"
              >
                <Trash2 size={17} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <Boton variante="contorno" onClick={agregar} icono={<Plus size={16} />} className="self-start">
          Agregar material
        </Boton>
        <p className="text-sm text-slate-600 sm:text-right">
          {materiales.length} {materiales.length === 1 ? "material" : "materiales"} ·{" "}
          <span className="font-semibold text-slate-800">Total {pesos(totalGeneral)}</span>
        </p>
      </div>

      <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <Boton variante="fantasma" tamano="lg" onClick={onAtras}>
          Atrás
        </Boton>
        <Boton
          type="submit"
          tamano="lg"
          disabled={enviando}
          icono={enviando ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        >
          {enviando ? "Enviando..." : "Enviar solicitud"}
        </Boton>
      </div>
    </form>
  );
}

// Columnas de la tabla de materiales en escritorio
const COLUMNAS = "md:grid md:grid-cols-[6rem_9rem_1fr_9rem_8rem_2.5rem]";

// Fecha y hora actuales; se actualiza cada 30 s mientras el formulario está abierto
function useReloj() {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  return ahora;
}

function DatoGeneral({ etiqueta, valor, detalle }) {
  return (
    <div className="bg-slate-50 px-4 py-3 min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{etiqueta}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-slate-800 truncate">{valor || "—"}</dd>
      {detalle && <dd className="text-[11px] text-slate-500 truncate">{detalle}</dd>}
    </div>
  );
}

// En celular cada campo lleva su etiqueta; en escritorio la da el encabezado de la tabla
function Celda({ etiqueta, className = "", children }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="md:hidden block text-xs font-medium text-slate-600 mb-1">{etiqueta}</span>
      {children}
    </label>
  );
}

/* ───── Confirmación ───── */

function Enviada({ datos, onOtra }) {
  return (
    <div className="px-5 py-12 sm:py-16 text-center animate-fade-in">
      <span className="mx-auto w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
        <CheckCircle2 size={34} />
      </span>
      <h2 className="mt-5 text-2xl font-bold text-slate-800">¡Solicitud enviada!</h2>
      <p className="mt-2 text-sm text-slate-500">
        El taller ya tiene tu solicitud para{" "}
        <span className="font-semibold text-slate-700">{datos.vehiculo.nombre}</span>
        {" "}({datos.materiales.length} {datos.materiales.length === 1 ? "material" : "materiales"}).
      </p>

      <div className="mt-6 inline-block rounded-xl border-2 border-dashed border-institucional/30 bg-institucional/[0.03] px-8 py-4">
        <p className="text-xs font-medium text-slate-500">Tu folio</p>
        <p className="mt-0.5 text-2xl sm:text-3xl font-bold font-mono text-institucional tracking-wide">{datos.folio}</p>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Anótalo y menciónalo al llevar la unidad al taller.
      </p>

      <div className="mt-8">
        <Boton variante="contorno" onClick={onOtra}>
          Hacer otra solicitud
        </Boton>
      </div>
    </div>
  );
}

/* ───── Piezas pequeñas ───── */

function motivoBloqueo(v) {
  if (v.en_taller) return "Ya está en el taller; podrás pedir otra solicitud cuando salga.";
  return `Ya tiene la solicitud ${v.peticion_pendiente} pendiente; espera a que el taller la atienda.`;
}

function Encabezado({ titulo, texto }) {
  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-semibold text-slate-800 tracking-tight">{titulo}</h2>
      <p className="mt-1 text-sm text-slate-500">{texto}</p>
    </div>
  );
}

function Atras({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-institucional transition"
    >
      <ArrowLeft size={16} />
      {children}
    </button>
  );
}

function Cargando() {
  return (
    <div className="flex justify-center py-14 text-slate-500">
      <Loader2 size={26} className="animate-spin" />
    </div>
  );
}

function Etiqueta({ children }) {
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">
      {children}
    </span>
  );
}
