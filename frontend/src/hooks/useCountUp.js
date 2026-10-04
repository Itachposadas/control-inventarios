// src/hooks/useCountUp.js
import { useEffect, useRef, useState } from "react";

const reduceMovimiento = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Anima un número desde su valor anterior (0 la primera vez) hasta `valor`.
 * Si `valor` no es número (ej. "$4,500" o "—"), lo regresa tal cual.
 */
export function useCountUp(valor, duracion = 700) {
  const esNumero = typeof valor === "number" && Number.isFinite(valor);
  const [mostrado, setMostrado] = useState(esNumero ? 0 : valor);
  const desde = useRef(0);

  useEffect(() => {
    if (!esNumero) {
      setMostrado(valor);
      return;
    }
    if (reduceMovimiento()) {
      setMostrado(valor);
      desde.current = valor;
      return;
    }

    const inicio = performance.now();
    const origen = desde.current;
    let frame;
    const paso = (ahora) => {
      const t = Math.min(1, (ahora - inicio) / duracion);
      const suave = 1 - Math.pow(1 - t, 3); // desacelera al final
      setMostrado(Math.round(origen + (valor - origen) * suave));
      if (t < 1) frame = requestAnimationFrame(paso);
      else desde.current = valor;
    };
    frame = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(frame);
  }, [valor, esNumero, duracion]);

  return mostrado;
}
