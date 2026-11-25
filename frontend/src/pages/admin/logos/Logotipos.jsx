// src/pages/admin/logos/Logotipos.jsx
// Logotipos del sistema y de los documentos (solo admin). Si cambia la imagen
// institucional, se sube la nueva aquí y se ve de inmediato en las pantallas y
// en los PDF que se generen a partir de ese momento. "Restaurar original"
// vuelve a la imagen con la que se instaló el sistema.
import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ImageUp, Loader2, RotateCcw } from "lucide-react";
import DashboardLayout from "../../../layouts/DashboardLayout";
import ConfirmModal from "../../../components/ConfirmModal";
import { Alerta, Boton, Section } from "../../../components/ui";
import { ADMIN_MENU, ADMIN_SECONDARY_MENU } from "../../../config/menus";
import { LOGOS } from "../../../config/logos";
import { logosApi } from "../../../api/logos";
import { actualizarLogo, useLogo } from "../../../utils/logos";

const TIPOS = ["image/png", "image/jpeg", "image/webp"];
const MAX_MB = 5;

const fechaHora = (iso) =>
  iso
    ? new Date(iso.endsWith("Z") ? iso : `${iso}Z`).toLocaleString("es-MX", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "";

export default function Logotipos() {
  const [info, setInfo] = useState(null); // { clave: {...} }
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [restaurando, setRestaurando] = useState(null); // logo por restaurar
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    logosApi
      .listar()
      .then(setInfo)
      .catch((e) => setError(e.message || "No se pudieron cargar los logotipos"));
  }, []);

  const guardado = (nuevo, mensaje) => {
    setInfo((i) => ({ ...i, [nuevo.clave]: nuevo }));
    actualizarLogo(nuevo); // las pantallas y los PDF toman el cambio de inmediato
    setError("");
    setAviso(mensaje);
  };

  const confirmarRestaurar = async () => {
    setOcupado(true);
    try {
      const nuevo = await logosApi.restaurar(restaurando.clave);
      guardado(nuevo, `Se restauró la imagen original: ${restaurando.nombre}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
      setRestaurando(null);
    }
  };

  return (
    <DashboardLayout
      menu={ADMIN_MENU}
      secondaryMenu={ADMIN_SECONDARY_MENU}
      title="Logotipos"
      subtitle="Imágenes institucionales del sistema y de los documentos"
    >
      <div className="max-w-4xl space-y-5">
        <p className="text-sm text-slate-600">
          Si cambia algún logotipo institucional, sube aquí la imagen nueva. El cambio se ve de inmediato en las
          pantallas y en los documentos PDF que se generen a partir de ese momento. Puedes volver a la imagen original
          cuando quieras.
        </p>

        {error && <Alerta icono={<AlertCircle size={16} />}>{error}</Alerta>}
        {aviso && <Alerta tipo="exito" icono={<CheckCircle2 size={16} />}>{aviso}</Alerta>}

        {!info && !error && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" /> Cargando...
          </div>
        )}

        {info &&
          LOGOS.map((logo) => (
            <TarjetaLogo
              key={logo.clave}
              logo={logo}
              estado={info[logo.clave] || { personalizado: false }}
              onGuardado={guardado}
              onError={(m) => {
                setAviso("");
                setError(m);
              }}
              onRestaurar={() => {
                setAviso("");
                setRestaurando(logo);
              }}
            />
          ))}
      </div>

      <ConfirmModal
        open={Boolean(restaurando)}
        onClose={() => setRestaurando(null)}
        onConfirm={confirmarRestaurar}
        loading={ocupado}
        tono="confirmar"
        title="¿Restaurar la imagen original?"
        confirmLabel="Sí, restaurar"
        loadingLabel="Restaurando..."
      >
        Se quitará la imagen que se subió para <span className="font-semibold">{restaurando?.nombre}</span> y el
        sistema volverá a usar la original.
      </ConfirmModal>
    </DashboardLayout>
  );
}

function TarjetaLogo({ logo, estado, onGuardado, onError, onRestaurar }) {
  const src = useLogo(logo.clave);
  const input = useRef(null);
  const [subiendo, setSubiendo] = useState(false);

  const elegir = async (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo
    if (!archivo) return;
    if (!TIPOS.includes(archivo.type)) return onError("El archivo debe ser una imagen PNG, JPG o WEBP");
    if (logo.silueta && archivo.type === "image/jpeg") {
      return onError("La marca de agua debe ser PNG o WEBP con fondo transparente");
    }
    if (archivo.size > MAX_MB * 1024 * 1024) return onError(`La imagen pesa más de ${MAX_MB} MB`);

    setSubiendo(true);
    try {
      const nuevo = await logosApi.cambiar(logo.clave, archivo);
      onGuardado(nuevo, `Se cambió la imagen: ${logo.nombre}`);
    } catch (err) {
      onError(err.message || "No se pudo subir la imagen");
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <Section
      title={logo.nombre}
      subtitle={logo.usos}
      actions={
        <span
          className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            estado.personalizado ? "bg-institucional/10 text-institucional" : "bg-slate-100 text-slate-600"
          }`}
        >
          {estado.personalizado ? "Cambiado" : "Original"}
        </span>
      }
    >
      <div className="flex flex-col sm:flex-row gap-5">
        {/* Vista previa sobre cuadrícula para notar si la imagen tiene fondo transparente */}
        <div
          className="sm:w-64 h-40 shrink-0 rounded-xl border border-slate-200 flex items-center justify-center p-4"
          style={{
            backgroundColor: "#fff",
            backgroundImage:
              "linear-gradient(45deg,#f1f5f9 25%,transparent 25%),linear-gradient(-45deg,#f1f5f9 25%,transparent 25%)," +
              "linear-gradient(45deg,transparent 75%,#f1f5f9 75%),linear-gradient(-45deg,transparent 75%,#f1f5f9 75%)",
            backgroundSize: "16px 16px",
            backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
          }}
        >
          {logo.silueta ? (
            // Así se ve en el sistema: solo la silueta, con el color institucional
            <div
              className="h-full w-full bg-institucional"
              style={{
                maskImage: `url("${src}")`,
                WebkitMaskImage: `url("${src}")`,
                maskSize: "contain",
                WebkitMaskSize: "contain",
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
                maskPosition: "center",
                WebkitMaskPosition: "center",
              }}
              role="img"
              aria-label={logo.nombre}
            />
          ) : (
            <img src={src} alt={logo.nombre} className="max-h-full max-w-full object-contain" />
          )}
        </div>

        <div className="min-w-0 flex-1 flex flex-col">
          <p className="text-xs text-slate-500">{logo.recomendacion} Máximo {MAX_MB} MB.</p>
          {estado.personalizado ? (
            <p className="mt-2 text-xs text-slate-600">
              Imagen subida
              {estado.nombre_archivo && (
                <>
                  : <span className="font-medium break-all">{estado.nombre_archivo}</span>
                </>
              )}
              {estado.actualizado_at && ` · ${fechaHora(estado.actualizado_at)}`}
              {estado.actualizado_por && ` · ${estado.actualizado_por}`}
            </p>
          ) : (
            <p className="mt-2 text-xs text-slate-600">Se usa la imagen con la que se instaló el sistema.</p>
          )}

          <div className="mt-auto pt-4 flex flex-wrap gap-2">
            <input
              ref={input}
              type="file"
              accept={logo.silueta ? "image/png,image/webp" : "image/png,image/jpeg,image/webp"}
              hidden
              onChange={elegir}
            />
            <Boton
              icono={subiendo ? <Loader2 size={16} className="animate-spin" /> : <ImageUp size={16} />}
              onClick={() => input.current?.click()}
              disabled={subiendo}
            >
              {subiendo ? "Subiendo..." : "Cambiar imagen"}
            </Boton>
            {estado.personalizado && (
              <Boton variante="secundario" icono={<RotateCcw size={15} />} onClick={onRestaurar} disabled={subiendo}>
                Restaurar original
              </Boton>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}
