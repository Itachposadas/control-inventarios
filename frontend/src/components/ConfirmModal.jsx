// src/components/ConfirmModal.jsx
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Modal, Boton } from "./ui";

// tono "peligro" (eliminar, rojo) o "confirmar" (paso importante, color institucional)
const TONOS = {
  peligro: {
    fondo: "bg-red-100",
    icono: <AlertTriangle size={28} className="text-red-600" />,
    boton: "peligro",
  },
  confirmar: {
    fondo: "bg-institucional/10",
    icono: <CheckCircle2 size={28} className="text-institucional" />,
    boton: "primario",
  },
};

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = "¿Estás seguro?",
  children,
  confirmLabel = "Sí, eliminar",
  loadingLabel = "Eliminando...",
  loading = false,
  tono = "peligro",
}) {
  if (!open) return null;
  const t = TONOS[tono] || TONOS.peligro;

  return (
    <Modal ancho="max-w-md">
      <div className="p-6 text-center">
        <div className={`mx-auto w-14 h-14 rounded-full ${t.fondo} flex items-center justify-center`}>
          {t.icono}
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-800">{title}</h3>
        <div className="mt-2 text-sm text-slate-500">{children}</div>
      </div>

      <div className="px-6 pb-6 flex items-center justify-end gap-2">
        <Boton variante="fantasma" onClick={onClose} disabled={loading}>
          Cancelar
        </Boton>
        <Boton variante={t.boton} onClick={onConfirm} disabled={loading}>
          {loading ? loadingLabel : confirmLabel}
        </Boton>
      </div>
    </Modal>
  );
}
