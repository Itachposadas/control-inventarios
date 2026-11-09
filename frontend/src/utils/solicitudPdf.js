// src/utils/solicitudPdf.js
// Carta de solicitud de servicio que el área dirige al Coordinador de Parque
// Vehicular (en blanco y negro, letra tipo Times, como los demás formatos):
// lugar, fecha y hora; destinatario; datos de la unidad; la falla que presenta
// y el nombre de quien solicita. No lleva firmas.
// Las solicitudes anteriores al cambio no tienen descripción: se listan sus materiales.
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { MARGEN, aFecha, cantidad, logos, pie } from "./pdfComun";
import { AUTORIZA } from "../config/ordenCompra";
import { DIAS_LIMITE, fechaLimite } from "../config/espera";

const NEGRO = [0, 0, 0];
const SOMBRA = [215, 215, 215]; // encabezados grises como en el papel
const FUENTE = "times";
const INTERLINEA = 5.6;

/**
 * @param {object} p  solicitud tal como la regresa /api/peticiones (o /api/area/.../formato)
 * @param {Window} [ventana]  pestaña ya abierta donde mostrarlo para imprimir; sin ella, se descarga
 */
export async function descargarSolicitudPdf(p, ventana) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const der = ancho - MARGEN;
  const util = ancho - MARGEN * 2;
  const v = p.vehiculo || {};
  const area = p.area || v.area || "";

  const texto = (t, x, y, { negrita = false, tam = 11.5, alinear = "left" } = {}) => {
    doc.setFont(FUENTE, negrita ? "bold" : "normal");
    doc.setFontSize(tam);
    doc.setTextColor(...NEGRO);
    doc.text(String(t ?? ""), x, y, { align: alinear });
  };
  let y;
  // Párrafo con saltos de línea automáticos; pasa a otra hoja si no cabe
  const parrafo = (t, { negrita = false, sangria = 0 } = {}) => {
    doc.setFont(FUENTE, negrita ? "bold" : "normal");
    doc.setFontSize(11.5);
    const lineas = doc.splitTextToSize(String(t || ""), util - sangria);
    lineas.forEach((l) => {
      if (y > alto - 25) {
        doc.addPage();
        y = 25;
      }
      texto(l, MARGEN + sangria, y, { negrita });
      y += INTERLINEA;
    });
  };

  // ─── Encabezado ───
  await logos(doc); // incluye la línea amarilla bajo los logotipos
  texto("MUNICIPIO DE ATLACOMULCO", ancho / 2, 37, { negrita: true, tam: 12, alinear: "center" });
  texto("SOLICITUD DE SERVICIO", ancho / 2, 42.5, { negrita: true, tam: 12, alinear: "center" });

  // ─── Lugar, fecha, hora y folio ───
  const fecha = p.fecha ? aFecha(p.fecha) : new Date();
  const fechaTxt = fecha.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  const horaTxt = fecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  y = 54;
  texto(`Atlacomulco de Fabela, Méx., a ${fechaTxt}`, der, y, { alinear: "right" });
  texto(`Hora: ${horaTxt}`, der, y + INTERLINEA, { alinear: "right" });
  if (p.folio) texto(`Folio: ${p.folio}`, der, y + INTERLINEA * 2, { negrita: true, alinear: "right" });
  texto("ASUNTO: Solicitud de servicio vehicular", der, y + INTERLINEA * 3, { negrita: true, alinear: "right" });

  // ─── Destinatario ───
  y += INTERLINEA * 5.5;
  texto(AUTORIZA.nombre.toUpperCase(), MARGEN, y, { negrita: true });
  texto(AUTORIZA.cargo.toUpperCase(), MARGEN, y + INTERLINEA, { negrita: true });
  texto("P R E S E N T E", MARGEN, y + INTERLINEA * 2, { negrita: true });
  y += INTERLINEA * 4;

  // ─── Cuerpo ───
  parrafo(
    `Por medio de la presente, el área de ${area || "________________"} solicita de la manera más atenta ` +
    "el servicio de mantenimiento para la unidad que se describe a continuación:"
  );
  y += 2;

  const unidad = v.numeroEconomico || v.nombre || v.unidad || "";
  autoTable(doc, {
    startY: y,
    theme: "grid",
    margin: { left: MARGEN, right: MARGEN },
    body: [
      ["UNIDAD", unidad, "MARCA", v.marca || ""],
      ["MODELO", v.modelo || "", "PLACAS", v.placas || ""],
      ["NO. DE INVENTARIO", v.noInventario || "", "ÁREA", area],
    ],
    styles: {
      font: FUENTE, fontSize: 10.5, textColor: NEGRO, lineColor: NEGRO, lineWidth: 0.3,
      cellPadding: { top: 1.2, bottom: 1.2, left: 2, right: 2 }, valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 38, fontStyle: "bold", fillColor: SOMBRA },
      2: { cellWidth: 24, fontStyle: "bold", fillColor: SOMBRA },
    },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ─── Falla que presenta la unidad ───
  if (p.descripcion_falla) {
    parrafo("Falla que presenta la unidad:", { negrita: true });
    y += 1;
    String(p.descripcion_falla).split(/\n+/).forEach((renglon) => parrafo(renglon));
  } else if (p.materiales?.length) {
    // Solicitudes anteriores: lo que pidió el área
    parrafo("Materiales solicitados:", { negrita: true });
    y += 1;
    p.materiales.forEach((m) =>
      parrafo(`• ${cantidad(m.cantidad)} ${m.unidad_medida} — ${m.concepto}`, { sangria: 3 })
    );
  }
  y += 4;

  // Vigencia de la solicitud
  if (p.fecha) {
    const limite = fechaLimite(p.fecha).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
    parrafo(
      `La unidad deberá presentarse en el taller a más tardar el ${limite} (${DIAS_LIMITE} días naturales a partir ` +
      "de esta solicitud). De no presentarse en ese plazo, la solicitud se cancelará automáticamente."
    );
    y += 2;
  }

  parrafo("Sin otro particular, agradezco de antemano la atención a la presente.");

  // ─── Despedida y nombre de quien solicita (sin firma) ───
  y += 10;
  if (y > alto - 45) {
    doc.addPage();
    y = 30;
  }
  texto("A T E N T A M E N T E", ancho / 2, y, { negrita: true, alinear: "center" });
  y += INTERLINEA * 2.5;
  texto(p.solicitante_nombre || "", ancho / 2, y, { negrita: true, alinear: "center" });
  texto(area ? `Área de ${area}` : "", ancho / 2, y + INTERLINEA, { alinear: "center" });

  pie(doc);
  if (ventana) ventana.location.href = doc.output("bloburl");
  else doc.save(`solicitud_${p.folio || p.id}.pdf`);
}
