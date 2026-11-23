// src/pages/admin/coordinacion/Coordinacion.jsx
// Titular de la Coordinación de Parque Vehicular (solo admin). Si cambia el
// jefe, administración registra al nuevo y desde qué fecha está a cargo. Las
// solicitudes y formatos usan al titular vigente en su fecha: los documentos
// anteriores siguen mostrando a quien era jefe entonces.
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Pencil, RotateCcw, UserCheck, UserPlus } from "lucide-react";
import DashboardLayout from "../../../layouts/DashboardLayout";
import ConfirmModal from "../../../components/ConfirmModal";
import { Alerta, Boton, Field, Section, inputClass } from "../../../components/ui";
import { ADMIN_MENU, ADMIN_SECONDARY_MENU } from "../../../config/menus";
import { coordinacionApi } from "../../../api/coordinacion";
import { cargarTitulares, titularEn } from "../../../utils/titular";

const CARGO = "Coordinador de Parque Vehicular";
const hoy = () => new Date().toLocaleDateString("en-CA");

const fechaTexto = (dia) =>
  new Date(`${dia}T12:00:00`).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

export default function Coordinacion() {
  const [titulares, setTitulares] = useState(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  // null | "cambio" | "corregir"
  const [modo, setModo] = useState(null);
  const [deshacer, setDeshacer] = useState(false);
  const [deshaciendo, setDeshaciendo] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setTitulares(await coordinacionApi.titulares());
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const listo = async (mensaje) => {
    setModo(null);
    setAviso(mensaje);
    await cargar();
    cargarTitulares(true); // los PDF y pantallas toman el cambio de inmediato
  };

  const actual = titulares ? titularEn(titulares) : null;
  const ultimo = titulares?.[titulares.length - 1];
  // Registrado con fecha futura: aún no entra
  const programado = ultimo && actual && ultimo.id !== actual.id ? ultimo : null;

  const confirmarDeshacer = async () => {
    setDeshaciendo(true);
    try {
      await coordinacionApi.deshacer(ultimo.id);
      setDeshacer(false);
      await listo(`Se deshizo el registro de ${ultimo.nombre}`);
    } catch (e) {
      setDeshacer(false);
      setError(e.message);
    } finally {
      setDeshaciendo(false);
    }
  };

  return (
    <DashboardLayout
      menu={ADMIN_MENU}
      secondaryMenu={ADMIN_SECONDARY_MENU}
      title="Coordinación"
      subtitle="Titular de la Coordinación de Parque Vehicular"
    >
      <div className="max-w-3xl space-y-5">
        {error && <Alerta icono={<AlertCircle size={16} />}>{error}</Alerta>}
        {aviso && <Alerta tipo="exito" icono={<CheckCircle2 size={16} />}>{aviso}</Alerta>}

        {!titulares && !error && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" /> Cargando...
          </div>
        )}

        {actual && (
          <Section
            title="Titular actual"
            subtitle="A esta persona van dirigidas las solicitudes de las áreas y aparece como quien autoriza en los formatos."
          >
            <div className="flex items-start gap-4">
              <span className="w-12 h-12 rounded-xl bg-institucional/10 text-institucional flex items-center justify-center shrink-0">
                <UserCheck size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold text-slate-900">{actual.nombre}</p>
                <p className="text-sm text-slate-600">{actual.cargo}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {actual.desde ? `A cargo desde el ${fechaTexto(actual.desde)}` : "A cargo desde el inicio del sistema"}
                </p>
              </div>
            </div>

            {programado && (
              <Alerta tipo="info" className="mt-4">
                <span className="font-semibold">{programado.nombre}</span> entra el {fechaTexto(programado.desde)}.
              </Alerta>
            )}

            {!modo && (
              <div className="mt-5 flex flex-wrap gap-2">
                <Boton icono={<UserPlus size={16} />} onClick={() => { setModo("cambio"); setAviso(""); }}>
                  Registrar nuevo titular
                </Boton>
                <Boton variante="secundario" icono={<Pencil size={15} />} onClick={() => { setModo("corregir"); setAviso(""); }}>
                  Corregir nombre o cargo
                </Boton>
              </div>
            )}

            {modo === "cambio" && (
              <FormTitular
                titulo="Nuevo titular"
                texto="Los documentos con fecha anterior seguirán mostrando a quien era titular en ese momento."
                inicial={{ nombre: "", cargo: actual.cargo || CARGO, desde: hoy() }}
                conFecha
                onCancelar={() => setModo(null)}
                onGuardar={async (datos) => {
                  const t = await coordinacionApi.registrar(datos);
                  await listo(`${t.nombre} quedó registrado como titular desde el ${fechaTexto(t.desde)}`);
                }}
              />
            )}

            {modo === "corregir" && (
              <FormTitular
                titulo="Corregir datos"
                texto="Úsalo solo para errores de escritura: el cambio se ve también en los documentos anteriores de esta persona."
                inicial={{ nombre: actual.nombre, cargo: actual.cargo }}
                onCancelar={() => setModo(null)}
                onGuardar={async (datos) => {
                  await coordinacionApi.corregir(actual.id, datos);
                  await listo("Datos corregidos");
                }}
              />
            )}
          </Section>
        )}

        {titulares && titulares.length > 0 && (
          <Section title="Historial" subtitle="Quién ha estado a cargo de la coordinación">
            <ol className="divide-y divide-slate-100">
              {[...titulares].reverse().map((t, i, lista) => {
                const siguiente = lista[i - 1];
                return (
                  <li key={t.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">{t.nombre}</p>
                      <p className="text-xs text-slate-500">
                        {t.cargo} · {t.desde ? fechaTexto(t.desde) : "Inicio del sistema"}
                        {siguiente ? ` al ${fechaTexto(siguiente.desde)}` : " a la fecha"}
                      </p>
                    </div>
                    {i === 0 && titulares.length > 1 && (
                      <Boton variante="fantasma" tamano="sm" icono={<RotateCcw size={14} />} onClick={() => setDeshacer(true)}>
                        Deshacer
                      </Boton>
                    )}
                  </li>
                );
              })}
            </ol>
          </Section>
        )}
      </div>

      <ConfirmModal
        open={deshacer}
        onClose={() => setDeshacer(false)}
        onConfirm={confirmarDeshacer}
        title="¿Deshacer el último cambio?"
        confirmLabel="Sí, deshacer"
        loadingLabel="Deshaciendo..."
        loading={deshaciendo}
      >
        Se borrará el registro de <span className="font-semibold">{ultimo?.nombre}</span> y volverá a quedar como
        titular la persona anterior. Úsalo solo si se registró por error.
      </ConfirmModal>
    </DashboardLayout>
  );
}

function FormTitular({ titulo, texto, inicial, conFecha = false, onGuardar, onCancelar }) {
  const [datos, setDatos] = useState(inicial);
  const [faltan, setFaltan] = useState({});
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cambiar = (campo) => (e) => {
    setDatos((d) => ({ ...d, [campo]: e.target.value }));
    setFaltan((f) => ({ ...f, [campo]: "" }));
  };

  const guardar = async (e) => {
    e.preventDefault();
    const nuevos = {
      nombre: datos.nombre.trim().length < 3 ? "Escribe el nombre completo del titular" : "",
      cargo: datos.cargo.trim() ? "" : "Escribe el cargo",
      desde: conFecha && !datos.desde ? "Indica desde qué fecha está a cargo" : "",
    };
    setFaltan(nuevos);
    if (Object.values(nuevos).some(Boolean)) return;

    setGuardando(true);
    setError("");
    try {
      await onGuardar(datos);
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={guardar} noValidate className="mt-5 rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{titulo}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{texto}</p>
      </div>

      <Field label="Nombre completo" required error={faltan.nombre}>
        <input value={datos.nombre} onChange={cambiar("nombre")} maxLength={120} placeholder="Nombre(s) y apellidos" className={inputClass} autoFocus />
      </Field>
      <div className={`grid gap-4 ${conFecha ? "sm:grid-cols-2" : ""}`}>
        <Field label="Cargo" required error={faltan.cargo}>
          <input value={datos.cargo} onChange={cambiar("cargo")} maxLength={120} placeholder="Cargo en la coordinación" className={inputClass} />
        </Field>
        {conFecha && (
          <Field label="A cargo desde" required error={faltan.desde}>
            <input type="date" value={datos.desde} onChange={cambiar("desde")} className={inputClass} />
          </Field>
        )}
      </div>

      {error && <Alerta icono={<AlertCircle size={16} />}>{error}</Alerta>}

      <div className="flex justify-end gap-2">
        <Boton variante="fantasma" onClick={onCancelar} disabled={guardando}>Cancelar</Boton>
        <Boton type="submit" disabled={guardando} icono={guardando ? <Loader2 size={16} className="animate-spin" /> : null}>
          {guardando ? "Guardando..." : "Guardar"}
        </Boton>
      </div>
    </form>
  );
}
