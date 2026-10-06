// src/pages/admin/vehiculos/VehiculosList.jsx
// Catálogo de vehículos. Admin: lo administra. Mecánico: solo lo consulta.
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "../../../layouts/DashboardLayout";
import { menusForRole } from "../../../config/menus";
import { ROLES, VEHICULOS_BASE } from "../../../config/roles";
import { useAuth } from "../../../context/AuthContext";
import FiltrosVehiculos from "../../../components/vehiculos/FiltrosVehiculos";
import VehiculoCard from "../../../components/vehiculos/VehiculoCard";
import VehiculoModal from "../../../components/vehiculos/VehiculoModal";
import { vehiculosApi } from "../../../api/vehiculos";
import {
  CarFront, Loader2, Plus,
} from "lucide-react";

import { Boton, Alerta } from "../../../components/ui";
export default function VehiculosList() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { menu, secondaryMenu } = menusForRole(role);
  const esAdmin = role === ROLES.ADMIN;
  const basePath = VEHICULOS_BASE[role];
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({ q: "", area: "", estado: "" });
  const [vehiculos, setVehiculos] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [vehiculoEditando, setVehiculoEditando] = useState(null);

  // Cargar áreas
  const cargarAreas = () => {
    vehiculosApi.areas().then(setAreas).catch(() => {});
  };

  useEffect(() => {
    cargarAreas();
  }, []);

  // Abrir modal si viene con ?nuevo=1
useEffect(() => {
  if (esAdmin && searchParams.get("nuevo") === "1") {
    setVehiculoEditando(null);
    setModalOpen(true);
    // Limpiar el query param para que no se reabra al recargar
    setSearchParams({}, { replace: true });
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [searchParams]);

  // Cargar vehículos cada vez que cambian los filtros
  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError("");

    const timer = setTimeout(() => {
      vehiculosApi
        .listar(filters)
        .then((data) => {
          if (!cancel) setVehiculos(data);
        })
        .catch((e) => {
          console.error(e);
          if (!cancel) setError("Error al cargar vehículos");
        })
        .finally(() => {
          if (!cancel) setLoading(false);
        });
    }, 250);

    return () => {
      cancel = true;
      clearTimeout(timer);
    };
  }, [filters]);

  const handleNuevo = () => {
    setVehiculoEditando(null);
    setModalOpen(true);
  };

  const handleSave = async (payload) => {
    if (vehiculoEditando) {
      await vehiculosApi.editar(vehiculoEditando.id, payload);
    } else {
      await vehiculosApi.crear(payload);
    }
    // Recargar áreas y vehículos
    cargarAreas();
    const data = await vehiculosApi.listar(filters);
    setVehiculos(data);
  };

  return (
    <DashboardLayout
      menu={menu}
      secondaryMenu={secondaryMenu}
      title="Vehículos"
      subtitle={
        esAdmin
          ? "Inventario completo del parque vehicular"
          : "Consulta el historial y registra el ingreso a taller"
      }
    >
      {/* Barra superior: filtros + botón nuevo */}
      <div className="mb-5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="flex-1">
          <FiltrosVehiculos
            filters={filters}
            onChange={setFilters}
            onClear={() => setFilters({ q: "", area: "", estado: "" })}
            total={vehiculos.length}
            areasFromApi={areas}
          />
        </div>

        {esAdmin && (
          <Boton
            onClick={handleNuevo}
            icono={<Plus size={16} />}
            className="shrink-0 self-start sm:self-center"
          >
            Nuevo vehículo
          </Boton>
        )}
      </div>

      {error && (
        <Alerta className="mb-4">{error}</Alerta>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 size={28} className="animate-spin" />
          <span className="ml-3 text-sm">Cargando vehículos...</span>
        </div>
      ) : vehiculos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <CarFront size={48} className="mx-auto text-slate-300" />
          <p className="mt-4 text-sm font-medium text-slate-700">
            No se encontraron vehículos
          </p>
        </div>
      ) : (
        <div className="stagger grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {vehiculos.map((v) => (
            <VehiculoCard
              key={v.id}
              vehiculo={v}
              serviciosCount={v.servicios || 0}
              onClick={() => navigate(`${basePath}/${v.id}`)}
            />
          ))}
        </div>
      )}

      {/* Modal de crear/editar (solo admin) */}
      {esAdmin && (
        <VehiculoModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          vehiculo={vehiculoEditando}
        />
      )}
    </DashboardLayout>
  );
}