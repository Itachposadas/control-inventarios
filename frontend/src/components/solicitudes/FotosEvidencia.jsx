// src/components/solicitudes/FotosEvidencia.jsx
// Evidencia fotográfica obligatoria: llegada, reparación y final.
import { useEffect, useRef, useState } from "react";
import { solicitudesApi } from "../../api/solicitudes";
import { comprimirImagen } from "../../utils/comprimirImagen";
import { formatFecha } from "../../config/solicitudes";
import { Camera, ImagePlus, Loader2, RefreshCw, Trash2, X, CheckCircle2, CircleDashed } from "lucide-react";

export const FOTOS = [
  { tipo: "llegada",    titulo: "Llegada",    ayuda: "Cómo llegó el vehículo",         requisito: "Obligatoria para pasar a Diagnóstico" },
  { tipo: "reparacion", titulo: "Reparación", ayuda: "Durante el cambio de la pieza", requisito: "Obligatoria para completar" },
  { tipo: "final",      titulo: "Final",      ayuda: "El vehículo ya terminado",       requisito: "Obligatoria para completar" },
];

// Descarga la foto con el token de sesión y la convierte en URL local
function useFotoUrl(solicitudId, tipo, version) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!version) {
      setUrl(null);
      return;
    }
    let objectUrl = null;
    let cancel = false;
    solicitudesApi
      .verFoto(solicitudId, tipo)
      .then((blob) => {
        if (cancel) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => !cancel && setUrl(null));
    return () => {
      cancel = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [solicitudId, tipo, version]);
  return url;
}

// accion (opcional): botón en el encabezado, ej. "Subir fotos" desde el detalle del servicio
export default function FotosEvidencia({ solicitud, puedeSubir, onActualizada = () => {}, accion = null }) {
  const [ampliada, setAmpliada] = useState(null); // { url, titulo }
  const fotos = solicitud.fotos || {};
  const listas = FOTOS.filter((f) => fotos[f.tipo]).length;

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Evidencia fotográfica</h3>
          <p className="text-xs text-slate-500 mt-0.5">Las 3 fotos son obligatorias para cerrar el servicio</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full
              ${listas === 3 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
          >
            {listas} de 3
          </span>
          {accion}
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {FOTOS.map((f) => (
          <RanuraFoto
            key={f.tipo}
            def={f}
            solicitudId={solicitud.id}
            foto={fotos[f.tipo]}
            puedeSubir={puedeSubir}
            onActualizada={onActualizada}
            onAmpliar={setAmpliada}
          />
        ))}
      </div>

      {ampliada && <VisorFoto {...ampliada} onClose={() => setAmpliada(null)} />}
    </section>
  );
}

function RanuraFoto({ def, solicitudId, foto, puedeSubir, onActualizada, onAmpliar }) {
  const camaraRef = useRef(null);
  const galeriaRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const url = useFotoUrl(solicitudId, def.tipo, foto ? `${foto.id}-${foto.fecha}` : null);

  const handleArchivo = async (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo
    if (!archivo) return;
    setError("");
    setSubiendo(true);
    try {
      const comprimida = await comprimirImagen(archivo);
      const actualizada = await solicitudesApi.subirFoto(solicitudId, def.tipo, comprimida);
      onActualizada(actualizada);
    } catch (err) {
      setError(err.message || "No se pudo subir la foto");
    } finally {
      setSubiendo(false);
    }
  };

  const handleQuitar = async () => {
    if (!window.confirm(`¿Quitar la foto de ${def.titulo.toLowerCase()}?`)) return;
    setError("");
    setSubiendo(true);
    try {
      onActualizada(await solicitudesApi.quitarFoto(solicitudId, def.tipo));
    } catch (err) {
      setError(err.message || "No se pudo quitar la foto");
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5 mb-2">
        {foto ? (
          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
        ) : (
          <CircleDashed size={15} className="text-slate-400 shrink-0" />
        )}
        <p className="text-sm font-semibold text-slate-800">{def.titulo}</p>
      </div>
      <p className="text-xs text-slate-500 -mt-1 mb-2">{def.ayuda}</p>

      {/* Vista previa o espacio vacío */}
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
        {foto ? (
          url ? (
            <button
              type="button"
              onClick={() => onAmpliar({ url, titulo: def.titulo })}
              className="w-full h-full"
              aria-label={`Ver foto de ${def.titulo.toLowerCase()} en grande`}
            >
              <img src={url} alt={`Foto de ${def.titulo.toLowerCase()}`} className="w-full h-full object-cover" />
            </button>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <Loader2 size={22} className="animate-spin" />
            </div>
          )
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-center px-3
                          border-2 border-dashed border-slate-200 rounded-xl">
            <Camera size={26} className="text-slate-300" />
            <p className="mt-1.5 text-[11px] text-slate-400">{def.requisito}</p>
          </div>
        )}

        {subiendo && (
          <div className="absolute inset-0 bg-white/75 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-[#9F2241]" />
          </div>
        )}
      </div>

      {foto && (
        <p className="mt-1.5 text-[11px] text-slate-400 truncate">
          {foto.subido_por} · {formatFecha(foto.fecha, true)}
        </p>
      )}

      {/* Acciones (solo el mecánico asignado, mientras no esté completada) */}
      {puedeSubir && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input ref={camaraRef} type="file" accept="image/*" capture="environment" hidden onChange={handleArchivo} />
          <input ref={galeriaRef} type="file" accept="image/*" hidden onChange={handleArchivo} />

          <button
            type="button"
            onClick={() => camaraRef.current?.click()}
            disabled={subiendo}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold
                       bg-[#9F2241] hover:bg-[#7d1a33] text-white disabled:bg-slate-300 transition"
          >
            {foto ? <RefreshCw size={13} /> : <Camera size={13} />}
            {foto ? "Cambiar" : "Tomar foto"}
          </button>
          <button
            type="button"
            onClick={() => galeriaRef.current?.click()}
            disabled={subiendo}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                       border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition"
          >
            <ImagePlus size={13} />
            Galería
          </button>
          {foto && (
            <button
              type="button"
              onClick={handleQuitar}
              disabled={subiendo}
              aria-label="Quitar foto"
              className="inline-flex items-center px-2 py-1.5 rounded-lg text-xs text-slate-400
                         hover:text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}

      {!puedeSubir && !foto && <p className="mt-2 text-xs text-slate-400">Pendiente</p>}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function VisorFoto({ url, titulo, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/85 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-label={`Foto de ${titulo.toLowerCase()}`}
    >
      <button
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
      >
        <X size={20} />
      </button>
      <p className="absolute top-5 left-5 text-sm font-semibold text-white">{titulo}</p>
      <img
        src={url}
        alt={`Foto de ${titulo.toLowerCase()}`}
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
      />
    </div>
  );
}
