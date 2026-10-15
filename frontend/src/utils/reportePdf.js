// src/utils/reportePdf.js
// Genera y descarga el PDF del reporte de mantenimiento. Pensado para
// imprimirse en blanco y negro: texto negro, grises para fondos y líneas,
// tablas con filetes (sin rellenos de color) y sin gráficas.
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { TIPO_LABEL } from "../config/solicitudes";
import { etiquetaMes, moneda, fechaCorta } from "../config/reportes";
import { MARGEN, logos } from "./pdfComun";

const NEGRO = [0, 0, 0];
const TEXTO = [33, 33, 33];
const GRIS = [100, 100, 100];
const GRIS_CLARO = [200, 200, 200];
const FONDO = [238, 238, 238];   // encabezados de tabla y recuadros
const FUENTE = "helvetica";

/** @param {object} reporte  respuesta de /api/reportes */
export async function descargarReportePdf(reporte) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const der = ancho - MARGEN;
  const util = ancho - MARGEN * 2;
  const { periodo, resumen } = reporte;
  let seccion = 0;

  const texto = (t, x, y, { negrita = false, tam = 9.5, color = TEXTO, alinear = "left" } = {}) => {
    doc.setFont(FUENTE, negrita ? "bold" : "normal");
    doc.setFontSize(tam);
    doc.setTextColor(...color);
    doc.text(t ?? "", x, y, { align: alinear });
  };
  const linea = (x1, y1, x2, y2, grosor = 0.2, color = NEGRO) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(grosor);
    doc.line(x1, y1, x2, y2);
  };

  // ─── Encabezado ───
  await logos(doc); // incluye la línea amarilla bajo los logotipos
  texto("MUNICIPIO DE ATLACOMULCO", ancho / 2, 37.5, { negrita: true, tam: 10, alinear: "center" });
  texto("COORDINACIÓN DE PARQUE VEHICULAR", ancho / 2, 42.5, { tam: 9, color: GRIS, alinear: "center" });
  texto("REPORTE DE MANTENIMIENTO VEHICULAR", ancho / 2, 50, { negrita: true, tam: 14, color: NEGRO, alinear: "center" });

  // Datos del reporte en un recuadro de tres columnas
  let y = 55;
  const datos = [
    ["PERIODO", `${fechaCorta(periodo.desde)} al ${fechaCorta(periodo.hasta)}`],
    ["ÁREA", periodo.area || "Todas las áreas"],
    ["FECHA DE EMISIÓN", new Date().toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })],
  ];
  const colDato = util / datos.length;
  doc.setDrawColor(...NEGRO);
  doc.setLineWidth(0.3);
  doc.rect(MARGEN, y, util, 12);
  datos.forEach(([e, v], i) => {
    const x = MARGEN + colDato * i;
    if (i > 0) linea(x, y, x, y + 12, 0.2, GRIS_CLARO);
    texto(e, x + colDato / 2, y + 4.5, { negrita: true, tam: 7, color: GRIS, alinear: "center" });
    texto(doc.splitTextToSize(v, colDato - 4)[0], x + colDato / 2, y + 9.5, { negrita: true, tam: 9.5, color: NEGRO, alinear: "center" });
  });
  y += 20;

  // Título numerado de sección con filete abajo
  const titulo = (nombre) => {
    seccion += 1;
    texto(`${seccion}. ${nombre.toUpperCase()}`, MARGEN, y, { negrita: true, tam: 10.5, color: NEGRO });
    linea(MARGEN, y + 1.8, der, y + 1.8, 0.3);
    y += 5;
  };
  const salto = (necesario) => {
    if (y + necesario > alto - 20) {
      doc.addPage();
      y = 20;
    }
  };

  // ─── 1. Resumen: indicadores en recuadros (3 × 2) ───
  titulo("Resumen del periodo");
  const indicadores = [
    ["Servicios ingresados", String(resumen.servicios)],
    ["Servicios terminados", String(resumen.terminados)],
    ["Siguen en taller", String(resumen.en_taller)],
    ["Gasto total", moneda(resumen.gasto_total)],
    ["Gasto promedio por servicio", moneda(resumen.gasto_promedio)],
    ["Tiempo promedio en taller", resumen.dias_promedio_taller == null ? "—" : `${resumen.dias_promedio_taller} días`],
  ];
  const porFila = 3;
  const sep = 3;
  const wInd = (util - sep * (porFila - 1)) / porFila;
  const hInd = 15;
  indicadores.forEach(([e, v], i) => {
    const x = MARGEN + (wInd + sep) * (i % porFila);
    const yi = y + 1 + (hInd + sep) * Math.floor(i / porFila);
    doc.setFillColor(...FONDO);
    doc.setDrawColor(...GRIS_CLARO);
    doc.setLineWidth(0.2);
    doc.rect(x, yi, wInd, hInd, "FD");
    linea(x, yi, x, yi + hInd, 1.2, NEGRO); // acento a la izquierda
    texto(e.toUpperCase(), x + 4, yi + 5.5, { negrita: true, tam: 6.8, color: GRIS });
    texto(v, x + 4, yi + 12, { negrita: true, tam: 12.5, color: NEGRO });
  });
  y += 1 + (hInd + sep) * Math.ceil(indicadores.length / porFila);
  if (resumen.sin_costo) {
    texto(
      `Nota: ${resumen.sin_costo} ${resumen.sin_costo === 1 ? "servicio terminado no tiene" : "servicios terminados no tienen"} costo capturado; no suman al gasto.`,
      MARGEN, y + 1, { tam: 8, color: GRIS }
    );
    y += 5;
  }
  y += 5;

  const meses = reporte.por_mes || [];

  // ─── Tablas con filetes: encabezado gris claro, renglones separados por líneas finas ───
  const tabla = (nombre, head, body, { columnStyles = {}, total = null } = {}) => {
    salto(30);
    titulo(nombre);
    const vacio = !body.length;
    autoTable(doc, {
      startY: y,
      theme: "plain",
      margin: { left: MARGEN, right: MARGEN, top: 20, bottom: 20 },
      head: [head],
      body: vacio
        ? [[{ content: "Sin datos en el periodo", colSpan: head.length, styles: { textColor: GRIS, halign: "center", fontStyle: "italic" } }]]
        : body,
      foot: total && !vacio ? [total] : undefined,
      showFoot: "lastPage",
      styles: {
        font: FUENTE, fontSize: 8.8, textColor: TEXTO, cellPadding: { top: 1.7, bottom: 1.7, left: 2.5, right: 2.5 },
        valign: "middle", lineWidth: 0,
      },
      // El fondo gris del encabezado se pinta como una sola franja (willDrawCell)
      headStyles: {
        fillColor: false, textColor: NEGRO, fontStyle: "bold", fontSize: 8,
        cellPadding: { top: 2.4, bottom: 2.4, left: 2.5, right: 2.5 },
      },
      footStyles: { fillColor: [255, 255, 255], textColor: NEGRO, fontStyle: "bold" },
      columnStyles,
      didParseCell: (data) => {
        // Los títulos de columnas numéricas se alinean como sus valores
        const halign = columnStyles[data.column.index]?.halign;
        if ((data.section === "head" || data.section === "foot") && halign) data.cell.styles.halign = halign;
        if (data.section === "head") data.cell.text = data.cell.text.map((t) => t.toUpperCase());
      },
      willDrawCell: (data) => {
        if (data.section === "head" && data.column.index === 0) {
          doc.setFillColor(...FONDO);
          doc.rect(MARGEN, data.cell.y, util, data.cell.height, "F");
        }
      },
      didDrawCell: (data) => {
        const { x, y: yc, width, height } = data.cell;
        const fin = data.column.index === head.length - 1;
        // Filete grueso arriba y abajo del encabezado; fino entre renglones; doble arriba del total
        if (data.section === "head") {
          linea(x, yc, x + width, yc, 0.5);
          linea(x, yc + height, x + width, yc + height, 0.3);
        } else if (data.section === "body") {
          linea(x, yc + height, x + width, yc + height, 0.1, GRIS_CLARO);
        } else if (data.section === "foot") {
          linea(x, yc, x + width, yc, 0.4);
          linea(x, yc + height, x + width, yc + height, 0.5);
        }
        if (fin && data.section === "body" && data.row.index === data.table.body.length - 1 && !total) {
          linea(MARGEN, yc + height, der, yc + height, 0.5);
        }
      },
    });
    y = doc.lastAutoTable.finalY + 9;
  };

  const der_ = { halign: "right" };
  const suma = (lista, campo) => lista.reduce((t, x) => t + (Number(x[campo]) || 0), 0);

  tabla(
    "Gasto por mes",
    ["Mes", "Servicios", "Terminados", "Gasto"],
    meses.map((m) => [etiquetaMes(m.mes), m.servicios, m.terminados, moneda(m.gasto)]),
    {
      columnStyles: { 1: der_, 2: der_, 3: der_ },
      total: ["Total", suma(meses, "servicios"), suma(meses, "terminados"), moneda(suma(meses, "gasto"))],
    }
  );

  const areas = reporte.por_area || [];
  tabla(
    "Gasto por área",
    ["Área", "Servicios", "Gasto", "% del gasto"],
    areas.map((a) => [a.area, a.servicios, moneda(a.gasto), porcentaje(a.gasto, suma(areas, "gasto"))]),
    {
      columnStyles: { 1: der_, 2: der_, 3: { ...der_, cellWidth: 26 } },
      total: ["Total", suma(areas, "servicios"), moneda(suma(areas, "gasto")), suma(areas, "gasto") ? "100 %" : "—"],
    }
  );

  const tipos = reporte.por_tipo || [];
  tabla(
    "Gasto por tipo de servicio",
    ["Tipo", "Servicios", "Gasto", "% del gasto"],
    tipos.map((t) => [TIPO_LABEL[t.tipo] || t.tipo, t.servicios, moneda(t.gasto), porcentaje(t.gasto, suma(tipos, "gasto"))]),
    {
      columnStyles: { 1: der_, 2: der_, 3: { ...der_, cellWidth: 26 } },
      total: ["Total", suma(tipos, "servicios"), moneda(suma(tipos, "gasto")), suma(tipos, "gasto") ? "100 %" : "—"],
    }
  );

  const vehiculos = (lista) =>
    lista.map((v, i) => [i + 1, v.nombre, v.no_inventario, v.area || "—", v.servicios, moneda(v.gasto)]);
  const colVehiculos = {
    0: { cellWidth: 9, halign: "center" }, 2: { cellWidth: 38 }, 3: { cellWidth: 40 },
    4: { ...der_, cellWidth: 22 }, 5: { ...der_, cellWidth: 26 },
  };
  tabla("Vehículos con mayor gasto", ["#", "Vehículo", "No. inventario", "Área", "Servicios", "Gasto"],
    vehiculos(reporte.top_costo || []), { columnStyles: colVehiculos });
  tabla("Vehículos que más ingresan al taller", ["#", "Vehículo", "No. inventario", "Área", "Servicios", "Gasto"],
    vehiculos(reporte.top_ingresos || []), { columnStyles: colVehiculos });

  // ─── Pie de página en todas las hojas ───
  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i);
    linea(MARGEN, alto - 13, der, alto - 13, 0.3);
    texto("Coordinación de Parque Vehicular · Municipio de Atlacomulco", MARGEN, alto - 8.5, { tam: 7.5, color: GRIS });
    texto(`Página ${i} de ${paginas}`, der, alto - 8.5, { tam: 7.5, color: GRIS, alinear: "right" });
  }

  const nombre = `reporte-mantenimiento_${periodo.desde}_${periodo.hasta}${periodo.area ? `_${periodo.area.replace(/\s+/g, "-")}` : ""}.pdf`;
  doc.save(nombre);
}

function porcentaje(parte, total) {
  if (!total) return "—";
  return `${((Number(parte) || 0) / total * 100).toLocaleString("es-MX", { maximumFractionDigits: 1 })} %`;
}
