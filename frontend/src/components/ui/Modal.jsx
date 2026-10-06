// src/components/ui/Modal.jsx
// Ventana emergente: fondo oscuro, caja blanca y (si hay título) encabezado
// con botón para cerrar.
//   <Modal titulo="Nuevo préstamo" subtitulo="..." onClose={cerrar} ancho="max-w-3xl">
//     ...contenido...
//   </Modal>
import { X } from "lucide-react";

export default function Modal({
  titulo,
  subtitulo,
  onClose,
  ancho = "max-w-lg",
  cerrarAlTocarFondo = false,
  className = "",
  children,
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 animate-fade-in"
      onClick={cerrarAlTocarFondo ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof titulo === "string" ? titulo : undefined}
        onClick={(e) => e.stopPropagation()}
        className={`animate-pop bg-white rounded-2xl shadow-xl w-full ${ancho} max-h-[90vh] overflow-y-auto ${className}`}
      >
        {titulo && (
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3 sticky top-0 bg-white z-10">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-slate-800">{titulo}</h3>
              {subtitulo && <p className="text-xs text-slate-500 mt-0.5">{subtitulo}</p>}
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 shrink-0"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
