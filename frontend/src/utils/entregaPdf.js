// src/utils/entregaPdf.js
// Formato "COORDINACIÓN DEL PARQUE VEHICULAR · ENTREGA DE VEHÍCULO Y/O
// MAQUINARIA REPARADA" (igual al de papel): datos de la unidad, trabajo
// realizado, observaciones, quién solicitó el servicio y quién autoriza.
// No lleva firmas.
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { TINTA, GRIS, MARGEN, fechaLarga, logos, pie } from "./pdfComun";
import { AUTORIZA } from "../config/ordenCompra";

const NEGRO = [15, 23, 42];

/** @param {object} s  servicio tal como lo regresa /api/solicitudes/<id> */
export async function descargarEntregaPdf(s) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const ancho = doc.internal.pageSize.getWidth();
  const util = ancho - MARGEN * 2;
  const ing = s.ingreso || {};
  const p = s.peticion || {};
  const nombre = s.vehiculo?.numeroEconomico || s.vehiculo?.unidad || s.vehiculo?.noInventario;

  // ─── Encabezado ───
  await logos(doc); // incluye la línea amarilla bajo los logotipos
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NEGRO);
  doc.setFontSize(11);
  doc.text("COORDINACIÓN DEL PARQUE VEHICULAR", ancho / 2, 36, { align: "center" });
  doc.text("ENTREGA DE VEHÍCULO Y/O MAQUINARIA REPARADA", ancho / 2, 41.5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRIS);
  doc.text(s.folio || "", ancho - MARGEN, 41.5, { align: "right" });

  const borde = { lineColor: NEGRO, lineWidth: 0.25 };
  const etiqueta = { fontStyle: "bold", fontSize: 8.5, cellWidth: 45 };

  // ─── Datos de la unidad (dos columnas, como el formato) ───
  autoTable(doc, {
    startY: 46,
    theme: "grid",
    margin: { left: MARGEN, right: MARGEN },
    styles: { fontSize: 9, cellPadding: 1.8, textColor: NEGRO, ...borde },
    columnStyles: { 0: etiqueta, 1: { cellWidth: util / 2 - 45 }, 2: { ...etiqueta, cellWidth: 34, halign: "right" } },
    body: [
      ["NO. INVENTARIO:", ing.no_inventario || "", "FECHA ENTREGA:", fechaLarga(s.fecha_entrega)],
      ["VEHÍCULO/MAQUINARIA:", ing.unidad || nombre || "", "ÁREA:", ing.area || ""],
      ["NO. SERIE:", ing.serie || "", "MODELO:", ing.modelo || ""],
      ["COLOR:", ing.color || "", "PLACAS:", ing.placas || ""],
      ["MARCA:", ing.marca || "", "OPERADOR:", s.operador || ""],
      ["FECHA DE RECEPCIÓN:", { content: fechaLarga(s.fecha_ingreso), colSpan: 3 }],
    ],
  });
  let y = doc.lastAutoTable.finalY;

  // ─── Trabajo realizado y observaciones: renglones como en el papel ───
  const renglones = (titulo, texto, minimo) => {
    doc.setFontSize(9.5);
    const lineas = doc.splitTextToSize(texto || "", util - 6);
    const n = Math.max(minimo, lineas.length);
    const alto = 7;
    doc.setDrawColor(...NEGRO);
    doc.setLineWidth(0.25);
    doc.rect(MARGEN, y, util, alto * (n + 1));
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NEGRO);
    doc.text(titulo, ancho / 2, y + 4.8, { align: "center" });
    doc.setFont("helvetica", "normal");
    for (let i = 1; i <= n; i++) {
      doc.line(MARGEN, y + alto * i, ancho - MARGEN, y + alto * i);
      if (lineas[i - 1]) doc.text(lineas[i - 1], MARGEN + 3, y + alto * i + 4.8);
    }
    y += alto * (n + 1);
  };
  renglones("TRABAJO REALIZADO:", s.acciones, 8);
  renglones("OBSERVACIONES", s.observaciones, 5);

  // ─── Área y autorización (sin firmas) ───
  if (y + 18 > doc.internal.pageSize.getHeight() - 18) {
    doc.addPage();
    y = 20;
  }
  y += 8;
  const dato = (etiqueta, valor) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...NEGRO);
    doc.text(etiqueta, MARGEN, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TINTA);
    doc.text(doc.splitTextToSize(valor || "—", util - 30), MARGEN + 30, y);
    y += 6;
  };
  dato("Área (solicitó):", [p.solicitante_nombre, s.ingreso?.area || s.vehiculo?.area].filter(Boolean).join(" — "));
  dato("Autorizó:", `${AUTORIZA.nombre}, ${AUTORIZA.cargo}`);

  pie(doc);
  doc.save(`entrega_${s.folio || s.id}.pdf`);
}
