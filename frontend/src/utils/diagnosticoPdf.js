// src/utils/diagnosticoPdf.js
// "PARQUE VEHICULAR · DICTAMEN" tal cual el formato del municipio (en blanco y
// negro, letra tipo Times, como la orden de compra): fecha de entrada a
// reparar; datos de la unidad; diagnóstico de fallas presentadas; acciones a
// realizar / observaciones; refacciones a utilizar; adicionales y las firmas:
//   Dictamen (mecánico) · Aplica (mecánico) · Área usuaria (solicitante) · Autorizó
// La firma que falte queda en blanco para firmarla a mano al imprimir.
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { MARGEN, aFecha, cantidad, logos, pie } from "./pdfComun";
import { AUTORIZA } from "../config/ordenCompra";

const NEGRO = [0, 0, 0];
const GRIS = [120, 120, 120];
const FUENTE = "times";
const RENGLONES_REFACCIONES = 8;
const MESES = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sep.", "oct.", "nov.", "dic."];

/** @param {object} s  servicio tal como lo regresa /api/solicitudes/<id> */
export async function descargarDiagnosticoPdf(s) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const ancho = doc.internal.pageSize.getWidth();
  const limite = doc.internal.pageSize.getHeight() - 18; // arriba del pie
  const der = ancho - MARGEN;
  const util = ancho - MARGEN * 2;
  const ing = s.ingreso || {};
  const p = s.peticion || {};
  const o = s.orden_compra || {};
  const nombre = s.vehiculo?.numeroEconomico || s.vehiculo?.unidad || s.vehiculo?.noInventario;

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
  // Etiqueta en negritas alineada a la derecha de su columna y el valor enseguida
  const campo = (etiqueta, valor, xEtiqueta, xValor, y, maxAncho) => {
    texto(etiqueta, xEtiqueta, y, { alinear: "right" });
    doc.setFont(FUENTE, "normal");
    doc.setFontSize(10.5);
    texto(doc.splitTextToSize(String(valor || ""), maxAncho)[0] || "", xValor, y, { negrita: false });
  };
  let y;
  const asegurar = (alto) => {
    if (y + alto > limite) {
      doc.addPage();
      y = 20;
    }
  };

  // ─── Encabezado ───
  await logos(doc); // incluye la línea amarilla bajo los logotipos
  texto("MUNICIPIO DE ATLACOMULCO", ancho / 2, 37, { tam: 12, alinear: "center" });
  texto("PARQUE VEHICULAR", ancho / 2, 42.5, { tam: 12, alinear: "center" });
  texto("“DICTAMEN”", ancho / 2, 48, { tam: 12, alinear: "center" });
  doc.setFont(FUENTE, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRIS);
  doc.text(s.folio || "", der, 37, { align: "right" });

  // Fecha de entrada a reparar
  const f = s.fecha_ingreso ? aFecha(s.fecha_ingreso) : null;
  const dia = f ? String(f.getDate()) : "";
  const mes = f ? MESES[f.getMonth()] : "";
  const anio = f ? String(f.getFullYear()) : "";
  y = 55;
  // Escribe un tramo y devuelve dónde termina
  const tramo = (t, x) => {
    texto(t, x, y);
    return x + doc.getTextWidth(t);
  };
  // Alineada a la derecha: "Atlacomulco, México a __ de ____ de ____."
  doc.setFont(FUENTE, "bold");
  doc.setFontSize(10.5);
  const anchos = {
    a: doc.getTextWidth("Atlacomulco, México a "),
    de: doc.getTextWidth(" de "),
    punto: doc.getTextWidth("."),
  };
  const hueco = { dia: 12, mes: 22, anio: 14 };
  let x = der - (anchos.a + hueco.dia + anchos.de + hueco.mes + anchos.de + hueco.anio + anchos.punto);
  x = tramo("Atlacomulco, México a ", x);
  [["dia", dia], ["mes", mes], ["anio", anio]].forEach(([k, val], i) => {
    linea(x, y + 0.8, x + hueco[k], y + 0.8, 0.25);
    texto(val, x + hueco[k] / 2, y - 0.3, { negrita: false, alinear: "center" });
    x += hueco[k];
    x = tramo(i < 2 ? " de " : ".", x);
  });

  // ─── Datos de la unidad ───
  y = 60;
  const fila = 5.8;
  const colEtiqueta = MARGEN + 45;  // fin de las etiquetas de la izquierda
  const corte = MARGEN + util * 0.6;
  const colEtiquetaDer = corte + 27;
  doc.setDrawColor(...NEGRO);
  doc.setLineWidth(0.35);
  doc.rect(MARGEN, y, util, fila * 5);
  for (let i = 1; i < 5; i++) linea(MARGEN, y + fila * i, der, y + fila * i);
  linea(colEtiqueta + 1.5, y, colEtiqueta + 1.5, y + fila * 5);
  linea(corte, y + fila * 2, corte, y + fila * 5);
  linea(colEtiquetaDer + 1.5, y + fila * 2, colEtiquetaDer + 1.5, y + fila * 5);
  const yy = (i) => y + fila * i + 4.2;
  [
    ["Área:", ing.area || s.vehiculo?.area, der],
    ["Vehículo:", ing.unidad || nombre, der],
    ["Color:", ing.color, corte],
    ["No. De Serie:", ing.serie, corte],
    ["No. De Inventario:", ing.no_inventario || s.vehiculo?.noInventario, corte],
  ].forEach(([e, val, hasta], i) => campo(e, val, colEtiqueta, colEtiqueta + 3, yy(i), hasta - colEtiqueta - 5));
  [["Marca:", ing.marca], ["Placas:", ing.placas || s.vehiculo?.placas], ["Modelo:", ing.modelo]].forEach(([e, val], i) =>
    campo(e, val, colEtiquetaDer, colEtiquetaDer + 3, yy(i + 2), der - colEtiquetaDer - 5)
  );
  y += fila * 5 + 4;

  // ─── Diagnóstico y acciones: título y renglones como en el papel ───
  const alto = 6;
  const renglones = (titulo, contenido, minimo) => {
    doc.setFont(FUENTE, "normal");
    doc.setFontSize(10);
    const lineas = doc.splitTextToSize(contenido || "", util - 6);
    const n = Math.max(minimo, lineas.length);
    asegurar(alto * (n + 1));
    doc.setDrawColor(...NEGRO);
    doc.setLineWidth(0.35);
    doc.rect(MARGEN, y, util, alto * (n + 1));
    texto(titulo, ancho / 2, y + 4.3, { tam: 10, alinear: "center" });
    for (let i = 1; i <= n; i++) {
      linea(MARGEN, y + alto * i, der, y + alto * i, 0.25);
      if (lineas[i - 1]) texto(lineas[i - 1], MARGEN + 3, y + alto * i + 4.3, { negrita: false, tam: 10 });
    }
    y += alto * (n + 1);
  };
  renglones("DIAGNÓSTICO DE FALLAS PRESENTADAS", s.fallas, 3);
  renglones("ACCIONES A REALIZAR/OBSERVACIONES", s.acciones_a_realizar, 3);

  // ─── Refacciones a utilizar ───
  const cuerpo = (s.refacciones || []).map((r) => [cantidad(r.cantidad), r.unidad_medida, r.concepto]);
  while (cuerpo.length < RENGLONES_REFACCIONES) cuerpo.push(["", "", ""]);
  const estilos = {
    theme: "grid",
    margin: { left: MARGEN, right: MARGEN },
    styles: {
      font: FUENTE, fontSize: 9.5, textColor: NEGRO, lineColor: NEGRO, lineWidth: 0.3,
      cellPadding: { top: 0.6, bottom: 0.6, left: 1.5, right: 1.5 }, minCellHeight: 5.4, valign: "middle",
    },
    headStyles: { fillColor: [255, 255, 255], textColor: NEGRO, fontStyle: "bold", halign: "center", valign: "middle" },
    columnStyles: { 0: { cellWidth: 22, halign: "center" }, 1: { cellWidth: 22, halign: "center" } },
  };
  asegurar(6 + 10 + 5.4 * 3);
  autoTable(doc, {
    ...estilos,
    startY: y,
    head: [
      [{ content: "REFACCIONES A UTILIZAR", colSpan: 3, styles: { fontSize: 10 } }],
      [
        { content: "CANTIDAD", styles: { fontSize: 8 } },
        { content: "UNIDAD\nDE\nMEDIDA", styles: { fontSize: 7.5 } },
        { content: "DESCRIPCIÓN", styles: { fontSize: 8 } },
      ],
    ],
    body: cuerpo,
  });
  y = doc.lastAutoTable.finalY;

  // ─── Adicionales (dos renglones; el texto es el de la orden de compra) ───
  asegurar(6 + 5.4 * 2);
  doc.setFont(FUENTE, "normal");
  doc.setFontSize(9.5);
  const adicionales = doc.splitTextToSize(o.adicionales || "", util - 44 - 3);
  autoTable(doc, {
    ...estilos,
    startY: y,
    head: [[{ content: "ADICIONALES", colSpan: 3, styles: { fontSize: 10 } }]],
    body: [["", "", adicionales[0] || ""], ["", "", adicionales.slice(1).join(" ")]],
  });
  y = doc.lastAutoTable.finalY + 6;

  // ─── Firmas: Dictamen · Aplica · Área usuaria · Autorizó ───
  const firmas = [
    { titulo: "Dictamen", firma: p.mecanico_firma, nombre: p.mecanico_nombre, leyenda: "Nombre completo y firma de mecánico" },
    {
      titulo: "Aplica",
      firma: o.mecanico_firma || p.mecanico_firma,
      nombre: o.mecanico_nombre || p.mecanico_nombre,
      leyenda: "Nombre completo y firma de mecánico",
    },
    {
      titulo: "Área Usuaria",
      firma: p.solicitante_firma,
      nombre: p.solicitante_nombre,
      cargo: ing.area || s.vehiculo?.area,
      leyenda: "Nombre completo, cargo y firma",
    },
    {
      titulo: "Autorizó",
      firma: o.autoriza_firma,
      nombre: null,
      leyenda: `${o.autoriza_nombre || AUTORIZA.nombre}\n${AUTORIZA.cargo}`,
    },
  ];
  const col = util / 4;
  const altoTitulo = 8;
  const altoCaja = 30;
  asegurar(altoTitulo + altoCaja);
  doc.setDrawColor(...NEGRO);
  doc.setLineWidth(0.35);
  doc.rect(MARGEN, y, util, altoTitulo + altoCaja);
  linea(MARGEN, y + altoTitulo, der, y + altoTitulo, 0.35);
  firmas.forEach((fz, i) => {
    const x0 = MARGEN + col * i;
    const centro = x0 + col / 2;
    if (i > 0) linea(x0, y, x0, y + altoTitulo + altoCaja, 0.35);
    texto(fz.titulo, centro, y + 5.8, { tam: 12, alinear: "center" });
    const top = y + altoTitulo;
    if (fz.firma) {
      try {
        doc.addImage(fz.firma, "PNG", centro - 18, top + 1, 36, 12);
      } catch {
        // firma dañada: el espacio queda para firmar a mano
      }
    }
    doc.setFont(FUENTE, "normal");
    doc.setFontSize(8.5);
    if (fz.nombre) texto(doc.splitTextToSize(fz.nombre, col - 4)[0], centro, top + 15.5, { negrita: false, tam: 8.5, alinear: "center" });
    if (fz.cargo) texto(doc.splitTextToSize(fz.cargo, col - 4)[0], centro, top + 19, { negrita: false, tam: 8, alinear: "center" });
    doc.setFont(FUENTE, "bold");
    doc.setFontSize(9);
    const leyenda = fz.leyenda.split("\n").flatMap((l) => doc.splitTextToSize(l, col - 4));
    texto(leyenda, centro, top + altoCaja - 2 - 3.6 * (leyenda.length - 1), { tam: 9, alinear: "center" });
  });

  pie(doc);
  doc.save(`dictamen_${s.folio || s.id}.pdf`);
}
