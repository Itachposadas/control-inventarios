// src/utils/logos.js
// Qué imagen usar para cada logotipo: la que subió el administrador o la original.
// El estado se guarda en localStorage para que al abrir el sistema no aparezca
// un instante el logo anterior.
//   const src = useLogo("ayuntamiento");           // en componentes
//   urlLogo("logotipo_municipal")                   // fuera de React (PDF)
import { useSyncExternalStore } from "react";
import { API_URL } from "../api/client";
import { ORIGINAL } from "../config/logos";

const CLAVE_CACHE = "logos";
let estado = leerCache(); // { clave: { personalizado, version } }
const suscriptores = new Set();

function leerCache() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_CACHE)) || {};
  } catch {
    return {};
  }
}

function publicar(nuevo) {
  estado = nuevo || {};
  try {
    localStorage.setItem(CLAVE_CACHE, JSON.stringify(estado));
  } catch {
    // sin localStorage se usan los logos sin caché
  }
  suscriptores.forEach((fn) => fn());
}

/** Pide al backend qué logotipos están cambiados (no requiere sesión). */
export async function cargarLogos() {
  try {
    const r = await fetch(`${API_URL}/logos`);
    if (r.ok) publicar(await r.json());
  } catch {
    // sin conexión se quedan los de la caché o los originales
  }
}

/** Actualiza un logotipo después de cambiarlo o restaurarlo en Administración. */
export function actualizarLogo(info) {
  publicar({ ...estado, [info.clave]: info });
}

export const esPersonalizado = (clave) => Boolean(estado[clave]?.personalizado);

export function urlLogo(clave) {
  const info = estado[clave];
  return info?.personalizado ? `${API_URL}/logos/${clave}?v=${info.version}` : ORIGINAL[clave];
}

function suscribir(fn) {
  suscriptores.add(fn);
  return () => suscriptores.delete(fn);
}

export function useLogo(clave) {
  useSyncExternalStore(suscribir, () => estado);
  return urlLogo(clave);
}
