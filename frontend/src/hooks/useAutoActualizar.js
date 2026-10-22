// src/hooks/useAutoActualizar.js
// Vuelve a pedir los datos de una pantalla sin recargar la página, para que lo
// que hacen otros usuarios (el área, el mecánico, el administrador) aparezca solo:
//  - cada `cada` ms mientras la pestaña está a la vista (en segundo plano no gasta datos),
//  - y en cuanto el usuario regresa a la pestaña o a la app del celular.
//
// `refrescar` debe actualizar los datos en silencio: sin mostrar "Cargando..."
// ni borrar lo que ya se ve si la petición falla.
//   useAutoActualizar(() => api.listar().then(setItems).catch(() => {}));
import { useEffect, useRef } from "react";

export const AUTO_ACTUALIZAR_MS = 20_000;

export function useAutoActualizar(refrescar, { cada = AUTO_ACTUALIZAR_MS, activo = true } = {}) {
  // Siempre la versión más reciente de `refrescar` (con los filtros actuales),
  // sin reiniciar el temporizador en cada render
  const ultimo = useRef(refrescar);
  useEffect(() => {
    ultimo.current = refrescar;
  });

  useEffect(() => {
    if (!activo) return;
    let enCurso = false;

    const ejecutar = () => {
      if (enCurso || document.visibilityState !== "visible") return;
      enCurso = true;
      Promise.resolve(ultimo.current?.()).finally(() => {
        enCurso = false;
      });
    };

    const timer = setInterval(ejecutar, cada);
    const alVolver = () => document.visibilityState === "visible" && ejecutar();
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", alVolver);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", alVolver);
    };
  }, [cada, activo]);
}
