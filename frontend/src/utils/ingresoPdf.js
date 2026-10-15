// src/utils/ingresoPdf.js
// "FORMATO DE INGRESO A TALLER" tal cual el formato del municipio (en blanco y
// negro, letra tipo Times, como la orden de compra): fecha de ingreso y hoja;
// datos del vehículo/maquinaria; accesorios y herramientas (SI/NO en dos
// columnas); observaciones y las firmas. Lleva el dibujo del carro del papel.
// Firmas:
//   ÁREA (operador: el solicitante) · MECÁNICO (quien recibe) · AUTORIZÓ
// La firma que falte queda en blanco para firmarla a mano al imprimir.
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { MARGEN, aFecha, logos, pie, cargarImagen } from "./pdfComun";
import { AUTORIZA } from "../config/ordenCompra";
import { CHECKLIST_IZQUIERDA, CHECKLIST_DERECHA } from "../config/solicitudes";

const NEGRO = [0, 0, 0];
const GRIS = [120, 120, 120];
const FUENTE = "times";

/** @param {object} s  servicio tal como lo regresa /api/solicitudes/<id> */
export async function descargarIngresoPdf(s) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const ancho = doc.internal.pageSize.getWidth();
  const limite = doc.internal.pageSize.getHeight() - 18; // arriba del pie
  const der = ancho - MARGEN;
  const util = ancho - MARGEN * 2;
  const ing = s.ingreso || {};
  const p = s.peticion || {};
  const o = s.orden_compra || {};
  const checklist = s.checklist || {};

  const texto = (t, x, y, { negrita = true, tam = 10.5, alinear = "left" } = {}) => {
    doc.setFont(FUENTE, negrita ? "bold" : "normal");
    doc.setFontSize(tam);
    doc.setTextColor(...NEGRO);
    doc.text(t ?? "", x, y, { align: alinear });
  };
  const linea = (x1, y1, x2, y2, grosor = 0.3) => {
    doc.setDrawColor(...NEGRO);
    doc.setLineWidth(grosor);
    doc.line(x1, y1, x2, y2);
  };
  // Etiqueta y su valor enseguida, en letra normal
  const campo = (etiqueta, valor, x, y, maxAncho) => {
    texto(etiqueta, x, y, { negrita: false });
    const w = doc.getTextWidth(etiqueta) + 1.5;
    doc.setFont(FUENTE, "normal");
    texto(doc.splitTextToSize(String(valor || ""), Math.max(10, maxAncho - w))[0] || "", x + w, y, { negrita: false });
  };
  // Valor sobre una línea para llenar ("__/__/____", "Hoja no. __ de __")
  const hueco = (valor, x, y, largo) => {
    linea(x, y + 0.8, x + largo, y + 0.8, 0.25);
    texto(String(valor ?? ""), x + largo / 2, y - 0.3, { negrita: false, alinear: "center" });
    return x + largo;
  };

  // ─── Encabezado ───
  await logos(doc); // incluye la línea amarilla bajo los logotipos
  const carro = await cargarImagen("/formato-ingreso-carro.png");
  if (carro) {
    const anchoCarro = 42;
    doc.addImage(carro.dataUrl, "PNG", MARGEN + 2, 33, anchoCarro, anchoCarro / carro.ratio);
  }
  texto("FORMATO DE INGRESO A TALLER", ancho / 2, 38, { tam: 13, alinear: "center" });
  doc.setFont(FUENTE, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRIS);
  doc.text(s.folio || "", der, 38, { align: "right" });

  // Fecha de ingreso y hoja, alineadas a la derecha
  const f = s.fecha_ingreso ? aFecha(s.fecha_ingreso) : null;
  const dd = f ? String(f.getDate()).padStart(2, "0") : "";
  const mm = f ? String(f.getMonth() + 1).padStart(2, "0") : "";
  const aa = f ? String(f.getFullYear()) : "";
  let y = 45;
  texto("FECHA DE INGRESO:", der - 54, y, { alinear: "right" });
  let x = hueco(dd, der - 52, y, 10);
  texto("/", x + 1, y);
  x = hueco(mm, x + 3, y, 12);
  texto("/", x + 1, y);
  hueco(aa, x + 3, y, der - x - 3);
  y = 50.5;
  texto("Hoja no.", der - 31, y, { alinear: "right" });
  x = hueco(s.hoja_no, der - 29.5, y, 11);
  texto("de", x + 1.5, y);
  hueco(s.hoja_total, x + 6.5, y, der - x - 6.5);

  // ─── Datos del vehículo/maquinaria ───
  y = 55;
  const fila = 5.2;
  const mitad = MARGEN + util * 0.5;
  doc.setDrawColor(...NEGRO);
  doc.setLineWidth(0.35);
  doc.rect(MARGEN, y, util, 6 + fila * 4);
  texto("DATOS DEL VEHICULO/MAQUINARIA", ancho / 2, y + 4.4, { tam: 10, alinear: "center" });
  y += 6;
  for (let i = 0; i < 4; i++) linea(MARGEN, y + fila * i, der, y + fila * i, 0.25);
  linea(mitad, y + fila, mitad, y + fila * 4, 0.25);
  const yy = (i) => y + fila * i + 3.8;
  campo("Área Asignada:", ing.area || s.vehiculo?.area, MARGEN + 1.5, yy(0), util - 3);
  [["Marca:", ing.marca], ["Modelo:", ing.modelo], ["Color:", ing.color]].forEach(([e, v], i) =>
    campo(e, v, MARGEN + 1.5, yy(i + 1), mitad - MARGEN - 3)
  );
  [
    ["No. Inventario:", ing.no_inventario || s.vehiculo?.noInventario],
    ["No. De serie:", ing.serie],
    ["Placas:", ing.placas || s.vehiculo?.placas],
  ].forEach(([e, v], i) => campo(e, v, mitad + 1.5, yy(i + 1), der - mitad - 3));
  y += fila * 4;

  // ─── Accesorios y herramientas: SI / NO en dos columnas ───
  const marca = (key, si) => (checklist[key] === si ? "X" : "");
  const etiqueta = (item) =>
    item.key === "birlos"
      ? `TOTAL DE NUMERO DE BIRLOS${s.total_birlos != null ? `: ${s.total_birlos}` : ""}`
      : item.label.toUpperCase();
  const cuerpo = CHECKLIST_IZQUIERDA.map((a, i) => {
    const b = CHECKLIST_DERECHA[i];
    return [etiqueta(a), marca(a.key, true), marca(a.key, false), b ? etiqueta(b) : "", b ? marca(b.key, true) : "", b ? marca(b.key, false) : ""];
  });
  const marcaCol = 9;
  const descCol = util / 2 - marcaCol * 2;
  autoTable(doc, {
    startY: y,
    theme: "grid",
    margin: { left: MARGEN, right: MARGEN },
    head: [
      [{ content: "ACCESORIOS Y HERRAMIENTAS", colSpan: 6, styles: { fontSize: 10 } }],
      ["DESCRIPCIÓN", "SI", "NO", "DESCRIPCIÓN", "SI", "NO"],
    ],
    body: cuerpo,
    styles: {
      font: FUENTE, fontSize: 8.5, textColor: NEGRO, lineColor: NEGRO, lineWidth: 0.25,
      cellPadding: { top: 0.4, bottom: 0.4, left: 1.5, right: 1.5 }, minCellHeight: 4.6, valign: "middle",
    },
    headStyles: { fillColor: [255, 255, 255], textColor: NEGRO, fontStyle: "bold", fontSize: 9, halign: "center" },
    columnStyles: {
      0: { cellWidth: descCol }, 1: { cellWidth: marcaCol, halign: "center", fontStyle: "bold" },
      2: { cellWidth: marcaCol, halign: "center", fontStyle: "bold" },
      3: { cellWidth: descCol }, 4: { cellWidth: marcaCol, halign: "center", fontStyle: "bold" },
      5: { cellWidth: marcaCol, halign: "center", fontStyle: "bold" },
    },
  });
  y = doc.lastAutoTable.finalY;

  // ─── Observaciones (renglones) ───
  const alto = 5.5;
  doc.setFont(FUENTE, "normal");
  doc.setFontSize(10);
  const lineas = doc.splitTextToSize(s.observaciones_ingreso || "", util - 6);
  const n = Math.max(3, lineas.length);
  if (y + 6 + alto * n > limite) {
    doc.addPage();
    y = 20;
  }
  doc.setDrawColor(...NEGRO);
  doc.setLineWidth(0.35);
  doc.rect(MARGEN, y, util, 6 + alto * n);
  texto("OBSERVACIONES:", ancho / 2, y + 4.4, { tam: 10, alinear: "center" });
  lineas.forEach((l, i) => texto(l, MARGEN + 3, y + 6 + alto * i + 4, { negrita: false, tam: 10 }));
  y += 6 + alto * n;

  // ─── Firmas: ÁREA · MECÁNICO · AUTORIZÓ ───
  const firmas = [
    { titulo: "ÁREA", firma: p.solicitante_firma, nombre: p.solicitante_nombre, leyenda: "Nombre y firma del Operador" },
    { titulo: "MECÁNICO", firma: p.mecanico_firma, nombre: p.mecanico_nombre, leyenda: "Nombre y firma de quien recibe" },
    {
      titulo: "AUTORIZÓ",
      firma: o.autoriza_firma,
      leyenda: `${o.autoriza_nombre || AUTORIZA.nombre}\n${AUTORIZA.cargo}`,
      negrita: true,
    },
  ];
  const col = util / 3;
  const altoTitulo = 7;
  const altoCaja = 30;
  if (y + altoTitulo + altoCaja > limite) {
    doc.addPage();
    y = 20;
  }
  doc.setDrawColor(...NEGRO);
  doc.setLineWidth(0.35);
  doc.rect(MARGEN, y, util, altoTitulo + altoCaja);
  linea(MARGEN, y + altoTitulo, der, y + altoTitulo, 0.35);
  firmas.forEach((fz, i) => {
    const x0 = MARGEN + col * i;
    const centro = x0 + col / 2;
    if (i > 0) linea(x0, y, x0, y + altoTitulo + altoCaja, 0.35);
    texto(fz.titulo, centro, y + 5, { tam: 11, negrita: false, alinear: "center" });
    const top = y + altoTitulo;
    if (fz.firma) {
      try {
        doc.addImage(fz.firma, "PNG", centro - 20, top + 1.5, 40, 13);
      } catch {
        // firma dañada: el espacio queda para firmarla a mano
      }
    }
    doc.setFont(FUENTE, "normal");
    doc.setFontSize(9);
    if (fz.nombre) texto(doc.splitTextToSize(fz.nombre, col - 6)[0], centro, top + 18, { negrita: false, tam: 9, alinear: "center" });
    doc.setFont(FUENTE, fz.negrita ? "bold" : "normal");
    doc.setFontSize(10);
    const leyenda = fz.leyenda.split("\n").flatMap((l) => doc.splitTextToSize(l, col - 4));
    texto(leyenda, centro, top + altoCaja - 3 - 4 * (leyenda.length - 1), { tam: 10, negrita: !!fz.negrita, alinear: "center" });
  });

  pie(doc);
  doc.save(`ingreso_${s.folio || s.id}.pdf`);
}
