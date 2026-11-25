// src/config/logos.js
// Logotipos que el administrador puede cambiar en Administración › Logotipos.
// "original" es la imagen de frontend/public que se usa mientras no se suba otra.
export const LOGOS = [
  {
    clave: "ayuntamiento",
    nombre: "Logo del H. Ayuntamiento de Atlacomulco",
    original: "/logo-atlacomulco.png",
    usos: "Menú lateral, inicio de sesión, página de inicio, formatos en pantalla y esquina derecha de los documentos PDF.",
    recomendacion: "PNG o JPG horizontal con fondo blanco o transparente.",
  },
  {
    clave: "logotipo_municipal",
    nombre: "Logotipo municipal",
    original: encodeURI("/Logotipo municipal de Atlacomulco.png"),
    usos: "Esquina izquierda de todos los documentos PDF (solicitud, diagnóstico, ingreso, orden de compra, entrega y reporte).",
    recomendacion: "PNG con fondo transparente; se imprime tal como se sube.",
  },
  {
    clave: "gobierno_estado",
    nombre: "Logo del Gobierno del Estado de México",
    original: "/gobierno-estado.png",
    usos: "Inicio de sesión y pie de la página de inicio.",
    recomendacion: "PNG o JPG horizontal con fondo blanco o transparente.",
  },
  {
    clave: "marca_agua",
    nombre: "Marca de agua",
    original: "/atlacomulco-trazo.png",
    usos: "Silueta decorativa de fondo en la página de inicio, el inicio de sesión y el cambio de contraseña.",
    recomendacion: "PNG o WEBP con fondo transparente. Solo se usa la silueta: el color lo pone el sistema.",
    silueta: true,
  },
];

export const ORIGINAL = Object.fromEntries(LOGOS.map((l) => [l.clave, l.original]));
