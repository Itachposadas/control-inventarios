// src/utils/solicitudPdf.js
// Formato imprimible de una solicitud de área: datos, materiales y las firmas
// del solicitante (quien entrega) y del mecánico responsable (quien recibe).
// Se genera cuando ya tiene las dos firmas (el mecánico firma al pulsar "Atender").
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { cargarImagen } from "./reportePdf";

const GUINDA = [159, 34, 65];
const TINTA = [30, 41, 59];
const GRIS = [100, 116, 139];
const MARGEN = 15;

const LOGOTIPO_MUNICIPAL = encodeURI("/Logotipo municipal de Atlacomulco.png");

const pesos = (n) => Number(n || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
const aFecha = (iso) => new Date(iso.endsWith("Z") ? iso : `${iso}Z`);

/** @param {object} p  solicitud tal como la regresa /api/peticiones */
export async function descargarSolicitudPdf(p) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const v = p.vehiculo || {};

  // ─── Encabezado ───
  // Izquierda: logotipo municipal. Derecha: logo de Atlacomulco.
  const [municipal, atlacomulco] = await Promise.all([
    cargarSinFondo(LOGOTIPO_MUNICIPAL),
    cargarImagen("/logo-atlacomulco.png"),
  ]);
  const altoMunicipal = 22;
  if (municipal) {
    doc.addImage(municipal.dataUrl, "PNG", MARGEN, 6, altoMunicipal * municipal.ratio, altoMunicipal);
  }
  if (atlacomulco) {
    const altoLogo = 14;
    const w = altoLogo * atlacomulco.ratio;
    doc.addImage(atlacomulco.dataUrl, "PNG", ancho - MARGEN - w, 10, w, altoLogo);
  }

  let y = 36;
  doc.setDrawColor(...GUINDA);
  doc.setLineWidth(0.8);
  doc.line(MARGEN, y - 4, ancho - MARGEN, y - 4);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...TINTA);
  doc.text("Solicitud de servicio vehicular", MARGEN, y + 2);
  doc.setFontSize(13);
  doc.setTextColor(...GUINDA);
  doc.text(p.folio || "", ancho - MARGEN, y + 2, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...GRIS);
  doc.text("Coordinación de Parque Vehicular · Atlacomulco", MARGEN, y + 8);
  y += 16;

  // ─── Datos generales ───
  const fecha = p.fecha ? aFecha(p.fecha) : null;
  autoTable(doc, {
    startY: y,
    theme: "grid",
    margin: { left: MARGEN, right: MARGEN },
    styles: { fontSize: 9.5, cellPadding: 2.2, textColor: TINTA, lineColor: [226, 232, 240], lineWidth: 0.1 },
    columnStyles: {
      0: { textColor: GRIS, cellWidth: 32 }, 1: { fontStyle: "bold" },
      2: { textColor: GRIS, cellWidth: 32 }, 3: { fontStyle: "bold" },
    },
    body: [
      ["Fecha", fecha ? fecha.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" }) : "—",
        "Hora", fecha ? fecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : "—"],
      ["Área", p.area || "—", "Vehículo", v.nombre || "—"],
      ["Marca / modelo", [v.marca, v.modelo].filter(Boolean).join(" ") || "—", "Placas", v.placas || "—"],
      ["No. inventario", v.noInventario || "—", "Recibida en taller",
        p.recibida_at ? aFecha(p.recibida_at).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" }) : "—"],
    ],
  });
  y = doc.lastAutoTable.finalY + 8;

  // ─── Materiales ───
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...GUINDA);
  doc.text("Materiales solicitados", MARGEN, y);
  const derecha = { halign: "right" };
  autoTable(doc, {
    startY: y + 3,
    margin: { left: MARGEN, right: MARGEN },
    head: [["Cant.", "Unidad", "Concepto", "P. unitario", "Total"]],
    body: (p.materiales || []).map((m) => [
      Number(m.cantidad).toLocaleString("es-MX", { maximumFractionDigits: 2 }),
      m.unidad_medida,
      m.concepto,
      m.precio_unitario != null ? pesos(m.precio_unitario) : "—",
      m.total != null ? pesos(m.total) : "—",
    ]),
    foot: [[
      { content: "Total", colSpan: 4, styles: { halign: "right" } },
      { content: p.total != null ? pesos(p.total) : "—", styles: { halign: "right" } },
    ]],
    styles: { fontSize: 9, cellPadding: 2.2, textColor: TINTA, lineColor: [226, 232, 240], lineWidth: 0.1 },
    headStyles: { fillColor: GUINDA, textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: [248, 250, 252], textColor: TINTA, fontStyle: "bold" },
    columnStyles: { 0: { ...derecha, cellWidth: 16 }, 1: { cellWidth: 24 }, 3: { ...derecha, cellWidth: 28 }, 4: { ...derecha, cellWidth: 28 } },
    didParseCell: (data) => {
      if (data.section === "head" && [0, 3, 4].includes(data.column.index)) data.cell.styles.halign = "right";
    },
  });
  y = doc.lastAutoTable.finalY + 20;

  // ─── Firmas: solicitante (entrega) y mecánico responsable (recibe) ───
  const anchoFirma = 70;
  const altoFirma = 26;
  if (y + altoFirma + 22 > alto - 18) {
    doc.addPage();
    y = 30;
  }
  const columna = (ancho - MARGEN * 2) / 2;
  bloqueFirma(doc, {
    centro: MARGEN + columna / 2, y, anchoFirma, altoFirma,
    titulo: "SOLICITA", firma: p.solicitante_firma, nombre: p.solicitante_nombre,
    leyenda: `Nombre y firma del solicitante${p.area ? ` · ${p.area}` : ""}`,
  });
  bloqueFirma(doc, {
    centro: MARGEN + columna * 1.5, y, anchoFirma, altoFirma,
    titulo: "RECIBE", firma: p.mecanico_firma, nombre: p.mecanico_nombre,
    leyenda: "Nombre y firma del mecánico responsable",
  });

  // ─── Pie ───
  doc.setFontSize(8);
  doc.text("Coordinación de Parque Vehicular · Atlacomulco", MARGEN, alto - 8);
  doc.text(
    `Generado: ${new Date().toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}`,
    ancho - MARGEN, alto - 8, { align: "right" }
  );

  doc.save(`solicitud_${p.folio || p.id}.pdf`);
}

