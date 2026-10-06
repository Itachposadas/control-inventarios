// src/components/ui/Boton.jsx
// Botón base del sistema. Por defecto es type="button"; para enviar un
// formulario se pasa type="submit".
//   <Boton>Guardar</Boton>
//   <Boton variante="fantasma" onClick={onClose}>Cancelar</Boton>
//   <Boton tamano="sm" icono={<Plus size={14} />}>Nuevo</Boton>

const VARIANTES = {
  primario: "bg-institucional hover:bg-institucional-dark text-white font-semibold disabled:bg-slate-300",
  contorno: "border border-institucional/30 text-institucional hover:bg-institucional/5 font-semibold disabled:opacity-50",
  secundario: "border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium disabled:opacity-50",
  fantasma: "text-slate-600 hover:bg-slate-100 font-medium disabled:opacity-50",
  peligro: "bg-red-600 hover:bg-red-700 text-white font-semibold disabled:bg-slate-300",
};

const TAMANOS = {
  sm: "gap-1.5 px-3 py-1.5 text-xs rounded-lg",
  md: "gap-1.5 px-4 py-2 text-sm rounded-lg",
  lg: "gap-2 px-6 py-3.5 text-base rounded-xl",
};

export default function Boton({
  variante = "primario",
  tamano = "md",
  icono = null,
  type = "button",
  className = "",
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center transition disabled:cursor-not-allowed
        ${VARIANTES[variante] || VARIANTES.primario} ${TAMANOS[tamano] || TAMANOS.md} ${className}`}
      {...props}
    >
      {icono}
      {children}
    </button>
  );
}
