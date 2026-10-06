// src/components/vehiculos/VehiculoModal.jsx
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { vehiculosApi } from "../../api/vehiculos";
import { Modal, Boton, Alerta, inputClass } from "../ui";

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
    color: "",
    estado: "activo",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [areas, setAreas] = useState([]);
  const [nuevaArea, setNuevaArea] = useState(false);

  useEffect(() => {
    if (open) {
      vehiculosApi.areas().then(setAreas).catch(() => setAreas([]));
      setNuevaArea(false);
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
        color: vehiculo?.color || "",
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
        color: form.color.trim(),
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
    <Modal
      titulo={editando ? "Editar vehículo" : "Registrar nuevo vehículo"}
      subtitulo={editando ? "Modifica los datos del vehículo" : "Ingresa los datos del inventario vehicular"}
      onClose={onClose}
      ancho="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && <Alerta>{error}</Alerta>}

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
            <div className="flex items-center justify-between">
              <Label required>Área</Label>
              <button
                type="button"
                onClick={() => {
                  setNuevaArea((v) => !v);
                  setForm((f) => ({ ...f, area: "" }));
                }}
                className="mb-1 inline-flex items-center gap-1 text-xs font-medium
                           text-institucional hover:underline"
              >
                {nuevaArea ? (
                  "Elegir existente"
                ) : (
                  <>
                    <Plus size={12} /> Nueva área
                  </>
                )}
              </button>
            </div>
            {nuevaArea ? (
              <input
                name="area"
                value={form.area}
                onChange={handleChange}
                required
                autoFocus
                placeholder="Nombre de la nueva área"
                className={inputClass}
              />
            ) : (
              <select
                name="area"
                value={form.area}
                onChange={handleChange}
                required
                className={inputClass}
              >
                <option value="">Selecciona un área</option>
                {/* Conserva el área actual aunque no venga en la lista */}
                {form.area && !areas.includes(form.area) && (
                  <option value={form.area}>{form.area}</option>
                )}
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            )}
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
            <Label>Color</Label>
            <input
              name="color"
              value={form.color}
              onChange={handleChange}
              placeholder="Blanco"
              className={inputClass}
            />
          </div>
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
          <Boton variante="fantasma" onClick={onClose}>
            Cancelar
          </Boton>
          <Boton type="submit" disabled={saving}>
            {saving ? "Guardando..." : editando ? "Guardar cambios" : "Registrar vehículo"}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}

function Label({ children, required = false }) {
  return (
    <label className="block text-sm font-medium text-slate-700 mb-1">
      {children} {required && <span className="text-red-600">*</span>}
    </label>
  );
}