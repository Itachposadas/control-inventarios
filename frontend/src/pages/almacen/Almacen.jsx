// src/pages/almacen/Almacen.jsx
// Almacén (control de refacciones): el cuarto donde Coordinación de Parque
// Vehicular guarda lo que llega en cantidad (aceites, barriles, etc.).
// Parque vehicular captura entradas y ajustes; las salidas se registran desde
// cada servicio ("Material del almacén"). Administración no tiene este apartado.
// Las piezas que se compran para un servicio siguen por la orden de compra.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAutoActualizar } from "../../hooks/useAutoActualizar";
import { useDebounce } from "../../hooks/useDebounce";
import { useCamposVacios } from "../../hooks/useCamposVacios";
import DashboardLayout from "../../layouts/DashboardLayout";
import { inputClass, Field, Boton, Alerta, Modal, Insignia, Paginacion } from "../../components/ui";
import { almacenApi, cantidadTexto, avisoCantidad } from "../../api/almacen";
import { useAuth } from "../../context/AuthContext";
import { menusForRole } from "../../config/menus";
import { ROLES } from "../../config/roles";
import { SOLICITUDES_BASE, formatFecha } from "../../config/solicitudes";
import { Plus, Loader2, Package, Search, ArrowDownToLine, Scale, Pencil, AlertTriangle } from "lucide-react";

const PESTANAS = [
  { key: "existencias", label: "Existencias" },
  { key: "movimientos", label: "Movimientos" },
];

const TIPOS = {
  entrada: { label: "Entrada", tono: "verde" },
  salida: { label: "Salida a servicio", tono: "institucional" },
  devolucion: { label: "Devolución", tono: "azul" },
  ajuste: { label: "Ajuste", tono: "ambar" },
};

const card = "bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)]";

