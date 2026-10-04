// src/components/ConfirmModal.jsx
import { AlertTriangle } from "lucide-react";

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = "¿Estás seguro?",
  children,
  confirmLabel = "Sí, eliminar",
  loadingLabel = "Eliminando...",
  loading = false,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 animate-fade-in">
      <div className="animate-pop bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-red-100
                          flex items-center justify-center">
            <AlertTriangle size={28} className="text-red-600" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-800">{title}</h3>
          <div className="mt-2 text-sm text-slate-500">{children}</div>
        </div>

        <div className="px-6 pb-6 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium rounded-lg
                       text-slate-600 hover:bg-slate-100 transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold rounded-lg
                       bg-red-600 hover:bg-red-700 text-white
                       disabled:bg-slate-300 disabled:cursor-not-allowed transition"
          >
            {loading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
