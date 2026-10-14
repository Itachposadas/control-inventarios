// src/utils/ordenCompraPdf.js
// "ORDEN DE COMPRA" tal cual el formato del municipio (en blanco y negro,
// letra tipo Times): fecha, número de orden y hoja; datos de la unidad; datos
// del proveedor y del cliente; tabla de artículos con renglones; subtotal,
// I.V.A. y total; adicionales; firmas de Mecánico/Almacén y Autorizó.
// Lo que no se tenga (ej. precios para parque vehicular) queda en blanco.
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { MARGEN, pesos, aFecha, cantidad, logos, pie } from "./pdfComun";
import { DATOS_CLIENTE, AUTORIZA } from "../config/ordenCompra";

const NEGRO = [0, 0, 0];
const GRIS = [120, 120, 120];
const RENGLONES = 15; // renglones de la tabla (en papel son 17; así cabe todo en una hoja)
const FUENTE = "times";

/** @param {object} o  orden tal como la regresa /api/ordenes-compra */
export async function descargarOrdenCompraPdf(o) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const ancho = doc.internal.pageSize.getWidth();
  const der = ancho - MARGEN;
  const util = ancho - MARGEN * 2;
  const v = o.vehiculo || {};
  const p = o.proveedor || {};

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
  await logos(doc);
  doc.setDrawColor(...GRIS);
  doc.setLineWidth(0.3);
  doc.line(MARGEN, 30, der, 30);
  texto("ORDEN DE COMPRA", ancho / 2, 40, { tam: 14, alinear: "center" });

  // Fecha (en recuadro), número de orden y hoja, alineados a la derecha
  const fecha = o.fecha ? aFecha(o.fecha) : null;
  const dd = fecha ? String(fecha.getDate()).padStart(2, "0") : "";
  const mm = fecha ? String(fecha.getMonth() + 1).padStart(2, "0") : "";
  const aa = fecha ? String(fecha.getFullYear()) : "";
  const cajaX = der - 48;
  doc.setDrawColor(...NEGRO);
  doc.setLineWidth(0.3);
  doc.rect(cajaX, 43.5, 48, 6);
  texto("Fecha:", cajaX - 2, 48, { alinear: "right" });
  texto(`${dd}  /  ${mm}  /  ${aa}`, cajaX + 24, 48, { negrita: false, alinear: "center" });

  texto("Número de orden de compra:", der - 26, 54.5, { alinear: "right" });
  texto(o.folio || "", der - 13, 54, { negrita: false, tam: 9.5, alinear: "center" });
  linea(der - 25, 55.2, der, 55.2, 0.25);

  texto("Hoja no.", der - 41, 60.5, { alinear: "right" });
  texto(o.hoja_no || "", der - 33.5, 60, { negrita: false, alinear: "center" });
  linea(der - 40, 61.2, der - 27, 61.2, 0.25);
  texto("de", der - 22, 60.5, { alinear: "center" });
  texto(o.hoja_total || "", der - 9, 60, { negrita: false, alinear: "center" });
  linea(der - 17, 61.2, der, 61.2, 0.25);

  // ─── Datos de la unidad ───
  let y = 64;
  const fila = 5.9;
  const mitad = MARGEN + util * 0.5;
  doc.setDrawColor(...NEGRO);
  doc.setLineWidth(0.35);
  doc.rect(MARGEN, y, util, fila * 3);
  for (let i = 1; i < 3; i++) linea(MARGEN, y + fila * i, der, y + fila * i);
  linea(mitad, y, mitad, y + fila * 3);
  const izq = [
    ["Área Solicitante:", v.area],
    ["Vehículo/ Maquinaria:", v.unidad || v.nombre],
    ["Modelo:", [v.marca, v.modelo].filter(Boolean).join(" ")],
  ];
  const derecha = [["No. Inventario:", v.no_inventario], ["No. Serie:", v.serie], ["Placas:", v.placas]];
  izq.forEach(([e, val], i) => campo(e, val, MARGEN + 1.5, y + fila * i + 4.3, mitad - MARGEN - 3));
  derecha.forEach(([e, val], i) => campo(e, val, mitad + 1.5, y + fila * i + 4.3, der - mitad - 3));
  y += fila * 3 + 4;

  // ─── Proveedor y cliente ───
  const filas = 5;
  const corte = MARGEN + util * 0.46;
  doc.setDrawColor(...NEGRO);
  doc.setLineWidth(0.35);
  doc.rect(MARGEN, y, util, fila * filas);
  for (let i = 1; i < filas; i++) linea(MARGEN, y + fila * i, der, y + fila * i);
  linea(corte, y, corte, y + fila * filas);

  // El nombre del proveedor puede seguir en el renglón de abajo (como en el papel)
  doc.setFont(FUENTE, "bold");
  doc.setFontSize(10.5);
  const etiquetaNombre = "Nombre/Razón Social:";
  const wNombre = doc.getTextWidth(etiquetaNombre) + 1.5;
  doc.setFont(FUENTE, "normal");
  const nombreProv = doc.splitTextToSize(p.nombre || "", corte - MARGEN - 3 - wNombre);
  const resto = doc.splitTextToSize(nombreProv.slice(1).join(" "), corte - MARGEN - 3);
  const yy = (i) => y + fila * i + 4.3;
  texto("Datos del Proveedor:", MARGEN + 1.5, yy(0));
  texto(etiquetaNombre, MARGEN + 1.5, yy(1));
  texto(nombreProv[0] || "", MARGEN + 1.5 + wNombre, yy(1), { negrita: false });
  texto(resto[0] || "", MARGEN + 1.5, yy(2), { negrita: false });
  campo("Dirección:", p.direccion, MARGEN + 1.5, yy(3), corte - MARGEN - 3);
  campo("Teléfono:", p.telefono, MARGEN + 1.5, yy(4), corte - MARGEN - 3);

  [
    ["Datos del Cliente:", ""],
    ["Nombre:", DATOS_CLIENTE.nombre],
    ["Dirección:", DATOS_CLIENTE.direccion],
    ["Municipio:", DATOS_CLIENTE.municipio],
    ["Teléfono:", DATOS_CLIENTE.telefono],
  ].forEach(([e, val], i) => {
    texto(e, corte + 1.5, yy(i));
    if (val) texto(val, corte + 1.5 + doc.getTextWidth(e) + 1.5, yy(i));
  });
  y += fila * filas + 5;

  // ─── Artículos (siempre con los renglones del formato) ───
  const cuerpo = (o.piezas || []).map((r, i) => [
    i + 1,
    cantidad(r.cantidad),
    r.unidad_medida,
    r.concepto,
    r.precio_unitario != null ? pesos(r.precio_unitario) : "",
    r.importe != null ? pesos(r.importe) : "",
  ]);
  while (cuerpo.length < RENGLONES) cuerpo.push(["", "", "", "", "", ""]);

  const anchoImporte = 25;
  autoTable(doc, {
    startY: y,
    theme: "grid",
    margin: { left: MARGEN, right: MARGEN },
    head: [["N.P.\nARTÍCULO\n#", "CANTIDAD", "UNIDAD\nDE\nMEDIDA", "DESCRIPCIÓN", "PRECIO\nUNITARIO", "IMPORTE"]],
    body: cuerpo,
    styles: {
      font: FUENTE, fontSize: 8.5, textColor: NEGRO, lineColor: NEGRO, lineWidth: 0.3,
      cellPadding: { top: 0.5, bottom: 0.5, left: 1.5, right: 1.5 }, minCellHeight: 4.9, valign: "middle",
    },
    headStyles: { fillColor: [255, 255, 255], textColor: NEGRO, fontStyle: "bold", fontSize: 7.5, halign: "center", valign: "top" },
    columnStyles: {
      0: { cellWidth: 20, halign: "center" },
      1: { cellWidth: 21, halign: "center" },
      2: { cellWidth: 18, halign: "center" },
      4: { cellWidth: 21, halign: "right" },
      5: { cellWidth: anchoImporte, halign: "right" },
    },
  });
  y = doc.lastAutoTable.finalY;

  // ─── Subtotal, I.V.A. y Total (cajas bajo "IMPORTE") ───
  // Totales, adicionales y firmas ocupan unos 52 mm
  if (y + 52 > doc.internal.pageSize.getHeight() - 16) {
    doc.addPage();
    y = 20;
  }
  const cajaH = 6;
  const cajaIzq = der - anchoImporte;
  [["Subtotal:", o.subtotal], ["I.V.A.:", o.iva], ["Total:", o.total]].forEach(([e, valor], i) => {
    const yc = y + cajaH * i;
    doc.setDrawColor(...NEGRO);
    doc.setLineWidth(0.3);
    doc.rect(cajaIzq, yc, anchoImporte, cajaH);
    texto(e, cajaIzq - 2, yc + 4.5, { tam: 11, alinear: "right" });
    if (valor != null) texto(pesos(valor), der - 1.5, yc + 4.3, { negrita: false, tam: 9, alinear: "right" });
  });

  // ─── Adicionales (dos renglones) ───
  const yAd = y + 9;
  texto("Adicionales:", MARGEN, yAd, { tam: 11 });
  const xAd = MARGEN + 25;
  const finAd = MARGEN + util * 0.62;
  linea(xAd, yAd + 0.8, finAd, yAd + 0.8, 0.25);
  linea(MARGEN, yAd + 7, finAd, yAd + 7, 0.25);
  doc.setFont(FUENTE, "normal");
  doc.setFontSize(10);
  const ad = doc.splitTextToSize(o.adicionales || "", finAd - xAd);
  texto(ad[0] || "", xAd + 1, yAd - 0.2, { negrita: false, tam: 10 });
  if (ad.length > 1) {
    texto(doc.splitTextToSize(ad.slice(1).join(" "), finAd - MARGEN)[0], MARGEN + 1, yAd + 6, { negrita: false, tam: 10 });
  }

  // ─── Firmas: Mecánico/Almacén | Autorizó ───
  const yF = y + cajaH * 3 + 6;
  const anchoF = util * 0.74;
  const xF = MARGEN + (util - anchoF) / 2 + 6;
  const medio = xF + anchoF / 2;
  const altoEnc = 7;
  const altoCuerpo = 24;
  doc.setDrawColor(...NEGRO);
  doc.setLineWidth(0.35);
  doc.rect(xF, yF, anchoF, altoEnc + altoCuerpo);
  linea(xF, yF + altoEnc, xF + anchoF, yF + altoEnc);
  linea(medio, yF, medio, yF + altoEnc + altoCuerpo);
  const cMec = xF + anchoF / 4;
  const cAut = xF + (anchoF * 3) / 4;
  texto("Mecánico/Almacén", cMec, yF + 5, { tam: 11, alinear: "center" });
  texto("Autorizó", cAut, yF + 5, { tam: 11, alinear: "center" });

  const firma = (img, centro) => {
    if (!img) return;
    try {
      doc.addImage(img, "PNG", centro - 21, yF + altoEnc + 1, 42, 13);
    } catch {
      // firma dañada: queda el espacio para firmar a mano
    }
  };
  firma(o.mecanico_firma, cMec);
  firma(o.autoriza_firma, cAut);
  if (o.mecanico_nombre) texto(o.mecanico_nombre, cMec, yF + altoEnc + 16.5, { negrita: false, tam: 9.5, alinear: "center" });
  texto("Nombre completo y firma", cMec, yF + altoEnc + 21.5, { tam: 10, alinear: "center" });
  texto(o.autoriza_nombre || AUTORIZA.nombre, cAut, yF + altoEnc + 16.5, { tam: 10, alinear: "center" });
  texto(AUTORIZA.cargo, cAut, yF + altoEnc + 21.5, { tam: 10, alinear: "center" });

  pie(doc);
  doc.save(`orden-compra_${o.folio || o.id}.pdf`);
}
