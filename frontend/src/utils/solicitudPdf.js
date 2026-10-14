// src/utils/solicitudPdf.js
// Formato imprimible de una solicitud de área: datos, materiales y las firmas
// del solicitante (quien entrega) y del mecánico responsable (quien recibe).
// Se genera cuando ya tiene las dos firmas (el mecánico firma al pulsar "Atender").
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import {
  GUINDA, TINTA, GRIS, MARGEN, pesos, aFecha, encabezado, pie, bloqueFirma,
} from "./pdfComun";

/** @param {object} p  solicitud tal como la regresa /api/peticiones */
export async function descargarSolicitudPdf(p) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const v = p.vehiculo || {};

  let y = await encabezado(doc, { titulo: "Solicitud de servicio vehicular", folio: p.folio || "" });

  // ─── Datos generales ───
  const fecha = p.fecha ? aFecha(p.fecha) : null;
  autoTable(doc, {
    startY: y,
    theme: "grid",
    margin: { left: MARGEN, right: MARGEN },
    styles: { fontSize: 9.5, cellPadding: 2.2, textColor: TINTA, lineColor: [226, 232, 240], lineWidth: 0.1 },
    columnStyles: {
      0: { textColor: GRIS, cellWidth: 32 }, 1: { fontStyle: "bold" },
      2: { textColor: GRIS, cellWidth: 32 }, 3: { fontStyle: "bold" },
    },
    body: [
      ["Fecha", fecha ? fecha.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" }) : "—",
        "Hora", fecha ? fecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : "—"],
      ["Área", p.area || "—", "Vehículo", v.nombre || "—"],
      ["Marca / modelo", [v.marca, v.modelo].filter(Boolean).join(" ") || "—", "Placas", v.placas || "—"],
      ["No. inventario", v.noInventario || "—", "Recibida en taller",
        p.recibida_at ? aFecha(p.recibida_at).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" }) : "—"],
    ],
  });
  y = doc.lastAutoTable.finalY + 8;

  // ─── Materiales ───
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...GUINDA);
  doc.text("Materiales solicitados", MARGEN, y);
  const derecha = { halign: "right" };
  autoTable(doc, {
    startY: y + 3,
    margin: { left: MARGEN, right: MARGEN },
    head: [["Cant.", "Unidad", "Concepto", "P. unitario", "Total"]],
    body: (p.materiales || []).map((m) => [
      Number(m.cantidad).toLocaleString("es-MX", { maximumFractionDigits: 2 }),
      m.unidad_medida,
      m.concepto,
      m.precio_unitario != null ? pesos(m.precio_unitario) : "—",
      m.total != null ? pesos(m.total) : "—",
    ]),
    foot: [[
      { content: "Total", colSpan: 4, styles: { halign: "right" } },
      { content: p.total != null ? pesos(p.total) : "—", styles: { halign: "right" } },
    ]],
    styles: { fontSize: 9, cellPadding: 2.2, textColor: TINTA, lineColor: [226, 232, 240], lineWidth: 0.1 },
    headStyles: { fillColor: GUINDA, textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: [248, 250, 252], textColor: TINTA, fontStyle: "bold" },
    columnStyles: { 0: { ...derecha, cellWidth: 16 }, 1: { cellWidth: 24 }, 3: { ...derecha, cellWidth: 28 }, 4: { ...derecha, cellWidth: 28 } },
    didParseCell: (data) => {
      if (data.section === "head" && [0, 3, 4].includes(data.column.index)) data.cell.styles.halign = "right";
    },
  });
  y = doc.lastAutoTable.finalY + 20;

  // ─── Firmas: solicitante (entrega) y mecánico responsable (recibe) ───
  const anchoFirma = 70;
  const altoFirma = 26;
  if (y + altoFirma + 22 > alto - 18) {
    doc.addPage();
    y = 30;
  }
  const columna = (ancho - MARGEN * 2) / 2;
  bloqueFirma(doc, {
    centro: MARGEN + columna / 2, y, anchoFirma, altoFirma,
    titulo: "SOLICITA", firma: p.solicitante_firma, nombre: p.solicitante_nombre,
    leyenda: `Nombre y firma del solicitante${p.area ? ` · ${p.area}` : ""}`,
  });
  bloqueFirma(doc, {
    centro: MARGEN + columna * 1.5, y, anchoFirma, altoFirma,
    titulo: "RECIBE", firma: p.mecanico_firma, nombre: p.mecanico_nombre,
    leyenda: "Nombre y firma del mecánico responsable",
  });

  pie(doc);
  doc.save(`solicitud_${p.folio || p.id}.pdf`);
}
