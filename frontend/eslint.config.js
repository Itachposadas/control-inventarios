// eslint.config.js
// Revisión del código del frontend: `pnpm lint`
//  - Reglas recomendadas de JavaScript (variables sin usar, errores comunes)
//  - Reglas de los hooks de React (orden de los hooks y dependencias de useEffect)
//  - Fast Refresh de Vite: los archivos de componentes solo deben exportar componentes
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  { ignores: ["dist", "node_modules"] },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Ayudantes que viven junto a su componente (no afectan la recarga en caliente)
      "react-refresh/only-export-components": ["warn", {
        allowConstantExport: true,
        allowExportNames: ["useAuth", "materialVacio", "validarMateriales", "paraEnviar", "datosDesdeVehiculo", "FOTOS"],
      }],
      // Los argumentos que empiezan con _ son intencionalmente ignorados
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    // Configuración de Node (Vite, Tailwind, PostCSS)
    files: ["*.config.js"],
    languageOptions: { globals: globals.node },
  },
];
