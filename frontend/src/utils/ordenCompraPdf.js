// src/utils/ordenCompraPdf.js
// Formato "ORDEN DE COMPRA" del municipio: fecha, número de orden y hoja; datos
// de la unidad, del proveedor y del cliente; refacciones con precio e importe;
// subtotal, IVA y total; adicionales; firma del mecánico/almacén y quién autoriza.
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import {
  GUINDA, TINTA, GRIS, LINEA, MARGEN, pesos, aFecha, cantidad, encabezado, pie,
  saltoSiHaceFalta, bloqueFirma,
} from "./pdfComun";
import { DATOS_CLIENTE, AUTORIZA } from "../config/ordenCompra";

const estilos = { fontSize: 9, cellPadding: 1.8, textColor: TINTA, lineColor: LINEA, lineWidth: 0.1 };

/** @param {object} o  orden tal como la regresa /api/ordenes-compra */
export async function descargarOrdenCompraPdf(o) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const ancho = doc.internal.pageSize.getWidth();
  const v = o.vehiculo || {};
  const p = o.proveedor || {};

  let y = await encabezado(doc, { titulo: "ORDEN DE COMPRA", folio: o.folio || "" });

  // ─── Fecha, número de orden y hoja ───
  doc.setFontSize(9.5);
  doc.setTextColor(...TINTA);
  const fecha = o.fecha ? aFecha(o.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
  doc.text(
    [`Fecha: ${fecha}`, `Número de orden de compra: ${o.folio || "—"}`, `Hoja no. ${o.hoja_no || 1} de ${o.hoja_total || 1}`],
    ancho - MARGEN, y - 6, { align: "right" }
  );
  y += 8;

  // ─── Datos de la unidad ───
  const etiqueta = { textColor: GRIS, cellWidth: 38 };
  autoTable(doc, {
    startY: y,
    theme: "grid",
    margin: { left: MARGEN, right: MARGEN },
    styles: estilos,
    columnStyles: { 0: etiqueta, 1: { fontStyle: "bold" }, 2: { ...etiqueta, cellWidth: 28 }, 3: { fontStyle: "bold" } },
    body: [
      ["Área solicitante", v.area || "—", "No. inventario", v.no_inventario || "—"],
      ["Vehículo/Maquinaria", v.unidad || v.nombre || "—", "No. serie", v.serie || "—"],
      ["Modelo", [v.marca, v.modelo].filter(Boolean).join(" ") || "—", "Placas", v.placas || "—"],
    ],
  });
  y = doc.lastAutoTable.finalY + 4;

  // ─── Proveedor y cliente ───
  autoTable(doc, {
    startY: y,
    theme: "grid",
    margin: { left: MARGEN, right: MARGEN },
    styles: estilos,
    headStyles: { fillColor: [248, 250, 252], textColor: GUINDA, fontStyle: "bold" },
    columnStyles: { 0: { textColor: GRIS, cellWidth: 30 }, 2: { textColor: GRIS, cellWidth: 22 } },
    head: [[{ content: "Datos del proveedor", colSpan: 2 }, { content: "Datos del cliente", colSpan: 2 }]],
    body: [
      ["Nombre/Razón social", p.nombre || "", "Nombre", DATOS_CLIENTE.nombre],
      ["Dirección", p.direccion || "", "Dirección", DATOS_CLIENTE.direccion],
      ["Teléfono", p.telefono || "", "Municipio", DATOS_CLIENTE.municipio],
      ["", "", "Teléfono", DATOS_CLIENTE.telefono],
    ],
  });
  y = doc.lastAutoTable.finalY + 5;

  // ─── Refacciones ───
  const derecha = { halign: "right" };
  autoTable(doc, {
    startY: y,
    margin: { left: MARGEN, right: MARGEN },
    head: [["N.P. artículo #", "Cantidad", "Unidad de medida", "Descripción", "Precio unitario", "Importe"]],
    body: (o.piezas || []).map((r, i) => [
      i + 1,
      cantidad(r.cantidad),
      r.unidad_medida,
      r.concepto,
      r.precio_unitario != null ? pesos(r.precio_unitario) : "",
      r.importe != null ? pesos(r.importe) : "",
    ]),
    foot: [
      ["Subtotal", pesos(o.subtotal)],
      [`I.V.A. (${Number(o.iva_porcentaje ?? 0).toLocaleString("es-MX")}%)`, pesos(o.iva)],
      ["Total", pesos(o.total)],
    ].map(([t, valor]) => [
      { content: t, colSpan: 5, styles: { halign: "right" } },
      { content: valor, styles: { halign: "right" } },
    ]),
    showFoot: "lastPage",
    styles: { ...estilos, fontSize: 8.5, cellPadding: 2 },
    headStyles: { fillColor: GUINDA, textColor: 255, fontStyle: "bold", fontSize: 8 },
    footStyles: { fillColor: [248, 250, 252], textColor: TINTA, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 16, halign: "center" }, 1: { ...derecha, cellWidth: 18 }, 2: { cellWidth: 24 },
      4: { ...derecha, cellWidth: 26 }, 5: { ...derecha, cellWidth: 26 },
    },
  });
  y = doc.lastAutoTable.finalY + 6;

  // ─── Adicionales ───
  y = saltoSiHaceFalta(doc, y, 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...TINTA);
  doc.text("Adicionales:", MARGEN, y);
  doc.setFont("helvetica", "normal");
  const adicionales = doc.splitTextToSize(o.adicionales || "", ancho - MARGEN * 2 - 24);
  doc.text(adicionales.length ? adicionales : [""], MARGEN + 24, y);
  y += Math.max(1, adicionales.length) * 4.5 + 16;

  // ─── Firmas: Mecánico/Almacén y Autorizó ───
  const anchoFirma = 70;
  const altoFirma = 24;
  y = saltoSiHaceFalta(doc, y, altoFirma + 24);
  const columna = (ancho - MARGEN * 2) / 2;
  bloqueFirma(doc, {
    centro: MARGEN + columna / 2, y, anchoFirma, altoFirma,
    titulo: "MECÁNICO/ALMACÉN", firma: o.mecanico_firma, nombre: o.mecanico_nombre,
    leyenda: "Nombre completo y firma",
  });
  bloqueFirma(doc, {
    centro: MARGEN + columna * 1.5, y, anchoFirma, altoFirma,
    titulo: "AUTORIZÓ", firma: o.autoriza_firma, nombre: o.autoriza_nombre || AUTORIZA.nombre,
    leyenda: AUTORIZA.cargo,
  });

  pie(doc);
  doc.save(`orden-compra_${o.folio || o.id}.pdf`);
}