function bloqueFirma(doc, { centro, y, anchoFirma, altoFirma, titulo, firma, nombre, leyenda }) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...GUINDA);
  doc.text(titulo, centro, y - 3, { align: "center" });
  if (firma) {
    try {
      doc.addImage(firma, "PNG", centro - anchoFirma / 2, y, anchoFirma, altoFirma);
    } catch {
      // firma dañada: se deja la línea en blanco
    }
  }
  const linea = y + altoFirma + 2;
  doc.setDrawColor(...TINTA);
  doc.setLineWidth(0.3);
  doc.line(centro - anchoFirma / 2 - 4, linea, centro + anchoFirma / 2 + 4, linea);
  doc.setFontSize(10);
  doc.setTextColor(...TINTA);
  doc.text(nombre || "", centro, linea + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  doc.text(doc.splitTextToSize(leyenda, anchoFirma + 8), centro, linea + 10, { align: "center" });
}

// El logotipo municipal trae un fondo gris con figuras: se vuelve transparente
// (todo lo claro) y se recorta al dibujo para que en el PDF solo quede el logo.
async function cargarSinFondo(src) {
  const original = await cargarImagen(src);
  if (!original) return null;
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = original.dataUrl;
    });
    const escala = Math.min(1, 500 / img.naturalWidth); // basta para imprimir y pesa poco
    const w = Math.round(img.naturalWidth * escala);
    const h = Math.round(img.naturalHeight * escala);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    const datos = ctx.getImageData(0, 0, w, h);
    const px = datos.data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let i = 0; i < px.length; i += 4) {
      const luz = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      const alfa = Math.max(0, Math.min(1, (185 - luz) / 55));
      px[i + 3] = Math.round(alfa * 255);
      if (alfa > 0.5) {
        const n = i / 4;
        const x = n % w;
        const y = (n - x) / w;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    if (x1 < 0) return original;
    ctx.putImageData(datos, 0, 0);
    const recorte = document.createElement("canvas");
    recorte.width = x1 - x0 + 1;
    recorte.height = y1 - y0 + 1;
    recorte.getContext("2d").drawImage(canvas, -x0, -y0);
    return { dataUrl: recorte.toDataURL("image/png"), ratio: recorte.width / recorte.height };
  } catch {
    return original; // sin canvas: se usa tal cual
  }
}
