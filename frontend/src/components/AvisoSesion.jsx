// src/components/AvisoSesion.jsx
// Aviso de que la sesión está por cerrarse por inactividad, con cuenta regresiva.
// "Seguir conectado" renueva la sesión; si no se responde, se cierra sola.
import { useEffect, useState } from "react";
import { Modal, Boton } from "./ui";
import { Clock, LogOut } from "lucide-react";

export default function AvisoSesion({ vence, onSeguir, onSalir }) {
  const [resta, setResta] = useState(() => Math.max(0, vence - Date.now()));

  useEffect(() => {
    const timer = setInterval(() => {
      const r = Math.max(0, vence - Date.now());
      setResta(r);
      if (r === 0) onSalir();
    }, 1000);
    return () => clearInterval(timer);
  }, [vence, onSalir]);

  const segundos = Math.ceil(resta / 1000);
  const texto = segundos >= 60
    ? `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")} min`
    : `${segundos} s`;

  return (
    <Modal ancho="max-w-sm">
      <div className="p-6 text-center" role="alertdialog" aria-live="assertive" aria-labelledby="aviso-sesion-titulo">
        <span className="mx-auto w-12 h-12 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center">
          <Clock size={24} />
        </span>
        <h3 id="aviso-sesion-titulo" className="mt-4 text-lg font-semibold text-slate-800">
          Tu sesión está por cerrarse
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          No ha habido actividad. Se cerrará en <span className="font-bold tabular-nums">{texto}</span> para
          proteger la información.
        </p>
        <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 justify-center">
          <Boton variante="secundario" onClick={onSalir} icono={<LogOut size={16} />}>
            Cerrar sesión
          </Boton>
          <Boton onClick={onSeguir} autoFocus>
            Seguir conectado
          </Boton>
        </div>
      </div>
    </Modal>
  );
}
