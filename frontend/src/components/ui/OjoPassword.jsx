// src/components/ui/OjoPassword.jsx
// Ojo animado de "mostrar contraseña": abierto = la contraseña se ve;
// al ocultarla el párpado baja, la pupila se encoge y aparecen las pestañas.
//   <OjoPassword abierto={ver} size={18} />
// Solo se animan transform y opacity (funciona igual en todos los navegadores).

const CURVA = "cubic-bezier(0.32, 0.72, 0, 1)";

export default function OjoPassword({ abierto, size = 18, className = "" }) {
  const t = (ms, retraso = 0) => `transform ${ms}ms ${CURVA} ${retraso}ms, opacity ${ms}ms ${CURVA} ${retraso}ms`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`ojo-password ${className}`}
    >
      {/* Párpado inferior (fijo): cuando el ojo se cierra, el superior cae sobre él */}
      <path d="M2 12 Q12 20 22 12" />

      {/* Párpado superior: se voltea sobre la línea del ojo para cerrarlo */}
      <path
        d="M2 12 Q12 4 22 12"
        style={{
          transformOrigin: "12px 12px",
          transform: abierto ? "scaleY(1)" : "scaleY(-1)",
          transition: t(260),
        }}
      />

      {/* Pupila: se encoge un poco antes de que baje el párpado y vuelve después de abrir */}
      <circle
        cx="12"
        cy="12"
        r="3"
        style={{
          transformOrigin: "12px 12px",
          transform: abierto ? "scale(1)" : "scale(0.2)",
          opacity: abierto ? 1 : 0,
          transition: t(abierto ? 220 : 160, abierto ? 90 : 0),
        }}
      />

      {/* Pestañas: salen cuando el ojo ya está cerrado */}
      <g
        style={{
          transformOrigin: "12px 15px",
          transform: abierto ? "translateY(-2px) scaleY(0.4)" : "translateY(0) scaleY(1)",
          opacity: abierto ? 0 : 1,
          transition: t(abierto ? 120 : 220, abierto ? 0 : 120),
        }}
      >
        <path d="M7 15 L5.5 17.5" />
        <path d="M12 16 L12 19" />
        <path d="M17 15 L18.5 17.5" />
      </g>
    </svg>
  );
}
