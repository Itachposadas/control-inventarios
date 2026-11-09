// src/hooks/useCamposVacios.js
// Avisos debajo de cada campo cuando se intenta guardar sin llenarlo.
//   const { errores, validar, limpiar } = useCamposVacios();
//   if (!validar({ nombre: !nombre.trim() && "Escribe tu nombre completo" })) return;
//   <Field label="Nombre" error={errores.nombre}>
//     <input value={nombre} onChange={(e) => { setNombre(e.target.value); limpiar("nombre"); }} />
//   </Field>
// validar() muestra solo los mensajes con texto, lleva el cursor al primer campo
// que falta y regresa true si no falta nada. Los avisos se quitan al escribir.
import { useCallback, useState } from "react";

export function useCamposVacios() {
  const [errores, setErrores] = useState({});

  const validar = useCallback((reglas) => {
    const faltan = Object.fromEntries(Object.entries(reglas).filter(([, mensaje]) => mensaje));
    setErrores(faltan);
    const hayFaltantes = Object.keys(faltan).length > 0;
    if (hayFaltantes) {
      // Espera a que se pinte el aviso para llevar el cursor al primer campo vacío
      requestAnimationFrame(() => {
        document.querySelector("[data-error] :is(input, textarea, select)")?.focus();
      });
    }
    return !hayFaltantes;
  }, []);

  const limpiar = useCallback((campo) => {
    setErrores((actual) => {
      if (!actual[campo]) return actual;
      const resto = { ...actual };
      delete resto[campo];
      return resto;
    });
  }, []);

  // Quita todos los avisos (ej. al volver a abrir un formulario)
  const reiniciar = useCallback(() => setErrores({}), []);

  return { errores, validar, limpiar, reiniciar };
}
