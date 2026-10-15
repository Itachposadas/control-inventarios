// src/pages/ayuda/Ayuda.jsx
// Guía rápida según el rol del usuario.
import { useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { menusForRole } from "../../config/menus";
import { ROLES } from "../../config/roles";
import {
  ClipboardPlus, Stethoscope, CheckCircle2, History, Car, Camera, PenLine, ClipboardList,
  DollarSign, Undo2, UserCog, Users, ChevronDown, LifeBuoy, Truck, Hammer, ShoppingCart,
} from "lucide-react";

const GUIA_MECANICO = [
  {
    icon: <PenLine size={20} />,
    titulo: "1. Recibir la solicitud",
    pasos: [
      "Las áreas piden servicio desde su cuenta. Entra a Solicitudes: las que llevan más tiempo esperando aparecen primero.",
      "Cuando llegue la unidad, pulsa “Atender”, escribe tu nombre completo, firma en el recuadro y pulsa “Firmar de recibido”.",
      "Se abre el servicio de la unidad y ya puedes ver el formato de la solicitud con las dos firmas (botón “Formato”, en PDF).",
      "Pulsa “Continuar con el diagnóstico”.",
    ],
    nota: "Si una solicitud no procede, pulsa “Descartar” y escribe el motivo. En cada servicio, el recuadro “¿Qué sigue?” te dice qué hacer y tiene el botón para hacerlo.",
  },
  {
    icon: <Stethoscope size={20} />,
    titulo: "2. Diagnóstico",
    pasos: [
      "Escribe el diagnóstico de fallas presentadas: tu opinión o el estado actual del vehículo.",
      "Escribe las acciones a realizar / observaciones: qué trabajo de reparación o ajuste requiere.",
      "En “Refacciones a utilizar” aparecen los materiales que pidió el solicitante (cantidad, unidad de medida y descripción). Son los que irán en la orden de compra; no se pueden agregar otros.",
      "Pulsa “Guardar diagnóstico y continuar”.",
    ],
    nota: "Si el solicitante no pidió materiales, no se hace orden de compra.",
  },
  {
    icon: <ClipboardList size={20} />,
    titulo: "3. Formato de ingreso a taller",
    pasos: [
      "Los datos del vehículo se llenan solos desde el catálogo (si alguno está mal, avisa al administrador).",
      "Revisa la hoja (ej. hoja 1 de 1) y marca SI o NO en los 40 conceptos de accesorios y herramientas.",
      "Escribe las observaciones (ej. “No trae faros delanteros”) y pulsa “Registrar ingreso”.",
    ],
  },
  {
    icon: <ShoppingCart size={20} />,
    titulo: "4. Orden de compra",
    pasos: [
      "En el servicio aparece la orden de compra con las refacciones del diagnóstico.",
      "Revisa la hoja y el nombre y la firma del mecánico/almacén (se proponen los de quien firmó de recibido).",
      "En “Autorizó” firma el coordinador de parque vehicular (se propone su última firma) y pulsa “Enviar a administración”.",
      "Administración captura el proveedor y los precios. Cuando la atiende, el servicio pasa a Reparación.",
    ],
    nota: "Con “Ver orden de compra” descargas el formato en PDF.",
  },
  {
    icon: <Camera size={20} />,
    titulo: "5. Evidencia fotográfica",
    pasos: [
      "Ya en Reparación, entra a Evidencia fotográfica y elige el vehículo.",
      "Toma las 3 fotos: llegada, reparación (mientras cambias la pieza) y final (ya reparado).",
      "Cuando estén las 3, pulsa “Ir al formato de entrega”: te lleva directo a llenarlo.",
    ],
  },
  {
    icon: <CheckCircle2 size={20} />,
    titulo: "6. Formato de entrega",
    pasos: [
      "En el servicio, el formato de entrega ya trae los datos de la unidad y las fechas de recepción y entrega.",
      "Escribe el operador de la unidad (opcional), describe el trabajo realizado y escribe tus observaciones.",
      "Pulsa “Guardar y entregar vehículo” y confirma. El vehículo queda entregado y activo.",
    ],
    nota: "Con “Ver formato de entrega” descargas el PDF para imprimir, con las firmas del mecánico, del área (el solicitante) y de quien autorizó. Si hay que corregir algo, pídele al administrador que regrese el servicio.",
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
    titulo: "Historial de servicios",
    pasos: [
      "En Historial de servicios aparecen solo las unidades que ya han tenido servicio. Búscalas por placas, inventario o vehículo, o filtra por área.",
      "Elige una unidad para ver su expediente: cada servicio con sus fechas, diagnóstico, trabajo realizado y refacciones.",
      "Descarga sus formatos (solicitud, orden de compra y entrega) o pulsa “Ver servicio” para abrirlo.",
      "Con el filtro de mantenimiento preventivo ves las unidades que ya deben volver a revisión. En tu inicio también aparecen.",
    ],
    nota: "Cada unidad debe revisarse 6 meses después de su último servicio entregado; se avisa 30 días antes.",
  },
];

const GUIA_AREA = [
  {
    icon: <ClipboardPlus size={20} />,
    titulo: "1. Hacer una solicitud",
    pasos: [
      "Al entrar ya estás en “Nueva solicitud”. Solo aparecen los vehículos de tu área.",
      "Elige el vehículo. Si dice “Solicitud pendiente” o “En servicio”, ya tiene una solicitud en curso y podrás hacer otra cuando concluya.",
      "Agrega los materiales: cantidad, unidad de medida y concepto. El precio lo captura el administrador.",
      "Con “Agregar material” sumas más conceptos.",
      "Escribe el nombre completo de quien solicita y firma en el recuadro (con el mouse o el dedo). Pulsa “Enviar solicitud”.",
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
  {
    icon: <CheckCircle2 size={20} />,
    titulo: "3. Consultar el seguimiento",
    pasos: [
      "Entra a “Seguimiento”: aparecen las solicitudes de tu área, la más reciente primero.",
      "Escribe el folio (ej. PET-2026-0001), el vehículo o las placas para encontrarla.",
      "La línea de etapas muestra el avance: Enviada, Recibida en taller, Diagnóstico, Reparación y Entregada.",
      "Si una solicitud no procedió, se muestra el motivo.",
      "Cuando tu vehículo esté listo para recogerse, la campana de arriba te avisa y la solicitud lo marca en verde.",
    ],
    nota: "Con “En curso” y “Concluidas” filtras las solicitudes.",
  },
];

const GUIA_ADMIN = [
  {
    icon: <ShoppingCart size={20} />,
    titulo: "Atender órdenes de compra",
    pasos: [
      "Después del diagnóstico y del formato de ingreso, parque vehicular manda la orden de compra (folio OC-AAAA-NNNN). Aparece en la campana, en el Panel de control y en Órdenes de compra → “Por atender”.",
      "Revisa el vehículo, el diagnóstico y las refacciones, y pulsa “Atender”.",
      "Escribe los datos del proveedor, el precio unitario de cada refacción, el IVA y los adicionales. El importe, el subtotal y el total se calculan solos.",
      "Pulsa “Atender orden”. El servicio sigue a Reparación y su costo es el total de la orden. Con “Guardar sin atender” guardas lo capturado para terminar después.",
    ],
    nota: "Con “PDF” descargas la orden de compra con el formato del municipio.",
  },
  {
    icon: <ClipboardPlus size={20} />,
    titulo: "Consultar las solicitudes",
    pasos: [
      "En Solicitudes ves lo que piden las áreas: pendientes, atendidas y descartadas, con quién la pidió y los materiales.",
      "Las pendientes se ordenan por tiempo de espera; las que llevan más días aparecen como prioridad alta.",
      "Con “Formato” descargas la solicitud en PDF con las firmas, y en las atendidas puedes abrir su servicio.",
    ],
    nota: "Es solo de consulta: los precios se capturan en la orden de compra.",
  },
  {
    icon: <DollarSign size={20} />,
    titulo: "Costo de un servicio",
    pasos: [
      "El costo se llena solo con el total de la orden de compra al atenderla.",
      "Si hace falta, corrígelo en el servicio, en “Administración”, y pulsa “Guardar cambios”.",
    ],
  },
  {
    icon: <Undo2 size={20} />,
    titulo: "Corregir un servicio",
    pasos: [
      "Si hay que corregir algo, abre el servicio y usa “Regresar a …” para volver al paso anterior (por ejemplo, de Entregada a Reparación, o de Reparación a Orden de compra para corregir precios).",
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
    icon: <History size={20} />,
    titulo: "Historial de servicios",
    pasos: [
      "Muestra solo las unidades que han tenido servicio, con cuántos servicios llevan, el último y el gasto total.",
      "Busca por placas o inventario, filtra por área u ordena por más recientes, más servicios o mayor gasto.",
      "El filtro de mantenimiento preventivo muestra las unidades vencidas o próximas a revisión.",
      "Al elegir una unidad ves su expediente completo y puedes descargar los formatos de cada servicio.",
    ],
    nota: "Parque vehicular también ve el historial, pero sin gastos ni costos.",
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
      "Si un mecánico olvidó su contraseña, asígnale una nueva desde Usuarios → Editar. Es temporal: al entrar tendrá que cambiarla.",
      "Si una cuenta quedó bloqueada por intentos fallidos, ábrela en Usuarios y pulsa “Desbloquear”.",
    ],
    nota: "Las contraseñas deben tener al menos 8 caracteres, con letras y números, y no contener el nombre de usuario.",
  },
];

const PREGUNTAS = [
  {
    p: "Olvidé mi contraseña",
    r: "Pídele al administrador que te asigne una nueva. Al entrar, el sistema te pedirá cambiarla por una tuya.",
  },
  {
    p: "Mi cuenta quedó bloqueada",
    r: "Después de 5 intentos fallidos la cuenta se bloquea 15 minutos. Espera o pide al administrador que la desbloquee.",
  },
  {
    p: "Me apareció “Tu sesión está por cerrarse”",
    r: "Si no usas el sistema por un rato, la sesión se cierra para proteger la información. Pulsa “Seguir conectado” para continuar.",
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
    p: "No me deja entregar el vehículo",
    r: "Faltan fotos de evidencia: se necesitan las de llegada, reparación y final. Entra a Evidencia fotográfica en el menú, elige el vehículo y súbelas.",
  },
  {
    p: "No aparece mi vehículo en Evidencia fotográfica",
    r: "Las fotos se toman en Reparación: primero administración debe atender la orden de compra (si el diagnóstico tiene refacciones).",
  },
  {
    p: "No puedo atender una solicitud",
    r: "Si la unidad ya está en el taller (tiene un servicio sin entregar) o está dada de baja, no se puede abrir otro servicio.",
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