// Para buscar sin importar acentos ni mayúsculas
const normalizar = (t) => (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function Almacen() {
  const { role } = useAuth();
  const { menu, secondaryMenu } = menusForRole(role);
  const puedeCapturar = role === ROLES.MECANICO;
  const [pestana, setPestana] = useState("existencias");

  return (
    <DashboardLayout
      menu={menu}
      secondaryMenu={secondaryMenu}
      title="Almacén"
      subtitle={puedeCapturar ? "Existencias y movimientos del almacén del taller" : "Consulta de existencias y movimientos"}
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

      {pestana === "existencias"
        ? <Existencias puedeCapturar={puedeCapturar} />
        : <Movimientos base={SOLICITUDES_BASE[role]} />}
    </DashboardLayout>
  );
}

// ─────────────────────────── Existencias ───────────────────────────

function Existencias({ puedeCapturar }) {
  const [materiales, setMateriales] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // { tipo: "nuevo" | "editar" | "entrada" | "ajuste", material? }
  const [ventana, setVentana] = useState(null);

  const cargar = () =>
    almacenApi
      .materiales()
      .then(setMateriales)
      .catch((e) => setError(e.message || "No se pudo cargar el almacén"))
      .finally(() => setLoading(false));

  useEffect(() => {
    cargar();
  }, []);

  useAutoActualizar(() => almacenApi.materiales().then(setMateriales).catch(() => {}));

  // Filtra cuando se deja de escribir
  const q = normalizar(useDebounce(busqueda.trim()));
  const visibles = q ? materiales.filter((m) => normalizar(m.nombre).includes(q)) : materiales;
  const bajos = materiales.filter((m) => m.bajo).length;

  const guardado = () => {
    setVentana(null);
    cargar();
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
              placeholder="Buscar material..."
              aria-label="Buscar material"
              className={`${inputClass} pl-9`}
            />
          </div>
          {puedeCapturar && (
            <div className="flex flex-wrap gap-2 shrink-0">
              <Boton variante="contorno" onClick={() => setVentana({ tipo: "nuevo" })} icono={<Plus size={16} />}
                     className="flex-1 sm:flex-none whitespace-nowrap">
                Nuevo material
              </Boton>
              <Boton
                onClick={() => setVentana({ tipo: "entrada" })}
                icono={<ArrowDownToLine size={16} />}
                disabled={materiales.length === 0}
                className="flex-1 sm:flex-none whitespace-nowrap"
              >
                Registrar entrada
              </Boton>
            </div>
          )}
        </div>
        {bajos > 0 && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-amber-900">
            <AlertTriangle size={16} />
            {bajos} {bajos === 1 ? "material está" : "materiales están"} en su mínimo o por debajo.
          </p>
        )}
      </div>

      {error && <Alerta className="mb-4">{error}</Alerta>}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 size={28} className="animate-spin" />
        </div>
      ) : error && materiales.length === 0 ? null : visibles.length === 0 ? (
        <div className={`${card} p-12 text-center`}>
          <Package size={44} className="mx-auto text-slate-300" />
          <p className="mt-4 text-sm font-medium text-slate-700">
            {q ? "Ningún material coincide con la búsqueda" : "El almacén todavía no tiene materiales"}
          </p>
          {!q && puedeCapturar && (
            <p className="mt-1 text-sm text-slate-500">
              Pulsa “Nuevo material” y escribe lo que hay hoy en el almacén como existencia inicial.
            </p>
          )}
        </div>
      ) : (
        <div className={`${card} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
                  <th className="text-left font-medium px-3 sm:px-5 py-3">Material</th>
                  <th className="text-right font-medium px-3 sm:px-5 py-3">Existencia</th>
                  <th className="hidden md:table-cell text-right font-medium px-5 py-3">Mínimo</th>
                  {puedeCapturar && <th className="text-right font-medium px-3 sm:px-5 py-3">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibles.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition">
                    <td className="px-3 sm:px-5 py-3">
                      <p className="font-semibold text-slate-800">{m.nombre}</p>
                      <p className="text-xs text-slate-500">{m.unidad_medida}</p>
                    </td>
                    <td className="px-3 sm:px-5 py-3 text-right">
                      <span className={`text-base font-semibold ${m.bajo ? "text-red-700" : "text-slate-900"}`}>
                        {cantidadTexto(m.existencia)}
                      </span>
                      {m.bajo && <span className="block text-xs font-medium text-red-700">Por acabarse</span>}
                    </td>
                    <td className="hidden md:table-cell px-5 py-3 text-right text-slate-600">
                      {m.minimo == null ? "—" : cantidadTexto(m.minimo)}
                    </td>
                    {puedeCapturar && (
                      <td className="px-3 sm:px-5 py-3">
                        <div className="flex items-center justify-end sm:gap-1">
                          <BotonIcono titulo={`Registrar entrada de ${m.nombre}`} onClick={() => setVentana({ tipo: "entrada", material: m })}>
                            <ArrowDownToLine size={16} />
                          </BotonIcono>
                          <BotonIcono titulo={`Ajustar existencia de ${m.nombre}`} onClick={() => setVentana({ tipo: "ajuste", material: m })}>
                            <Scale size={16} />
                          </BotonIcono>
                          <BotonIcono titulo={`Editar ${m.nombre}`} onClick={() => setVentana({ tipo: "editar", material: m })}>
                            <Pencil size={16} />
                          </BotonIcono>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(ventana?.tipo === "nuevo" || ventana?.tipo === "editar") && (
        <MaterialModal material={ventana.material} onClose={() => setVentana(null)} onGuardado={guardado} />
      )}
      {ventana?.tipo === "entrada" && (
        <EntradaModal materiales={materiales} inicial={ventana.material} onClose={() => setVentana(null)} onGuardado={guardado} />
      )}
      {ventana?.tipo === "ajuste" && (
        <AjusteModal material={ventana.material} onClose={() => setVentana(null)} onGuardado={guardado} />
      )}
    </>
  );
}

function BotonIcono({ titulo, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={titulo}
      aria-label={titulo}
      className="tactil p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-institucional transition"
    >
      {children}
    </button>
  );
}

// onChange que además quita el aviso del campo
const alCambiar = (setter, limpiar, campo) => (e) => {
  setter(e.target.value);
  limpiar(campo);
};

// Envía y muestra el error del servidor si lo hay
function useEnviar(onGuardado) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const enviar = async (accion) => {
    setGuardando(true);
    setError("");
    try {
      await accion();
      onGuardado();
    } catch (e) {
      setError(e.message || "No se pudo guardar");
      setGuardando(false);
    }
  };
  return { guardando, error, enviar };
}

function MaterialModal({ material, onClose, onGuardado }) {
  const editando = !!material;
  const [nombre, setNombre] = useState(material?.nombre || "");
  const [unidad, setUnidad] = useState(material?.unidad_medida || "");
  const [minimo, setMinimo] = useState(material?.minimo ?? "");
  const [inicial, setInicial] = useState("");
  const { guardando, error, enviar } = useEnviar(onGuardado);
  const { errores, validar, limpiar } = useCamposVacios();

  const guardar = (e) => {
    e.preventDefault();
    const ok = validar({
      nombre: !nombre.trim() && "Rellena este campo con el nombre del material",
      unidad: !unidad.trim() && "Rellena este campo con la unidad de medida",
      minimo: String(minimo).trim() && avisoCantidad(minimo, { cero: true }),
      inicial: String(inicial).trim() && avisoCantidad(inicial, { cero: true }),
    });
    if (!ok) return;
    const datos = { nombre, unidad_medida: unidad, minimo };
    enviar(() => (editando
      ? almacenApi.editar(material.id, { ...datos, activo: true })
      : almacenApi.crear({ ...datos, existencia_inicial: inicial })));
  };

  return (
    <Modal titulo={editando ? "Editar material" : "Nuevo material"} onClose={onClose}>
      <form onSubmit={guardar} noValidate className="p-6 space-y-4">
        <Field label="Nombre" required error={errores.nombre}>
          <input value={nombre} onChange={alCambiar(setNombre, limpiar, "nombre")} className={inputClass} maxLength={150}
                 autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unidad de medida" required error={errores.unidad}>
            <input value={unidad} onChange={alCambiar(setUnidad, limpiar, "unidad")} className={inputClass} maxLength={40}
                   list="unidades-almacen" />
            <datalist id="unidades-almacen">
              {["Litro", "Galón", "Barril", "Pieza", "Kilogramo", "Metro", "Juego", "Cubeta"].map((u) => <option key={u} value={u} />)}
            </datalist>
          </Field>
          <Field label="Avisar cuando queden" error={errores.minimo}>
            <input value={minimo} onChange={alCambiar(setMinimo, limpiar, "minimo")} className={inputClass} maxLength={12}
                   inputMode="decimal" placeholder="Opcional" />
          </Field>
        </div>
        {!editando && (
          <Field label="Existencia inicial" error={errores.inicial}>
            <input value={inicial} onChange={alCambiar(setInicial, limpiar, "inicial")} className={inputClass} maxLength={12}
                   inputMode="decimal" placeholder="Opcional" />
          </Field>
        )}
        {editando && (
          <p className="text-xs text-slate-500">
            La existencia no se edita aquí: cambia con entradas, salidas a servicios y ajustes.
          </p>
        )}
        {error && <Alerta>{error}</Alerta>}
        <div className="flex justify-end gap-2 pt-1">
          <Boton variante="fantasma" onClick={onClose} disabled={guardando}>Cancelar</Boton>
          <Boton type="submit" disabled={guardando}
                 icono={guardando ? <Loader2 size={16} className="animate-spin" /> : null}>
            {guardando ? "Guardando..." : "Guardar"}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}

function EntradaModal({ materiales, inicial, onClose, onGuardado }) {
  const [materialId, setMaterialId] = useState(inicial?.id || "");
  const [cantidad, setCantidad] = useState("");
  const [nota, setNota] = useState("");
  const { guardando, error, enviar } = useEnviar(onGuardado);
  const material = materiales.find((m) => String(m.id) === String(materialId));
  const { errores, validar, limpiar } = useCamposVacios();

  const guardar = (e) => {
    e.preventDefault();
    const ok = validar({
      material: !materialId && "Elige el material que llegó",
      cantidad: avisoCantidad(cantidad, { vacio: "Rellena este campo con la cantidad que llegó" }),
    });
    if (!ok) return;
    enviar(() => almacenApi.entrada({ material_id: materialId, cantidad, nota }));
  };

  return (
    <Modal titulo="Registrar entrada" subtitulo="Material que llegó al almacén" onClose={onClose}>
      <form onSubmit={guardar} noValidate className="p-6 space-y-4">
        <Field label="Material" required error={errores.material}>
          <select value={materialId} onChange={alCambiar(setMaterialId, limpiar, "material")} className={inputClass}>
            <option value="">Elige un material</option>
            {materiales.map((m) => (
              <option key={m.id} value={m.id}>{m.nombre} ({cantidadTexto(m.existencia)} {m.unidad_medida})</option>
            ))}
          </select>
        </Field>
        <Field label={`Cantidad que llegó${material ? ` (${material.unidad_medida})` : ""}`} required error={errores.cantidad}>
          <input value={cantidad} onChange={alCambiar(setCantidad, limpiar, "cantidad")} className={inputClass} maxLength={12}
                 inputMode="decimal" autoFocus={!!inicial} />
        </Field>
        <Field label="Nota">
          <input value={nota} onChange={(e) => setNota(e.target.value)} className={inputClass} maxLength={500}
                 placeholder="Opcional" />
        </Field>
        {error && <Alerta>{error}</Alerta>}
        <div className="flex justify-end gap-2 pt-1">
          <Boton variante="fantasma" onClick={onClose} disabled={guardando}>Cancelar</Boton>
          <Boton type="submit" disabled={guardando}
                 icono={guardando ? <Loader2 size={16} className="animate-spin" /> : <ArrowDownToLine size={16} />}>
            {guardando ? "Guardando..." : "Registrar entrada"}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}

function AjusteModal({ material, onClose, onGuardado }) {
  const [real, setReal] = useState("");
  const [nota, setNota] = useState("");
  const { guardando, error, enviar } = useEnviar(onGuardado);
  const diferencia = real === "" || Number.isNaN(Number(real)) ? null : Number(real) - material.existencia;
  const { errores, validar, limpiar } = useCamposVacios();

  const guardar = (e) => {
    e.preventDefault();
    const ok = validar({
      real: avisoCantidad(real, { vacio: "Rellena este campo con lo que contaste", cero: true }),
      nota: !nota.trim() && "Rellena este campo con el motivo del ajuste",
    });
    if (!ok) return;
    enviar(() => almacenApi.ajuste({ material_id: material.id, existencia_real: real, nota }));
  };

  return (
    <Modal titulo="Ajustar existencia" subtitulo={material.nombre} onClose={onClose}>
      <form onSubmit={guardar} noValidate className="p-6 space-y-4">
        <p className="text-sm text-slate-600">
          El sistema registra <span className="font-semibold text-slate-900">{cantidadTexto(material.existencia)} {material.unidad_medida}</span>.
          Escribe lo que contaste en el almacén.
        </p>
        <Field label={`Existencia contada (${material.unidad_medida})`} required error={errores.real}>
          <input value={real} onChange={alCambiar(setReal, limpiar, "real")} className={inputClass} maxLength={12}
                 inputMode="decimal" autoFocus />
        </Field>
        {diferencia !== null && diferencia !== 0 && (
          <p className={`text-sm font-medium ${diferencia < 0 ? "text-red-700" : "text-emerald-700"}`}>
            {diferencia > 0 ? (diferencia === 1 ? "Sobra" : "Sobran") : (diferencia === -1 ? "Falta" : "Faltan")}{" "}
            {cantidadTexto(Math.abs(diferencia))} {material.unidad_medida}
          </p>
        )}
        <Field label="Motivo" required error={errores.nota}>
          <input value={nota} onChange={alCambiar(setNota, limpiar, "nota")} className={inputClass} maxLength={500} />
        </Field>
        {error && <Alerta>{error}</Alerta>}
        <div className="flex justify-end gap-2 pt-1">
          <Boton variante="fantasma" onClick={onClose} disabled={guardando}>Cancelar</Boton>
          <Boton type="submit" disabled={guardando}
                 icono={guardando ? <Loader2 size={16} className="animate-spin" /> : <Scale size={16} />}>
            {guardando ? "Guardando..." : "Guardar ajuste"}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────── Movimientos ───────────────────────────

function Movimientos({ base }) {
  const [datos, setDatos] = useState(null);
  const [tipo, setTipo] = useState("");
  const [pagina, setPagina] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;
    almacenApi
      .movimientos({ tipo, pagina })
      .then((d) => !cancel && setDatos(d))
      .catch((e) => !cancel && setError(e.message || "No se pudieron cargar los movimientos"));
    return () => { cancel = true; };
  }, [tipo, pagina]);

  useAutoActualizar(() => almacenApi.movimientos({ tipo, pagina }).then(setDatos).catch(() => {}));

  return (
    <>
      <div className={`${card} p-4 mb-5 flex flex-col sm:flex-row sm:items-center gap-3`}>
        <select
          value={tipo}
          onChange={(e) => { setTipo(e.target.value); setPagina(1); }}
          aria-label="Tipo de movimiento"
          className={`${inputClass} sm:w-56`}
        >
          <option value="">Todos los movimientos</option>
          {Object.entries(TIPOS).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
        </select>
        <p className="text-xs text-slate-500">
          Las salidas se registran desde cada servicio, en “Material del almacén”.
        </p>
      </div>

      {error && <Alerta className="mb-4">{error}</Alerta>}

      {!datos ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 size={28} className="animate-spin" />
        </div>
      ) : datos.items.length === 0 ? (
        <div className={`${card} p-12 text-center`}>
          <Package size={44} className="mx-auto text-slate-300" />
          <p className="mt-4 text-sm font-medium text-slate-700">Todavía no hay movimientos</p>
        </div>
      ) : (
        <div className={`${card} overflow-hidden`}>
          <ul className="divide-y divide-slate-100">
            {datos.items.map((m) => {
              const t = TIPOS[m.tipo];
              return (
                <li key={m.id} className="px-4 sm:px-5 py-3 flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Insignia tono={t.tono}>{t.label}</Insignia>
                      <span className="text-sm font-semibold text-slate-800">{m.material.nombre}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatFecha(m.fecha, true)} · {m.registrado_por}
                      {m.solicitud && (
                        <> · <Link to={`${base}/${m.solicitud.id}`} className="font-mono text-institucional hover:underline">
                          {m.solicitud.folio}</Link> {m.solicitud.vehiculo}</>
                      )}
                    </p>
                    {m.nota && <p className="mt-1 text-sm text-slate-600">{m.nota}</p>}
                  </div>
                  <span className={`shrink-0 text-sm font-semibold tabular-nums ${m.efecto < 0 ? "text-red-700" : "text-emerald-700"}`}>
                    {m.efecto < 0 ? "−" : "+"}{cantidadTexto(Math.abs(m.efecto))} {m.material.unidad_medida}
                  </span>
                </li>
              );
            })}
          </ul>
          <Paginacion
            className="px-5 py-3 border-t border-slate-100"
            pagina={datos.pagina}
            paginas={datos.paginas}
            total={datos.total}
            porPagina={datos.por_pagina}
            onCambiar={setPagina}
          />
        </div>
      )}
    </>
  );
}
