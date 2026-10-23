// src/pages/AvisoPrivacidad.jsx
// AVISO DE PRIVACIDAD (público). BORRADOR: el texto debe revisarlo la Unidad de
// Transparencia del Ayuntamiento antes de publicarse como definitivo. Los datos
// entre corchetes [ ] están por confirmar.
import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import EncabezadoPublico from "../components/publico/EncabezadoPublico";
import PiePublico from "../components/publico/PiePublico";

const ACTUALIZACION = "22 de octubre de 2026";

// Dato pendiente de confirmar: se resalta para que no pase desapercibido
const Pendiente = ({ children }) => (
  <mark className="bg-amber-100 text-amber-900 rounded px-1">[{children}]</mark>
);

export default function AvisoPrivacidad() {
  useEffect(() => window.scrollTo(0, 0), []);

  return (
    <div className="min-h-screen flex flex-col bg-fondo font-sans text-slate-800">
      <EncabezadoPublico />

      <main className="flex-1 py-12 sm:py-16">
        <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <TriangleAlert size={18} className="shrink-0 mt-0.5" />
            <p>
              <b>Borrador.</b> Este aviso está pendiente de revisión y aprobación por la Unidad de
              Transparencia del H. Ayuntamiento de Atlacomulco. Los datos entre corchetes están por confirmar.
            </p>
          </div>

          <div className="mt-8 bg-white rounded-lg border border-slate-200 p-6 sm:p-10">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Aviso de privacidad integral</h1>
            <p className="mt-2 text-sm text-slate-500">Sistema de Control de Parque Vehicular · Última actualización: {ACTUALIZACION}</p>

            <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-slate-700">
              <Seccion titulo="1. Responsable del tratamiento">
                <p>
                  El H. Ayuntamiento de Atlacomulco, Estado de México, por conducto de la Coordinación de Parque
                  Vehicular, con domicilio en <Pendiente>domicilio de la Coordinación</Pendiente>, es el responsable
                  del tratamiento de los datos personales que se recaban en el Sistema de Control de Parque Vehicular.
                </p>
              </Seccion>

              <Seccion titulo="2. Datos personales que se recaban">
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Del personal con cuenta en el sistema: nombre de usuario y, en su caso, nombre completo y correo electrónico institucional.</li>
                  <li>Nombre y firma autógrafa digitalizada de quien solicita el servicio, de quien recibe la unidad en el taller y de quien elabora y autoriza la orden de compra.</li>
                  <li>Nombre del operador de la unidad al momento de su entrega.</li>
                  <li>Nombre de la persona que recibe herramientas en préstamo.</li>
                  <li>Fotografías de las unidades como evidencia del servicio, en las que podrían aparecer personas de manera incidental.</li>
                  <li>Registro de actividad dentro del sistema (usuario, fecha y hora de cada acción).</li>
                </ul>
                <p className="mt-3">No se recaban datos personales sensibles.</p>
              </Seccion>

              <Seccion titulo="3. Finalidades del tratamiento">
                <p>Los datos personales se utilizan para:</p>
                <ul className="mt-2 list-disc pl-5 space-y-1.5">
                  <li>Registrar, atender y dar seguimiento a las solicitudes de servicio de los vehículos municipales.</li>
                  <li>Acreditar la solicitud, recepción, autorización y entrega en los formatos del taller.</li>
                  <li>Integrar las órdenes de compra de refacciones y el control del préstamo de herramientas.</li>
                  <li>Identificar a las personas usuarias y proteger el acceso a sus cuentas.</li>
                  <li>Elaborar reportes e historiales del parque vehicular.</li>
                </ul>
              </Seccion>

              <Seccion titulo="4. Fundamento legal">
                <p>
                  El tratamiento se realiza con fundamento en la legislación aplicable en materia de protección de
                  datos personales en posesión de sujetos obligados, tanto general como del Estado de México y
                  Municipios, así como en las atribuciones del Ayuntamiento previstas en la Ley Orgánica Municipal del
                  Estado de México. <Pendiente>artículos específicos que indique la Unidad de Transparencia</Pendiente>
                </p>
              </Seccion>

              <Seccion titulo="5. Transferencia de datos">
                <p>
                  Los datos personales no se transfieren a terceros, salvo las transferencias necesarias para atender
                  requerimientos de información de una autoridad competente que estén debidamente fundados y motivados.
                </p>
              </Seccion>

              <Seccion titulo="6. Conservación">
                <p>
                  Los datos se conservan durante el tiempo necesario para cumplir las finalidades descritas y
                  conforme a los plazos de conservación del archivo municipal.
                </p>
              </Seccion>

              <Seccion titulo="7. Derechos ARCO">
                <p>
                  Usted puede ejercer sus derechos de acceso, rectificación, cancelación y oposición (ARCO), así como
                  la portabilidad de sus datos, ante la Unidad de Transparencia del H. Ayuntamiento de Atlacomulco,
                  ubicada en <Pendiente>domicilio de la Unidad de Transparencia</Pendiente>, teléfono{" "}
                  <Pendiente>teléfono</Pendiente>, correo <Pendiente>correo electrónico</Pendiente>, o por medio de la
                  Plataforma Nacional de Transparencia.
                </p>
              </Seccion>

              <Seccion titulo="8. Cambios al aviso de privacidad">
                <p>
                  Cualquier cambio a este aviso de privacidad se publicará en esta misma página, indicando la fecha
                  de la última actualización.
                </p>
              </Seccion>
            </div>
          </div>
        </article>
      </main>

      <PiePublico />
    </div>
  );
}

function Seccion({ titulo, children }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-900">{titulo}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
