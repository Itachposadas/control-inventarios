// src/hooks/useDebounce.js
// Retrasa un valor hasta que se deja de escribir (debounce). Se usa en las
// búsquedas y en el autocompletado para no filtrar ni consultar al servidor en
// cada tecla.
//   const texto = useDebounce(q);                 // valor diferido
//   const consulta = useBusquedaDiferida(filters); // solo "q" espera; los demás filtros van al instante
import { useEffect, useMemo, useState } from "react";

// Milisegundos que se espera después de la última tecla
export const RETRASO_BUSQUEDA = 300;

export function useDebounce(valor, retraso = RETRASO_BUSQUEDA) {
  const [diferido, setDiferido] = useState(valor);

  useEffect(() => {
    // Al borrar la búsqueda se muestra todo de inmediato
    if (valor === "" || valor === null || valor === undefined) {
      setDiferido(valor);
      return undefined;
    }
    const t = setTimeout(() => setDiferido(valor), retraso);
    return () => clearTimeout(t);
  }, [valor, retraso]);

  return diferido;
}

/**
 * Filtros con el texto de búsqueda diferido (y sin espacios al inicio/fin).
 * Devuelve el mismo objeto mientras no cambie ningún valor, así sirve como
 * dependencia de un useEffect sin repetir consultas.
 */
export function useBusquedaDiferida(filtros, campo = "q", retraso = RETRASO_BUSQUEDA) {
  const texto = useDebounce((filtros[campo] || "").trim(), retraso);
  const clave = JSON.stringify({ ...filtros, [campo]: texto });
  return useMemo(() => JSON.parse(clave), [clave]);
}
