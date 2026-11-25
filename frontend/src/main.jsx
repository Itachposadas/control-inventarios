import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { cargarLogos } from "./utils/logos";

// Logotipos cambiados en Administración (sin esperar: mientras tanto se usan los de la caché)
cargarLogos();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);