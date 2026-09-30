// src/components/vehiculos/VehiculoModal.jsx
import { useEffect, useState } from "react";
import { X } from "lucide-react";

export default function VehiculoModal({ open, onClose, onSave, vehiculo = null }) {
  const editando = Boolean(vehiculo);

  const [form, setForm] = useState({
    np: "",
    no_inventario: "",
    area: "",
    unidad: "",
    descripcion: "",
    modelo: "",
    marca: "",
    serie: "",
    no_motor: "",
    placas: "",
    numero_economico: "",
    estado: "activo",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        np: vehiculo?.np ?? "",
        no_inventario: vehiculo?.noInventario || "",
        area: vehiculo?.area || "",
        unidad: vehiculo?.unidad || "",
        descripcion: vehiculo?.descripcion || "",
        modelo: vehiculo?.modelo || "",
        marca: vehiculo?.marca || "",
        serie: vehiculo?.serie || "",
        no_motor: vehiculo?.noMotor || "",
        placas: vehiculo?.placas || "",
        numero_economico: vehiculo?.numeroEconomico || "",
        estado: vehiculo?.estado || "activo",
      });
      setError("");
      setSaving(false);
    }
  }, [open, vehiculo]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.no_inventario.trim()) {
      return setError("El No. de Inventario es obligatorio");
    }
    if (!form.area.trim()) {
      return setError("El Área es obligatoria");
    }

    setSaving(true);
    try {
      const payload = {
        np: form.np ? Number(form.np) : null,
        no_inventario: form.no_inventario.trim(),
        area: form.area.trim(),
        unidad: form.unidad.trim(),
        descripcion: form.descripcion.trim(),
        modelo: form.modelo.trim(),
        marca: form.marca.trim(),
        serie: form.serie.trim(),
        no_motor: form.no_motor.trim(),
        placas: form.placas.trim(),
        numero_economico: form.numero_economico.trim(),
        estado: form.estado,
      };

      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.msg || "Error al guardar el vehículo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              {editando ? "Editar vehículo" : "Registrar nuevo vehículo"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {editando
                ? "Modifica los datos del vehículo"
                : "Ingresa los datos del inventario vehicular"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
            <div className="sm:col-span-1">
              <Label>N.P.</Label>
              <input
                name="np"
                type="number"
                value={form.np}
                onChange={handleChange}
                placeholder="1"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-3">
              <Label required>No. Inventario</Label>
              <input
                name="no_inventario"
                value={form.no_inventario}
                onChange={handleChange}
                required
                placeholder="ATL024 A00100-27"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <Label required>Área</Label>
              <input
                name="area"
                value={form.area}
                onChange={handleChange}
                required
                placeholder="ALUMBRADO PUBLICO"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Unidad</Label>
              <input
                name="unidad"
                value={form.unidad}
                onChange={handleChange}
                placeholder="VW POLO"
                className={inputClass}
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <input
                name="descripcion"
                value={form.descripcion}
                onChange={handleChange}
                placeholder="VW POLO"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Modelo</Label>
              <input
                name="modelo"
                value={form.modelo}
                onChange={handleChange}
                placeholder="2003"
                className={inputClass}
              />
            </div>
            <div>
              <Label>Marca</Label>
              <input
                name="marca"
                value={form.marca}
                onChange={handleChange}
                placeholder="VW"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Serie</Label>
              <input
                name="serie"
                value={form.serie}
                onChange={handleChange}
                placeholder="08RM-0004A3P043115"
                className={inputClass}
              />
            </div>
            <div>
              <Label>No. Motor</Label>
              <input
                name="no_motor"
                value={form.no_motor}
                onChange={handleChange}
                placeholder="SAH 000191"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Placas</Label>
              <input
                name="placas"
                value={form.placas}
                onChange={handleChange}
                placeholder="LX33103"
                className={inputClass}
              />
            </div>
            <div>
              <Label>Número Económico</Label>
              <input
                name="numero_economico"
                value={form.numero_economico}
                onChange={handleChange}
                placeholder="PV-204"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label required>Estado</Label>
              <select
                name="estado"
                value={form.estado}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="activo">Activo</option>
                <option value="mantenimiento">En mantenimiento</option>
                <option value="baja">Baja</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg
                         text-slate-600 hover:bg-slate-100 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold rounded-lg
                         bg-[#9F2241] hover:bg-[#7d1a33]
                         text-white disabled:bg-slate-300
                         disabled:cursor-not-allowed transition"
            >
              {saving
                ? "Guardando..."
                : editando
                ? "Guardar cambios"
                : "Registrar vehículo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputClass = `
  w-full px-3 py-2 rounded-lg border border-slate-200
  text-sm text-slate-800 placeholder-slate-400
  focus:outline-none focus:border-[#9F2241]
  focus:ring-2 focus:ring-[#9F2241]/15 transition
`;

function Label({ children, required = false }) {
  return (
    <label className="block text-sm font-medium text-slate-700 mb-1">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );
}