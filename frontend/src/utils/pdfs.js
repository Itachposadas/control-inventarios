// src/utils/pdfs.js
// Punto de entrada de los formatos PDF. Cada generador (y jsPDF con él) se
// descarga hasta que alguien pulsa "Descargar", no al abrir el sistema:
// así una cuenta de área en celular no baja el generador de PDF al entrar.
export const descargarSolicitudPdf = async (...args) =>
  (await import("./solicitudPdf")).descargarSolicitudPdf(...args);

export const descargarDiagnosticoPdf = async (...args) =>
  (await import("./diagnosticoPdf")).descargarDiagnosticoPdf(...args);

export const descargarIngresoPdf = async (...args) =>
  (await import("./ingresoPdf")).descargarIngresoPdf(...args);

export const descargarOrdenCompraPdf = async (...args) =>
  (await import("./ordenCompraPdf")).descargarOrdenCompraPdf(...args);

export const descargarEntregaPdf = async (...args) =>
  (await import("./entregaPdf")).descargarEntregaPdf(...args);
