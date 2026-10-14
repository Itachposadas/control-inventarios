// src/components/peticiones/CampoFirma.jsx
// Firma con una propuesta: si ya hay una firma guardada (ej. la de quien recibió
// la solicitud, o la última del coordinador) se muestra y se usa tal cual; con
// "Firmar de nuevo" aparece el recuadro vacío. Sin propuesta, es el recuadro.
//   <CampoFirma propuesta={firmaGuardada} leyenda="..." onChange={setFirma} invalido={...} />
// Al montar avisa onChange(propuesta) para que el formulario ya tenga la firma.
import { useEffect, useState } from "react";
import PanelFirma from "./PanelFirma";
import { Eraser } from "lucide-react";

export default function CampoFirma({ propuesta = null, leyenda = "Firma guardada.", onChange, invalido = false }) {
  const [usarPropuesta, setUsarPropuesta] = useState(Boolean(propuesta));

  useEffect(() => {
    if (propuesta) onChange(propuesta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!usarPropuesta) return <PanelFirma invalido={invalido} onChange={onChange} />;

  return (
    <div>
      <div
        className="rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center"
        style={{ height: 170 }}
      >
        <img src={propuesta} alt="Firma" className="max-h-full max-w-full object-contain p-2" />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">{leyenda}</p>
        <button
          type="button"
          onClick={() => {
            setUsarPropuesta(false);
            onChange(null);
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600
                     hover:bg-slate-100 hover:text-slate-800 transition shrink-0"
        >
          <Eraser size={14} />
          Firmar de nuevo
        </button>
      </div>
    </div>
  );
}
