// src/utils/entregaPdf.js
// "Formato de entrega de vehículo y/o maquinaria reparada": datos de la unidad,
// fechas de recepción y entrega, trabajo realizado y observaciones.
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { TINTA, GRIS, LINEA, MARGEN, fechaLarga, encabezado, pie, tituloSeccion, saltoSiHaceFalta } from "./pdfComun";

/** @param {object} s  servicio tal como lo regresa /api/solicitudes/<id> */
export async function descargarEntregaPdf(s) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const ancho = doc.internal.pageSize.getWidth();
  const ing = s.ingreso || {};
  const nombre = s.vehiculo?.numeroEconomico || s.vehiculo?.unidad || s.vehiculo?.noInventario;

  let y = await encabezado(doc, {
    titulo: "Formato de entrega de vehículo y/o maquinaria reparada",
    folio: s.folio || "",
  });

  const etiqueta = { textColor: GRIS, cellWidth: 36 };
  autoTable(doc, {
    startY: y,
    theme: "grid",
    margin: { left: MARGEN, right: MARGEN },
    styles: { fontSize: 9.5, cellPadding: 2.2, textColor: TINTA, lineColor: LINEA, lineWidth: 0.1 },
    columnStyles: { 0: etiqueta, 1: { fontStyle: "bold" }, 2: etiqueta, 3: { fontStyle: "bold" } },
    body: [
      ["No. inventario", ing.no_inventario || "—", "Fecha de entrega", fechaLarga(s.fecha_entrega)],
      ["Vehículo/Maquinaria", ing.unidad || nombre || "—", "Fecha de recepción", fechaLarga(s.fecha_ingreso)],
      ["No. serie", ing.serie || "—", "Área", ing.area || "—"],
      ["Marca", ing.marca || "—", "Modelo", ing.modelo || "—"],
      ["Placas", ing.placas || "—", "", ""],
    ],
  });
  y = doc.lastAutoTable.finalY + 10;

  const texto = (titulo, contenido) => {
    const lineas = doc.splitTextToSize(contenido || "—", ancho - MARGEN * 2 - 6);
    y = saltoSiHaceFalta(doc, y, 16);
    tituloSeccion(doc, titulo, y);
    y += 3;
    const alto = lineas.length * 4.8 + 6;
    doc.setDrawColor(...LINEA);
    doc.setLineWidth(0.2);
    doc.rect(MARGEN, y, ancho - MARGEN * 2, alto);
    doc.setFontSize(10);
    doc.setTextColor(...TINTA);
    doc.text(lineas, MARGEN + 3, y + 5.5);
    y += alto + 9;
  };
  texto("Trabajo realizado", s.acciones);
  texto("Observaciones", s.observaciones);

  pie(doc);
  doc.save(`entrega_${s.folio || s.id}.pdf`);
}
