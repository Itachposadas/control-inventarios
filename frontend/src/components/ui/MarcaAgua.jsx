// src/components/ui/MarcaAgua.jsx
// Ícono del logotipo municipal de Atlacomulco (solo los trazos) como marca de
// agua decorativa. El color lo da la clase de fondo, porque la imagen se usa
// como máscara: public/atlacomulco-trazo.png (trazos sobre transparente).
//   <MarcaAgua className="bg-institucional opacity-[0.06] h-[90%] -right-24 -bottom-16" />
const MASCARA = {
  maskImage: "url(/atlacomulco-trazo.png)",
  WebkitMaskImage: "url(/atlacomulco-trazo.png)",
  maskSize: "contain",
  WebkitMaskSize: "contain",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
  maskPosition: "center",
  WebkitMaskPosition: "center",
};

export default function MarcaAgua({ className = "" }) {
  return (
    <div
      aria-hidden
      className={`absolute pointer-events-none select-none aspect-[416/650] ${className}`}
      style={MASCARA}
    />
  );
}
