// src/utils/solicitudPdf.js
// "VALE DE ALMACÉN DE COMBUSTIBLE Y LUBRICANTES" tal cual el formato del
// municipio (en blanco y negro, letra tipo Times, como la orden de compra):
// folio, fecha, factura y proveedor; área, vehículo, maquinaria e inventario;
// tabla de cantidad, unidad, concepto, precio unitario y total; firmas del
// solicitante y del mecánico responsable (sin la del responsable del almacén).
// Lo que no se tenga (factura, proveedor, precios) queda en blanco.
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { MARGEN, pesos, aFecha, cantidad, logos, pie } from "./pdfComun";

const NEGRO = [0, 0, 0];
const SOMBRA = [215, 215, 215]; // encabezados grises como en el papel
const RENGLONES = 14;
const FUENTE = "times";

/**
 * @param {object} p  solicitud tal como la regresa /api/peticiones (o /api/area/.../formato)
 * @param {Window} [ventana]  pestaña ya abierta donde mostrarlo para imprimir; sin ella, se descarga
 */
export async function descargarSolicitudPdf(p, ventana) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const ancho = doc.internal.pageSize.getWidth();
  const der = ancho - MARGEN;
  const util = ancho - MARGEN * 2;
  const v = p.vehiculo || {};

  const texto = (t, x, y, { negrita = true, tam = 10.5, alinear = "left" } = {}) => {
    doc.setFont(FUENTE, negrita ? "bold" : "normal");
    doc.setFontSize(tam);
    doc.setTextColor(...NEGRO);
    doc.text(String(t ?? ""), x, y, { align: alinear });
  };
  // Etiqueta en negritas y su valor enseguida, en letra normal
  const campo = (etiqueta, valor, x, y, maxAncho) => {
    texto(etiqueta, x, y);
    const w = doc.getTextWidth(etiqueta) + 1.5;
    doc.setFont(FUENTE, "normal");
    const lineas = doc.splitTextToSize(String(valor || ""), Math.max(10, maxAncho - w));
    texto(lineas[0] || "", x + w, y, { negrita: false });
  };
  const linea = (x1, y1, x2, y2, grosor = 0.3) => {
    doc.setDrawColor(...NEGRO);
    doc.setLineWidth(grosor);
    doc.line(x1, y1, x2, y2);
  };

  // ─── Encabezado ───
  await logos(doc); // incluye la línea amarilla bajo los logotipos
  texto("MUNICIPIO DE ATLACOMULCO", ancho / 2, 37, { tam: 12, alinear: "center" });
  texto("VALLE DE ALMACÉN DE", ancho / 2, 42.5, { tam: 12, alinear: "center" });
  texto("COMBUSTIBLE Y LUBRICANTES", ancho / 2, 48, { tam: 12, alinear: "center" });

  // ─── Datos del vale (izq.) y de la unidad (der.) ───
  let y = 54;
  const fila = 6.2;
  const mitad = MARGEN + util * 0.5;
  doc.setDrawColor(...NEGRO);
  doc.setLineWidth(0.35);
  doc.rect(MARGEN, y, util, fila * 4);
  for (let i = 1; i < 4; i++) linea(MARGEN, y + fila * i, der, y + fila * i);
  linea(mitad, y, mitad, y + fila * 4);

  const fecha = p.fecha ? aFecha(p.fecha) : null;
  const fechaTxt = fecha
    ? `${String(fecha.getDate()).padStart(2, "0")}/${String(fecha.getMonth() + 1).padStart(2, "0")}/${fecha.getFullYear()}`
    : "";
  // Marca, modelo y número económico (o el nombre de la unidad si no tiene)
  const identificador = v.numeroEconomico || (v.nombre !== v.noInventario ? v.nombre : "");
  const vehiculo = [v.marca, v.modelo, identificador].filter(Boolean).join(" ") || v.nombre;
  const izq = [["FOLIO:", p.folio], ["FECHA:", fechaTxt], ["NO. DE FACTURA:", ""], ["PROVEEDOR:", ""]];
  const derecha = [
    ["ÁREA:", p.area || v.area],
    ["VEHÍCULO:", vehiculo],
    ["MAQUINARIA:", ""],
    ["NO. DE INVENTARIO:", v.noInventario],
  ];
  izq.forEach(([e, val], i) => campo(e, val, MARGEN + 1.5, y + fila * i + 4.4, mitad - MARGEN - 3));
  derecha.forEach(([e, val], i) => campo(e, val, mitad + 1.5, y + fila * i + 4.4, der - mitad - 3));
  y += fila * 4 + 5;

  // ─── Materiales (siempre con los renglones del formato) ───
  const cuerpo = (p.materiales || []).map((m) => [
    cantidad(m.cantidad),
    m.unidad_medida,
    m.concepto,
    m.precio_unitario != null ? pesos(m.precio_unitario) : "",
    m.total != null ? pesos(m.total) : "",
  ]);
  while (cuerpo.length < RENGLONES) cuerpo.push(["", "", "", "", ""]);

  autoTable(doc, {
    startY: y,
    theme: "grid",
    margin: { left: MARGEN, right: MARGEN },
    head: [["CANTIDAD", "UNIDAD DE\nMEDIDA", "CONCEPTO", "PRECIO\nUNITARIO", "TOTAL"]],
    body: cuerpo,
    foot: [[{ content: "TOTAL", colSpan: 4, styles: { halign: "right" } }, p.total != null ? pesos(p.total) : ""]],
    showFoot: "lastPage",
    styles: {
      font: FUENTE, fontSize: 9.5, textColor: NEGRO, lineColor: NEGRO, lineWidth: 0.3,
      cellPadding: { top: 0.8, bottom: 0.8, left: 1.5, right: 1.5 }, minCellHeight: 6, valign: "middle",
    },
    headStyles: { fillColor: SOMBRA, textColor: NEGRO, fontStyle: "bold", fontSize: 8.5, halign: "center" },
    footStyles: { fillColor: [255, 255, 255], textColor: NEGRO, fontStyle: "bold", fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 22, halign: "center" },
      1: { cellWidth: 24, halign: "center" },
      3: { cellWidth: 28, halign: "right" },
      4: { cellWidth: 28, halign: "right" },
    },
    didParseCell: (data) => {
      if (data.section === "foot" && data.column.index === 4) data.cell.styles.halign = "right";
    },
  });
  y = doc.lastAutoTable.finalY + 14;

  // ─── Firmas: solicitante | mecánico responsable ───
  const altoFirmas = 40;
  if (y + altoFirmas > doc.internal.pageSize.getHeight() - 18) {
    doc.addPage();
    y = 25;
  }
  const anchoF = 70;
  const firma = (centro, titulo, img, nombre) => {
    texto(titulo, centro, y, { tam: 10.5, alinear: "center" });
    texto("NOMBRE Y FIRMA", centro, y + 5, { tam: 10.5, alinear: "center" });
    if (img) {
      try {
        doc.addImage(img, "PNG", centro - 25, y + 8, 50, 16);
      } catch {
        // firma dañada: queda el espacio para firmar a mano
      }
    }
    linea(centro - anchoF / 2, y + 26, centro + anchoF / 2, y + 26);
    if (nombre) texto(nombre, centro, y + 31, { negrita: false, tam: 10, alinear: "center" });
  };
  firma(MARGEN + util / 4, "SOLICITANTE", p.solicitante_firma, p.solicitante_nombre);
  firma(MARGEN + (util * 3) / 4, "MECÁNICO RESPONSABLE", p.mecanico_firma, p.mecanico_nombre);

  pie(doc);
  if (ventana) ventana.location.href = doc.output("bloburl");
  else doc.save(`solicitud_${p.folio || p.id}.pdf`);
}
