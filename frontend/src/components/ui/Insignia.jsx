// src/components/ui/Insignia.jsx
// Etiqueta pequeña de color (estado, pendiente, contadores...).
//   <Insignia tono="ambar">Pendiente</Insignia>
// "tono" acepta un nombre de la lista o directamente las clases de color.

const TONOS = {
  gris: "bg-slate-100 text-slate-700",
  verde: "bg-emerald-100 text-emerald-700",
  ambar: "bg-amber-100 text-amber-800",
  rojo: "bg-red-100 text-red-700",
  azul: "bg-blue-100 text-blue-700",
  institucional: "bg-institucional/10 text-institucional",
};

export default function Insignia({ tono = "gris", icono = null, className = "", children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full
        ${TONOS[tono] ?? tono} ${className}`}
    >
      {icono}
      {children}
    </span>
  );
}
