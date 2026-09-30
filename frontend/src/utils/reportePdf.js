// src/utils/reportePdf.js
// Genera y descarga el PDF del reporte de mantenimiento.
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { TIPO_LABEL } from "../config/solicitudes";
import { etiquetaMes, moneda, fechaCorta } from "../config/reportes";

const GUINDA = [159, 34, 65];
const TINTA = [30, 41, 59];
const GRIS = [100, 116, 139];
const MARGEN = 15;

// Carga una imagen de /public como dataURL para incrustarla en el PDF
async function cargarImagen(src) {
  try {
    const blob = await (await fetch(src)).blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    const { width, height } = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = dataUrl;
    });
    return { dataUrl, ratio: width / height };
  } catch {
    return null; // sin logo si no se pudo cargar
  }
}

/**
 * @param {object} reporte  respuesta de /api/reportes
 * @param {object} graficas { gasto: dataURL|null, servicios: dataURL|null }
 */
export async function descargarReportePdf(reporte, graficas = {}) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const util = ancho - MARGEN * 2;
  const { periodo, resumen } = reporte;

  // ─── Encabezado ───
  const [gobierno, atlacomulco] = await Promise.all([
    cargarImagen("/gobierno-estado.png"),
    cargarImagen("/logo-atlacomulco.png"),
  ]);
  const altoLogo = 14;
  if (gobierno) doc.addImage(gobierno.dataUrl, "PNG", MARGEN, 10, altoLogo * gobierno.ratio, altoLogo);
  if (atlacomulco) {
    const w = altoLogo * atlacomulco.ratio;
    doc.addImage(atlacomulco.dataUrl, "PNG", ancho - MARGEN - w, 10, w, altoLogo);
  }

  let y = 32;
  doc.setDrawColor(...GUINDA);
  doc.setLineWidth(0.8);
  doc.line(MARGEN, y - 4, ancho - MARGEN, y - 4);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...TINTA);
  doc.text("Reporte de mantenimiento vehicular", MARGEN, y + 2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...GRIS);
  doc.text("Coordinación de Parque Vehicular · Atlacomulco", MARGEN, y + 8);

  const lineasPeriodo = [
    `Periodo: ${fechaCorta(periodo.desde)} al ${fechaCorta(periodo.hasta)}`,
    `Área: ${periodo.area || "Todas"}`,
    `Generado: ${new Date().toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}`,
  ];
  doc.text(lineasPeriodo, ancho - MARGEN, y + 2, { align: "right" });
  y += 20;

  // ─── Resumen ───
  titulo(doc, "Resumen", y);
  y += 3;
  autoTable(doc, {
    startY: y,
    theme: "plain",
    margin: { left: MARGEN, right: MARGEN },
    styles: { fontSize: 9.5, cellPadding: 2, textColor: TINTA },
    columnStyles: { 0: { textColor: GRIS, cellWidth: 70 }, 1: { fontStyle: "bold" } },
    body: [
      ["Servicios ingresados", String(resumen.servicios)],
      ["Servicios terminados", String(resumen.terminados)],
      ["Siguen en taller", String(resumen.en_taller)],
      ["Gasto total", moneda(resumen.gasto_total)],
      ["Gasto promedio por servicio", moneda(resumen.gasto_promedio)],
      ["Tiempo promedio en taller", resumen.dias_promedio_taller == null ? "—" : `${resumen.dias_promedio_taller} días`],
      ...(resumen.sin_costo ? [["Terminados sin costo capturado", String(resumen.sin_costo)]] : []),
    ],
  });
  y = doc.lastAutoTable.finalY + 8;

  // ─── Gráficas ───
  const altoGrafica = 55;
  for (const [nombre, img] of [["Gasto por mes", graficas.gasto], ["Servicios ingresados por mes", graficas.servicios]]) {
    if (!img) continue;
    y = saltoSiHaceFalta(doc, y, altoGrafica + 10);
    titulo(doc, nombre, y);
    doc.addImage(img, "PNG", MARGEN, y + 3, util, altoGrafica);
    y += altoGrafica + 10;
  }

  // ─── Tablas ───
  const tabla = (nombre, head, body, opciones = {}) => {
    y = saltoSiHaceFalta(doc, y, 25);
    titulo(doc, nombre, y);
    autoTable(doc, {
      startY: y + 3,
      head: [head],
      body: body.length ? body : [[{ content: "Sin datos en el periodo", colSpan: head.length, styles: { textColor: GRIS, halign: "center" } }]],
      margin: { left: MARGEN, right: MARGEN, top: 20 },
      styles: { fontSize: 9, cellPadding: 2.2, textColor: TINTA, lineColor: [226, 232, 240], lineWidth: 0.1 },
      headStyles: { fillColor: GUINDA, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      // El título de una columna numérica se alinea igual que sus valores
      didParseCell: (data) => {
        const halign = opciones.columnStyles?.[data.column.index]?.halign;
        if (data.section === "head" && halign) data.cell.styles.halign = halign;
      },
      ...opciones,
    });
    y = doc.lastAutoTable.finalY + 8;
  };

  const derecha = { halign: "right" };

  tabla(
    "Gasto por mes",
    ["Mes", "Servicios", "Terminados", "Gasto"],
    reporte.por_mes.map((m) => [etiquetaMes(m.mes), m.servicios, m.terminados, moneda(m.gasto)]),
    { columnStyles: { 1: derecha, 2: derecha, 3: derecha } }
  );

  tabla(
    "Gasto por área",
    ["Área", "Servicios", "Gasto"],
    reporte.por_area.map((a) => [a.area, a.servicios, moneda(a.gasto)]),
    { columnStyles: { 1: derecha, 2: derecha } }
  );

  tabla(
    "Gasto por tipo de servicio",
    ["Tipo", "Servicios", "Gasto"],
    reporte.por_tipo.map((t) => [TIPO_LABEL[t.tipo] || t.tipo, t.servicios, moneda(t.gasto)]),
    { columnStyles: { 1: derecha, 2: derecha } }
  );

  tabla(
    "Vehículos con mayor gasto",
    ["#", "Vehículo", "No. inventario", "Área", "Servicios", "Gasto"],
    reporte.top_costo.map((v, i) => [i + 1, v.nombre, v.no_inventario, v.area || "—", v.servicios, moneda(v.gasto)]),
    { columnStyles: { 0: { cellWidth: 8 }, 4: derecha, 5: derecha } }
  );

  tabla(
    "Vehículos que más ingresan al taller",
    ["#", "Vehículo", "No. inventario", "Área", "Servicios", "Gasto"],
    reporte.top_ingresos.map((v, i) => [i + 1, v.nombre, v.no_inventario, v.area || "—", v.servicios, moneda(v.gasto)]),
    { columnStyles: { 0: { cellWidth: 8 }, 4: derecha, 5: derecha } }
  );

  tabla(
    "Piezas a comprar",
    ["Pieza", "Cantidad", "Servicios"],
    reporte.piezas_por_comprar.map((p) => [
      p.descripcion,
      p.cantidad,
      p.servicios.map((s) => `${s.folio} (${s.vehiculo})`).join(", "),
    ]),
    { columnStyles: { 1: { halign: "right", cellWidth: 20 }, 2: { cellWidth: 90, fontSize: 8 } } }
  );

  // ─── Pie de página en todas las hojas ───
  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...GRIS);
    doc.text("Coordinación de Parque Vehicular · Atlacomulco", MARGEN, alto - 8);
    doc.text(`Página ${i} de ${paginas}`, ancho - MARGEN, alto - 8, { align: "right" });
  }

  const nombre = `reporte-mantenimiento_${periodo.desde}_${periodo.hasta}${periodo.area ? `_${periodo.area.replace(/\s+/g, "-")}` : ""}.pdf`;
  doc.save(nombre);
}

function titulo(doc, texto, y) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...GUINDA);
  doc.text(texto, MARGEN, y);
  doc.setFont("helvetica", "normal");
}

// Agrega una hoja nueva si no cabe lo que sigue
function saltoSiHaceFalta(doc, y, necesario) {
  const alto = doc.internal.pageSize.getHeight();
  if (y + necesario > alto - 18) {
    doc.addPage();
    return 20;
  }
  return y;
}
