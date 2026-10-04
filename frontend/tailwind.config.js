/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          900: "#1e3a8a",
        },
        institucional: {
          DEFAULT: "#9F2241",
          dark:    "#7d1a33",
          light:   "#b83a58",
        },

        lienzo: "#faf9f8",  // fondo claro
        tinta:  "#1e293b",  // texto oscuro
      },
     
      fontFamily: {
        sans: ['"Inter"', "system-ui", "sans-serif"],
      },

      // Animaciones del sistema: cortas (≤ 0.4 s) y sutiles.
      // Con "reducir movimiento" activado se desactivan (ver index.css).
      // Las animaciones terminan en "transform: none": un transform que se queda
      // aplicado haría que ventanas y barras fijas (position: fixed) se
      // posicionen dentro del elemento en lugar de sobre toda la pantalla.
      keyframes: {
        // Entrada de tarjetas
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "none" },
        },
        // Entrada de cada pantalla (solo opacidad, por la misma razón)
        "page-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        // Fondos oscuros de ventanas y fotos que terminan de cargar
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        // Menús desplegables y ventanas (pequeño zoom)
        pop: {
          "0%": { opacity: "0", transform: "scale(0.96) translateY(-4px)" },
          "100%": { opacity: "1", transform: "none" },
        },
        // Barras de proporción que crecen desde cero
        "grow-x": {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
        // Campana cuando llega un pendiente nuevo
        ring: {
          "0%, 100%": { transform: "rotate(0)" },
          "15%": { transform: "rotate(14deg)" },
          "30%": { transform: "rotate(-12deg)" },
          "45%": { transform: "rotate(8deg)" },
          "60%": { transform: "rotate(-6deg)" },
          "75%": { transform: "rotate(3deg)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out backwards",
        "page-in": "page-in 0.3s ease-out backwards",
        "fade-in": "fade-in 0.2s ease-out backwards",
        pop: "pop 0.18s ease-out backwards",
        "grow-x": "grow-x 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards",
        ring: "ring 0.9s ease-in-out",
      },
    },
  },
  plugins: [],
};