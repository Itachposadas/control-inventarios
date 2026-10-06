// src/components/ui/Alerta.jsx
// Mensaje en recuadro de color (errores, avisos, confirmaciones).
//   <Alerta>{error}</Alerta>
//   <Alerta tipo="exito" icono={<CheckCircle2 size={16} />}>Guardado</Alerta>

const TIPOS = {
  error: "bg-red-50 border-red-200 text-red-700",
  exito: "bg-emerald-50 border-emerald-200 text-emerald-700",
  aviso: "bg-amber-50 border-amber-200 text-amber-800",
  info: "bg-blue-50 border-blue-100 text-blue-800",
};

export default function Alerta({ tipo = "error", icono = null, className = "", children }) {
  return (
    <div
      role={tipo === "error" ? "alert" : "status"}
      className={`border text-sm p-3 rounded-lg ${icono ? "flex items-start gap-2" : ""}
        ${TIPOS[tipo] || TIPOS.error} ${className}`}
    >
      {icono && <span className="shrink-0 mt-0.5">{icono}</span>}
      {icono ? <div className="min-w-0">{children}</div> : children}
    </div>
  );
}
