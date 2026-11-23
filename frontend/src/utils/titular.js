// src/utils/titular.js
// Quién firma como titular de la Coordinación de Parque Vehicular en cada
// documento. Lo cambia administración (pantalla "Coordinación"); se guarda
// el historial y cada formato usa al titular vigente EN SU FECHA, así una
// solicitud de hace meses sigue dirigida a quien era jefe entonces.
import { useEffect, useState } from "react";
import { coordinacionApi } from "../api/coordinacion";
import { AUTORIZA } from "../config/ordenCompra";

// La lista casi nunca cambia: se pide una vez y se reutiliza unos minutos
const VIGENCIA_MS = 5 * 60 * 1000;
let cache = null; // { promesa, at }

export function cargarTitulares(forzar = false) {
  if (forzar || !cache || Date.now() - cache.at > VIGENCIA_MS) {
    const promesa = coordinacionApi.titulares().catch(() => {
      cache = null; // sin conexión: se vuelve a intentar la próxima vez
      return [];
    });
    cache = { promesa, at: Date.now() };
  }
  return cache.promesa;
}

// "AAAA-MM-DD" en hora local (el backend manda fechas UTC sin zona)
function diaLocal(fecha) {
  let d = fecha instanceof Date ? fecha : null;
  if (!d && typeof fecha === "string" && fecha) {
    d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha.endsWith("Z") ? fecha : `${fecha}Z`);
  }
  if (!d || Number.isNaN(d.getTime())) d = new Date();
  return d.toLocaleDateString("en-CA");
}

/** Titular vigente en esa fecha (sin fecha = hoy). La lista viene ordenada. */
export function titularEn(lista, fecha) {
  const dia = diaLocal(fecha);
  let elegido = null;
  for (const t of lista || []) {
    if (!t.desde || t.desde <= dia) elegido = t;
  }
  return elegido || (lista && lista[0]) || AUTORIZA;
}

/** Para los PDF: { nombre, cargo } de quien era titular en la fecha del documento. */
export async function autorizaEn(fecha) {
  return titularEn(await cargarTitulares(), fecha);
}

/** Para las pantallas: titular actual (null mientras carga). */
export function useTitularActual() {
  const [titular, setTitular] = useState(null);
  useEffect(() => {
    let vivo = true;
    cargarTitulares().then((lista) => vivo && setTitular(titularEn(lista)));
    return () => { vivo = false; };
  }, []);
  return titular;
}
