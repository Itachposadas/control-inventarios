// src/pages/area/NuevaSolicitud.jsx
// NUEVA SOLICITUD de la cuenta de un área (ej. Seguridad Pública):
//   1. Elige un vehículo de SU área   2. Agrega los materiales
// La fecha y la hora se registran solas al enviar y el área es la de la cuenta.
// Al final se captura el nombre y la firma de quien solicita (la cuenta es compartida).
// Al enviar recibe un folio; el taller la atiende cuando llega la unidad.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { areaApi } from "../../api/area";
import { AREA_MENU, AREA_SECONDARY_MENU } from "../../config/menus";
import { Boton, Alerta, Field, inputClass } from "../../components/ui";
import PanelFirma from "../../components/peticiones/PanelFirma";
import EditorMateriales, {
  materialVacio, validarMateriales, paraEnviar,
} from "../../components/peticiones/EditorMateriales";
import {
  Search, Loader2, CarFront, ChevronRight, ArrowLeft, CheckCircle2, Send, AlertCircle,
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
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition
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
                    <span className="block text-sm font-semibold text-slate-800 leading-snug line-clamp-2">{v.nombre}</span>
                    <span className="block text-xs text-slate-500 truncate">
                      {[v.marca, v.modelo, v.placas && `Placas ${v.placas}`].filter(Boolean).join(" · ")}
                    </span>
                    <span className="block text-[11px] text-slate-500 font-mono truncate">{v.noInventario}</span>
                    {ocupado && (
                      <span className="block mt-1 text-[11px] font-medium text-amber-900">{motivoBloqueo(v)}</span>
                    )}
                  </span>
                  {v.en_taller ? (
                    <Etiqueta>En servicio</Etiqueta>
                  ) : v.peticion_pendiente ? (
                    <Etiqueta>Solicitud pendiente</Etiqueta>
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

function DatosSolicitud({ area, vehiculo, onAtras, onEnviada }) {
  const ahora = useReloj();
  const [materiales, setMateriales] = useState(() => [materialVacio()]);
  const [solicitante, setSolicitante] = useState("");
  const [firma, setFirma] = useState(null);
  const [faltaFirma, setFaltaFirma] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const errorMateriales = validarMateriales(materiales);
    if (errorMateriales) return setError(errorMateriales);
    if (solicitante.trim().length < 3) return setError("Escribe el nombre completo de quien solicita");
    if (!firma) {
      setFaltaFirma(true);
      return setError("Falta la firma del solicitante");
    }

    setEnviando(true);
    try {
      const r = await areaApi.enviar({
        vehiculo_id: vehiculo.id,
        // El precio unitario y el total los captura después el administrador
        materiales: paraEnviar(materiales),
        solicitante_nombre: solicitante.trim(),
        solicitante_firma: firma,
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

      <div className="mt-6">
        <EditorMateriales materiales={materiales} onChange={setMateriales} />
      </div>

      {/* Responsable de la solicitud */}
      <fieldset className="mt-8 border-t border-slate-100 pt-6">
        <legend className="sr-only">Solicitante</legend>
        <h3 className="text-base font-semibold text-slate-800">Nombre y firma del solicitante</h3>
        <p className="mt-0.5 text-sm text-slate-500">Persona del área que hace la solicitud y se hace responsable de ella.</p>
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Field label="Nombre completo" required>
            <input
              value={solicitante}
              onChange={(e) => setSolicitante(e.target.value)}
              maxLength={120}
              autoComplete="off"
              placeholder="Ej. Juan Pérez García"
              className={inputClass}
            />
          </Field>
          <Field label="Firma" required>
            <PanelFirma
              invalido={faltaFirma && !firma}
              onChange={(f) => {
                setFirma(f);
                if (f) setFaltaFirma(false);
              }}
            />
          </Field>
        </div>
      </fieldset>

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

/* ───── Confirmación ───── */

function Enviada({ datos, onOtra }) {
  const navigate = useNavigate();
  return (
    <div className="px-5 py-12 sm:py-16 text-center animate-fade-in">
      <span className="mx-auto w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center animate-check">
        <CheckCircle2 size={34} />
      </span>
      <h2 className="mt-5 text-2xl font-semibold text-slate-800">¡Solicitud enviada!</h2>
      <p className="mt-2 text-sm text-slate-500">
        El taller ya tiene tu solicitud para{" "}
        <span className="font-semibold text-slate-700">{datos.vehiculo.nombre}</span>
        {" "}({datos.materiales.length} {datos.materiales.length === 1 ? "material" : "materiales"}).
      </p>

      <div className="mt-6 inline-block rounded-xl border-2 border-dashed border-institucional/30 bg-institucional/[0.03] px-8 py-4">
        <p className="text-xs font-medium text-slate-500">Tu folio</p>
        <p className="mt-0.5 text-2xl sm:text-3xl font-semibold font-mono text-institucional tracking-wide">{datos.folio}</p>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Con este folio puedes consultar el avance en “Seguimiento”.
      </p>

      <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
        <Boton onClick={() => navigate(`/area/seguimiento?folio=${encodeURIComponent(datos.folio)}`)}>
          Ver seguimiento
        </Boton>
        <Boton variante="contorno" onClick={onOtra}>
          Hacer otra solicitud
        </Boton>
      </div>
    </div>
  );
}

/* ───── Piezas pequeñas ───── */

function motivoBloqueo(v) {
  // en_taller = ya se atendió una solicitud y el servicio sigue abierto
  if (v.en_taller) return "Su solicitud ya fue atendida y el servicio está en proceso; podrás hacer otra cuando concluya.";
  return `Ya tiene la solicitud ${v.peticion_pendiente} en espera de ser atendida.`;
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
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 shrink-0">
      {children}
    </span>
  );
}
