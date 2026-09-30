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

      // Entrada suave (login)
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};