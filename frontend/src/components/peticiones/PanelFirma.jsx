// src/components/peticiones/PanelFirma.jsx
// Recuadro para firmar con el mouse, el dedo o un lápiz (pointer events).
// Al terminar cada trazo avisa con onChange(dataURL PNG); al limpiar, onChange(null).
import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";

const ALTO = 170; // px en pantalla
const TINTA = "#0f172a";

export default function PanelFirma({ onChange, invalido = false }) {
  const canvasRef = useRef(null);
  const dibujando = useRef(false);
  const ultimo = useRef(null);
  const [vacio, setVacio] = useState(true);

  // Resolución interna según la pantalla (máximo 2x) para que el trazo se vea nítido
  useEffect(() => {
    const c = canvasRef.current;
    const escala = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.round(c.clientWidth * escala);
    c.height = Math.round(ALTO * escala);
    const ctx = c.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = TINTA;
    ctx.lineWidth = 2.2 * escala;
  }, []);

  // Posición del puntero en coordenadas del canvas (aunque cambie de tamaño en pantalla)
  const punto = (e) => {
    const c = canvasRef.current;
    const r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) * c.width) / r.width,
      y: ((e.clientY - r.top) * c.height) / r.height,
    };
  };

  const empezar = (e) => {
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    dibujando.current = true;
    ultimo.current = punto(e);
    // Un punto aunque no se mueva el puntero
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.arc(ultimo.current.x, ultimo.current.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = TINTA;
    ctx.fill();
  };

  const mover = (e) => {
    if (!dibujando.current) return;
    const p = punto(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(ultimo.current.x, ultimo.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ultimo.current = p;
  };

  const terminar = () => {
    if (!dibujando.current) return;
    dibujando.current = false;
    setVacio(false);
    onChange(canvasRef.current.toDataURL("image/png"));
  };

  const limpiar = () => {
    const c = canvasRef.current;
    c.getContext("2d").clearRect(0, 0, c.width, c.height);
    setVacio(true);
    onChange(null);
  };

  return (
    <div>
      <div
        className={`relative rounded-xl border-2 border-dashed bg-white transition
          ${invalido ? "border-red-300" : "border-slate-300"}`}
      >
        <canvas
          ref={canvasRef}
          style={{ height: ALTO, touchAction: "none" }}
          className="block w-full rounded-xl cursor-crosshair"
          role="img"
          aria-label="Recuadro para la firma del solicitante"
          onPointerDown={empezar}
          onPointerMove={mover}
          onPointerUp={terminar}
          onPointerCancel={terminar}
        />
        {/* Línea y leyenda de firma */}
        <span aria-hidden className="pointer-events-none absolute left-6 right-6 bottom-8 border-b border-slate-300" />
        {vacio && (
          <span className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm text-slate-400">
            Firme aquí
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">Firma con el mouse o con el dedo en pantallas táctiles.</p>
        <button
          type="button"
          onClick={limpiar}
          disabled={vacio}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600
                     hover:bg-slate-100 hover:text-slate-800 transition disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <Eraser size={14} />
          Limpiar
        </button>
      </div>
    </div>
  );
}
