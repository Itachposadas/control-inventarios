// src/pages/ayuda/Ayuda.jsx
// Guía rápida según el rol del usuario.
import { useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { menusForRole } from "../../config/menus";
import { ROLES } from "../../config/roles";
import {
  ClipboardPlus, Stethoscope, Wrench, CheckCircle2, History, Car,
  DollarSign, Undo2, UserCog, Users, ChevronDown, LifeBuoy, Truck, Hammer,
} from "lucide-react";

const GUIA_MECANICO = [
  {
    icon: <ClipboardPlus size={20} />,
    titulo: "1. Registrar el ingreso a taller",
    pasos: [
      "Las áreas piden servicio desde la página de inicio. Entra a Solicitudes: las que llevan más tiempo esperando aparecen primero.",
      "Cuando llegue la unidad, pulsa “Atender” en su solicitud. Los datos del vehículo se llenan solos desde el catálogo (no se pueden modificar; si alguno está mal, avisa al administrador).",
      "Revisa la fecha de ingreso y la hoja (ej. hoja 1 de 1).",
      "En “Accesorios y herramientas” marca SI o NO en los 40 conceptos (incluidos los birlos); sin eso no se puede registrar.",
      "Escribe las observaciones (ej. “No trae faros delanteros”).",
      "Pulsa “Registrar ingreso”. El vehículo queda en mantenimiento y el sistema te lleva a Evidencia fotográfica para tomar la foto de llegada.",
    ],
    nota: "También puedes entrar desde Inicio → “Solicitudes”. Si una solicitud no procede, pulsa “Descartar” y escribe el motivo. Al abrir cualquier reparación, el recuadro “¿Qué sigue?” te dice qué hacer y tiene el botón para hacerlo.",
  },
  {
    icon: <Stethoscope size={20} />,
    titulo: "2. Diagnóstico",
    pasos: [
      "Abre el servicio y pulsa “Pasar a Diagnóstico”.",
      "Escribe el diagnóstico de fallas presentadas.",
      "Pulsa “Guardar y pasar a Reparación”.",
    ],
    nota: "Sin la foto de llegada no podrás pasar a Diagnóstico, y sin el diagnóstico no podrás pasar a Reparación.",
  },
  {
    icon: <Wrench size={20} />,
    titulo: "3. Reparación",
    pasos: [
      "Captura las acciones realizadas y las observaciones de lo que se trabajó.",
      "Mientras cambias la pieza, entra a Evidencia fotográfica, elige el vehículo y toma la foto de reparación.",
      "Pulsa “Guardar cambios” cuando quieras; no se pierde lo capturado.",
    ],
  },
  {
    icon: <CheckCircle2 size={20} />,
    titulo: "4. Completar",
    pasos: [
      "Cuando termines, toma la foto final del vehículo ya reparado (también en Evidencia fotográfica).",
      "Pulsa “Terminar reparación” y confirma. Sin las 3 fotos (llegada, reparación y final) no se puede terminar.",
      "El vehículo vuelve a estar activo y el administrador captura el costo y lo entrega.",
    ],
    nota: "Una vez completada ya no puedes modificarla. Si hay que corregir algo, pídele al administrador que la regrese a Reparación.",
  },
  {
    icon: <Truck size={20} />,
    titulo: "Taller foráneo",
    pasos: [
      "Si la unidad no se puede reparar aquí, abre su servicio y pulsa “Generar orden foránea” (o ve a Taller foráneo → Nueva orden y elige el ingreso).",
      "Los datos del vehículo se toman solos del ingreso a taller.",
      "Escribe el diagnóstico inicial: la falla y por qué no se pudo reparar en el taller del área.",
      "En “Taller al que se remite” escribe el nombre del taller solo en la columna que corresponda: muelles, llantas o transmisión.",
    ],
    nota: "Puedes corregir o eliminar la orden mientras la unidad siga en el taller.",
  },
  {
    icon: <Hammer size={20} />,
    titulo: "Préstamo de herramientas",
    pasos: [
      "En Préstamo de herramientas → Catálogo están las herramientas del taller y cuántas piezas hay de cada una. Ahí puedes registrar, editar o eliminar herramientas.",
      "Cuando un mecánico pida herramientas, ve a la pestaña Prestadas y pulsa “Nuevo préstamo”: escribe el nombre del mecánico y elige las herramientas y la cantidad.",
      "Cuando las regrese, pulsa “Devolvió todo”. Si solo regresó algunas, pulsa “Devolvió algunas”, marca las que entregó (y cuántas piezas) y confirma: lo que falta queda como Pendiente.",
      "Cuando ya regresó todo, el préstamo pasa a la pestaña Devueltas.",
      "Para saber quién tiene una herramienta, búscala por nombre en Prestadas o en Catálogo (columna “La tiene”).",
    ],
    nota: "No se puede prestar más piezas de las disponibles; el catálogo muestra cuántas quedan.",
  },
  {
    icon: <History size={20} />,
    titulo: "Consultar historial",
    pasos: [
      "En Historial ves los servicios que ya terminaste.",
      "En Solicitudes → Atendidas ves con qué ingreso a taller se atendió cada solicitud.",
    ],
  },
];

const GUIA_AREA = [
  {
    icon: <ClipboardPlus size={20} />,
    titulo: "1. Hacer una solicitud",
    pasos: [
      "Al entrar ya estás en “Nueva solicitud”. Solo aparecen los vehículos de tu área.",
      "Elige el vehículo. Si dice “En el taller” o “Ya solicitado”, espera a que el taller lo atienda.",
      "Agrega los materiales: cantidad, unidad de medida y concepto. El precio lo captura el administrador.",
      "Con “Agregar material” sumas más conceptos. Pulsa “Enviar solicitud”.",
    ],
    nota: "La fecha, la hora y el área se registran solas. Al enviar recibes un folio (ej. PET-2026-0001).",
  },
  {
    icon: <History size={20} />,
    titulo: "2. Llevar la unidad",
    pasos: [
      "Lleva la unidad al taller y menciona el folio.",
      "El mecánico atiende tu solicitud al recibir la unidad.",
    ],
    nota: "Solo ves los vehículos de tu área. La cuenta es de toda el área: no compartas la contraseña fuera de ella.",
  },
];

const GUIA_ADMIN = [
  {
    icon: <ClipboardPlus size={20} />,
    titulo: "Precios de las solicitudes",
    pasos: [
      "Entra a Solicitudes. Cada solicitud muestra los materiales que pidió el área (cantidad, unidad y concepto).",
      "Pulsa “Capturar precios”, escribe el precio unitario de cada material y pulsa “Guardar precios”.",
      "El total de cada material y el de la solicitud se calculan solos. Puedes corregirlos con “Editar precios”.",
    ],
    nota: "Las áreas no ven precios ni totales: solo indican qué materiales necesitan.",
  },
  {
    icon: <DollarSign size={20} />,
    titulo: "Capturar costo y entregar",
    pasos: [
      "Cuando un mecánico completa un servicio aparece en la campana y en el Panel de control (“Servicios listos para entregar”).",
      "Ábrelo, revisa las 3 fotos de evidencia, escribe el costo en “Administración” y pulsa “Guardar cambios”.",
      "Pulsa “Pasar a Entregada”. Puedes anotar quién recibió el vehículo.",
    ],
  },
  {
    icon: <Undo2 size={20} />,
    titulo: "Corregir un servicio",
    pasos: [
      "Si el mecánico debe corregir algo, usa “Regresar a Reparación”. El vehículo vuelve a mantenimiento y el mecánico puede editar de nuevo.",
      "En “Administración” puedes reasignar el servicio a otro mecánico.",
    ],
  },
  {
    icon: <Car size={20} />,
    titulo: "Vehículos",
    pasos: [
      "Da de alta, edita o cambia el estado de las unidades en Vehículos.",
      "Un vehículo con historial no se puede eliminar: cámbialo a estado “Baja”.",
      "El historial de cada unidad muestra todos sus servicios; haz clic en uno para ver el detalle.",
    ],
  },
  {
    icon: <Truck size={20} />,
    titulo: "Taller foráneo",
    pasos: [
      "En Taller foráneo ves todas las órdenes de reparación en talleres externos que generaron los mecánicos.",
      "Cada orden indica la fecha de remisión, el diagnóstico inicial y el taller al que se mandó la unidad.",
    ],
  },
  {
    icon: <Users size={20} />,
    titulo: "Usuarios",
    pasos: [
      "Crea las cuentas de los mecánicos en Usuarios.",
      "Si alguien deja de trabajar, desactiva su cuenta. Las cuentas con servicios registrados no se pueden eliminar para no perder el historial.",
      "Si un mecánico olvidó su contraseña, asígnale una nueva desde Usuarios → Editar.",
    ],
  },
];

const PREGUNTAS = [
  {
    p: "Olvidé mi contraseña",
    r: "Pídele al administrador que te asigne una nueva. Después cámbiala tú en Mi cuenta.",
  },
  {
    p: "Dice “Credenciales inválidas” pero mi contraseña es correcta",
    r: "Revisa que no esté activado Bloq Mayús; el sistema te avisa cuando lo está.",
  },
  {
    p: "Aparece “Sin conexión con el servidor”",
    r: "El servidor del sistema está apagado o no hay red. Avisa al administrador.",
  },
  {
    p: "No me deja pasar a Diagnóstico o a Completada",
    r: "Faltan fotos de evidencia: la de llegada para Diagnóstico, y las de reparación y final para Completada. Entra a Evidencia fotográfica en el menú, elige el vehículo y súbelas.",
  },
  {
    p: "No puedo registrar el ingreso de un vehículo",
    r: "Si ya está en el taller (tiene un servicio sin completar) o está dado de baja, no se puede registrar otro ingreso.",
  },
];

export default function Ayuda() {
  const { role } = useAuth();
  const { menu, secondaryMenu } = menusForRole(role);
  const guia = role === ROLES.ADMIN ? GUIA_ADMIN : role === ROLES.AREA ? GUIA_AREA : GUIA_MECANICO;

  return (
    <DashboardLayout menu={menu} secondaryMenu={secondaryMenu} title="Ayuda" subtitle="Guía rápida del sistema">
      <div className="max-w-4xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {guia.map((g) => (
            <div
              key={g.titulo}
              className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-5"
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-institucional/10 text-institucional flex items-center justify-center shrink-0">
                  {g.icon}
                </span>
                <h3 className="text-sm font-semibold text-slate-800">{g.titulo}</h3>
              </div>
              <ol className="mt-3 space-y-1.5 text-sm text-slate-600 list-disc pl-5 marker:text-slate-300">
                {g.pasos.map((p) => <li key={p}>{p}</li>)}
              </ol>
              {g.nota && (
                <p className="mt-3 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">{g.nota}</p>
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <LifeBuoy size={18} className="text-institucional" />
            <h3 className="text-sm font-semibold text-slate-800">Preguntas frecuentes</h3>
          </div>
          <ul className="divide-y divide-slate-100">
            {PREGUNTAS.map((q) => <Pregunta key={q.p} {...q} />)}
          </ul>
        </div>

        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <UserCog size={14} />
          Para cambiar tu contraseña ve a Mi cuenta.
        </p>
      </div>
    </DashboardLayout>
  );
}

function Pregunta({ p, r }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <li>
      <button
        onClick={() => setAbierta((a) => !a)}
        aria-expanded={abierta}
        className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left text-sm font-medium
                   text-slate-700 hover:bg-slate-50 transition"
      >
        {p}
        <ChevronDown size={16} className={`text-slate-500 shrink-0 transition ${abierta ? "rotate-180" : ""}`} />
      </button>
      {abierta && <p className="px-5 pb-4 -mt-1 text-sm text-slate-500">{r}</p>}
    </li>
  );
}
