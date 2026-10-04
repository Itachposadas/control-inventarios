// src/components/ErrorBoundary.jsx
// Si una pantalla falla por un error inesperado, en lugar de dejar la página
// en blanco se muestra un aviso con opciones para recuperarse.
import { Component } from "react";
import { AlertTriangle, RotateCw, Home } from "lucide-react";

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Queda en la consola del navegador (F12) para poder revisarlo
    console.error("Error en la pantalla:", error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    // Al cambiar de pantalla se vuelve a intentar mostrarla
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] p-4">
        <div className="animate-pop bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-md text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle size={28} className="text-amber-600" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-800">Algo salió mal en esta pantalla</h2>
          <p className="mt-2 text-sm text-slate-500">
            Tu información guardada no se perdió. Recarga la página para continuar; si vuelve a pasar,
            avisa al administrador.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#9F2241]
                         hover:bg-[#7d1a33] text-white text-sm font-semibold transition"
            >
              <RotateCw size={15} />
              Recargar
            </button>
            <button
              onClick={() => { window.location.href = "/"; }}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200
                         text-slate-600 hover:bg-slate-50 text-sm font-medium transition"
            >
              <Home size={15} />
              Ir al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }
}
