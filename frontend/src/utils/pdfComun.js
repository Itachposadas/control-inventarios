// src/utils/pdfComun.js
// Piezas comunes de los PDF (formatos y reporte de mantenimiento):
// encabezado con los logotipos, firmas, pie y formatos de número/fecha.

export const GUINDA = [159, 34, 65];
export const TINTA = [30, 41, 59];
export const GRIS = [100, 116, 139];
export const LINEA = [226, 232, 240];
export const MARGEN = 15;

const LOGOTIPO_MUNICIPAL = encodeURI("/Logotipo municipal de Atlacomulco.png");

export const pesos = (n) => Number(n || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
export const aFecha = (iso) => new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
export const fechaLarga = (iso) =>
  iso ? aFecha(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" }) : "—";
export const cantidad = (n) => Number(n).toLocaleString("es-MX", { maximumFractionDigits: 2 });

// Carga una imagen de /public como dataURL para incrustarla en el PDF
export async function cargarImagen(src) {
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

// Logotipo municipal a la izquierda y logo de Atlacomulco a la derecha
export async function logos(doc) {
  const ancho = doc.internal.pageSize.getWidth();
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
}

/**
 * Logotipos, línea guinda, título y folio. Devuelve la "y" donde sigue el contenido.
 */
export async function encabezado(doc, { titulo, folio = "", subtitulo = "Coordinación de Parque Vehicular · Atlacomulco" }) {
  const ancho = doc.internal.pageSize.getWidth();
  await logos(doc);

  const y = 36;
  doc.setDrawColor(...GUINDA);
  doc.setLineWidth(0.8);
  doc.line(MARGEN, y - 4, ancho - MARGEN, y - 4);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...TINTA);
  doc.text(titulo, MARGEN, y + 2);
  doc.setFontSize(13);
  doc.setTextColor(...GUINDA);
  doc.text(folio, ancho - MARGEN, y + 2, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...GRIS);
  doc.text(subtitulo, MARGEN, y + 8);
  return y + 16;
}

// Pie en todas las hojas
export function pie(doc) {
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setDrawColor(...GRIS);
    doc.setLineWidth(0.4);
    doc.line(MARGEN, alto - 14, ancho - MARGEN, alto - 14);
    doc.setFontSize(7.5);
    doc.setTextColor(...GRIS);
    doc.text(
      "Palacio Municipal S/n, Col. Centro, Atlacomulco de Fabela, Estado de México. C. P. 50450, Tel. /Fax: (712)1220333, 7122020200",
      ancho / 2, alto - 10, { align: "center" }
    );
    doc.setFontSize(6.5);
    doc.text(
      `Generado: ${new Date().toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}${paginas > 1 ? ` · Página ${i} de ${paginas}` : ""}`,
      ancho - MARGEN, alto - 5.5, { align: "right" }
    );
  }
}

export function bloqueFirma(doc, { centro, y, anchoFirma, altoFirma, titulo, firma, nombre, leyenda }) {
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
