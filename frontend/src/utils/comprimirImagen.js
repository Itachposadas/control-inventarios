// src/utils/comprimirImagen.js
// Reduce una foto del celular (3–8 MB) a JPEG de máx. 1600 px (~200–400 KB)
// antes de subirla. Respeta la orientación de la cámara (EXIF).

const MAX_LADO = 1600;
const CALIDAD = 0.82;

export async function comprimirImagen(archivo) {
  try {
    const bitmap = await createImageBitmap(archivo, { imageOrientation: "from-image" });
    const escala = Math.min(1, MAX_LADO / Math.max(bitmap.width, bitmap.height));
    const ancho = Math.round(bitmap.width * escala);
    const alto = Math.round(bitmap.height * escala);

    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, ancho, alto);
    bitmap.close?.();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", CALIDAD));
    if (!blob) return archivo;
    const nombre = (archivo.name || "foto").replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nombre, { type: "image/jpeg" });
  } catch {
    // Si el navegador no puede procesarla, se sube la original (el servidor valida tamaño y tipo)
    return archivo;
  }
}
