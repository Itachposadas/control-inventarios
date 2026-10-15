// src/utils/entregaPdf.js
// Formato "COORDINACIÓN DEL PARQUE VEHICULAR · ENTREGA DE VEHÍCULO Y/O
// MAQUINARIA REPARADA" (igual al de papel): datos de la unidad, trabajo
// realizado, observaciones y las firmas:
//   MECÁNICO (quien entrega) · ÁREA (quien recibe: el solicitante) · AUTORIZÓ
// Las firmas se cargan de la solicitud y de la orden de compra; la que falte
// queda en blanco para firmarla a mano al imprimir.
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
  const o = s.orden_compra || {};
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

  // ─── Firmas: MECÁNICO · ÁREA · AUTORIZÓ ───
  const firmas = [
    {
      titulo: "MECÁNICO",
      firma: o.mecanico_firma || p.mecanico_firma,
      nombre: o.mecanico_nombre || p.mecanico_nombre,
      leyenda: ["Nombre y firma de quien entrega"],
    },
    {
      titulo: "ÁREA",
      firma: p.solicitante_firma,
      nombre: p.solicitante_nombre,
      leyenda: ["Nombre y firma de quien recibe"],
    },
    {
      titulo: "AUTORIZÓ",
      firma: o.autoriza_firma,
      nombre: o.autoriza_nombre || AUTORIZA.nombre,
      leyenda: [AUTORIZA.cargo],
      negrita: true,
    },
  ];
  const col = util / 3;
  const altoTitulo = 8;
  const altoCaja = 40;
  if (y + altoTitulo + altoCaja > doc.internal.pageSize.getHeight() - 18) {
    doc.addPage();
    y = 20;
  }
  doc.setDrawColor(...NEGRO);
  doc.setLineWidth(0.25);
  doc.rect(MARGEN, y, util, altoTitulo + altoCaja);
  doc.line(MARGEN, y + altoTitulo, ancho - MARGEN, y + altoTitulo);
  firmas.forEach((f, i) => {
    const x = MARGEN + col * i;
    const centro = x + col / 2;
    if (i > 0) doc.line(x, y, x, y + altoTitulo + altoCaja);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...NEGRO);
    doc.text(f.titulo, centro, y + 5.5, { align: "center" });

    const top = y + altoTitulo;
    if (f.firma) {
      try {
        doc.addImage(f.firma, "PNG", centro - 24, top + 2, 48, 17);
      } catch {
        // firma dañada: el espacio queda para firmar a mano
      }
    }
    doc.setDrawColor(...GRIS);
    doc.line(x + 6, top + 21, x + col - 6, top + 21);
    doc.setFont("helvetica", f.negrita ? "bold" : "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...NEGRO);
    if (f.nombre) doc.text(doc.splitTextToSize(f.nombre, col - 8), centro, top + 25.5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...TINTA);
    doc.text(f.leyenda, centro, top + 33, { align: "center" });
    doc.setDrawColor(...NEGRO);
  });

  pie(doc);
  doc.save(`entrega_${s.folio || s.id}.pdf`);
}
