// src/pages/admin/usuarios/UsuariosList.jsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "../../../layouts/DashboardLayout";
import { ADMIN_MENU, ADMIN_SECONDARY_MENU } from "../../../config/menus";
import UsuarioModal from "../../../components/usuarios/UsuarioModal";
import ConfirmModal from "../../../components/ConfirmModal";
import { usuariosApi } from "../../../api/usuarios";
import {
  Users, Plus, Search, X, Eye, Pencil, Trash2, Shield, Package, Wrench, Building2,
  Loader2,
} from "lucide-react";

import { Boton, Alerta } from "../../../components/ui";
const ROLE_CONFIG = {
  admin:    { label: "Administrador", color: "bg-institucional/10 text-institucional", icon: <Shield size={14} /> },
  // Rol retirado; solo para mostrar cuentas antiguas
  almacen:  { label: "Almacén (sin acceso)", color: "bg-slate-100 text-slate-500", icon: <Package size={14} /> },
  mecanico: { label: "Mecánico",      color: "bg-emerald-100 text-emerald-700", icon: <Wrench size={14} /> },
  area:     { label: "Área",          color: "bg-sky-100 text-sky-700",         icon: <Building2 size={14} /> },
};

export default function UsuariosList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ q: "", role: "", activo: "" });

  const [modalOpen, setModalOpen] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, usuario: null, loading: false });

  const cargarUsuarios = () => {
    setLoading(true);
    setError("");
    usuariosApi
      .listar(filters)
      .then(setUsuarios)
      .catch((e) => {
        console.error(e);
        setError("Error al cargar usuarios");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(cargarUsuarios, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleNuevo = () => {
    setUsuarioEditando(null);
    setModalOpen(true);
  };

  const handleEditar = (usuario) => {
    setUsuarioEditando(usuario);
    setModalOpen(true);
  };

  const handleSave = async (payload) => {
    if (usuarioEditando) {
      await usuariosApi.editar(usuarioEditando.id, payload);
    } else {
      await usuariosApi.crear(payload);
    }
    cargarUsuarios();
  };

  const handleDelete = async () => {
    if (!deleteModal.usuario) return;
    setDeleteModal((s) => ({ ...s, loading: true }));
    try {
      await usuariosApi.eliminar(deleteModal.usuario.id);
      setDeleteModal({ open: false, usuario: null, loading: false });
      cargarUsuarios();
    } catch (e) {
      alert(e?.response?.data?.msg || "Error al eliminar usuario");
      setDeleteModal((s) => ({ ...s, loading: false }));
    }
  };

  // Abrir modal si viene con ?nuevo=1
useEffect(() => {
  if (searchParams.get("nuevo") === "1") {
    setUsuarioEditando(null);
    setModalOpen(true);
    setSearchParams({}, { replace: true });
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [searchParams]);

  return (
    <DashboardLayout
      menu={ADMIN_MENU}
      secondaryMenu={ADMIN_SECONDARY_MENU}
      title="Usuarios"
      subtitle="Gestión de cuentas del sistema"
    >
      <div className="bg-white rounded-2xl border border-slate-200
                      shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                placeholder="Buscar por nombre, usuario o email..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50
                           text-sm text-slate-700 placeholder-slate-400
                           focus:outline-none focus:bg-white focus:border-institucional
                           focus:ring-2 focus:ring-institucional/15 transition"
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50
                         text-sm text-slate-700 cursor-pointer
                         focus:outline-none focus:bg-white focus:border-institucional"
            >
              <option value="">Todos los roles</option>
              <option value="admin">Administrador</option>
              <option value="mecanico">Mecánico</option>
              <option value="area">Área</option>
            </select>
          </div>

          <div className="md:col-span-3 flex gap-2">
            <select
              value={filters.activo}
              onChange={(e) => setFilters({ ...filters, activo: e.target.value })}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50
                         text-sm text-slate-700 cursor-pointer
                         focus:outline-none focus:bg-white focus:border-institucional"
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>

            <Boton onClick={handleNuevo} icono={<Plus size={16} />} aria-label="Nuevo usuario" className="shrink-0">
              <span className="hidden sm:inline">Nuevo</span>
            </Boton>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>
            Mostrando <strong className="text-slate-700">{usuarios.length}</strong>{" "}
            {usuarios.length === 1 ? "usuario" : "usuarios"}
          </span>
          {(filters.q || filters.role || filters.activo) && (
            <button
              onClick={() => setFilters({ q: "", role: "", activo: "" })}
              className="inline-flex items-center gap-1 text-institucional hover:underline font-medium"
            >
              <X size={14} />
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {error && (
        <Alerta className="mb-4">{error}</Alerta>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 size={28} className="animate-spin" />
          <span className="ml-3 text-sm">Cargando usuarios...</span>
        </div>
      ) : usuarios.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Users size={48} className="mx-auto text-slate-300" />
          <p className="mt-4 text-sm font-medium text-slate-700">
            No se encontraron usuarios
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200
                        shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
                  <th className="text-left font-medium px-5 py-3">Usuario</th>
                  <th className="text-left font-medium px-5 py-3">Email</th>
                  <th className="text-left font-medium px-5 py-3">Rol</th>
                  <th className="text-left font-medium px-5 py-3">Estado</th>
                  <th className="text-right font-medium px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuarios.map((u) => {
                  const cfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.mecanico;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-institucional
                                          flex items-center justify-center
                                          text-white text-sm font-semibold shrink-0">
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 truncate">
                              {u.username}
                            </p>
                            {u.nombre_completo && (
                              <p className="text-xs text-slate-500 truncate">
                                {u.nombre_completo}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{u.email || <span className="text-slate-400">Sin correo</span>}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1
                                          rounded-full text-xs font-medium ${cfg.color}`}>
                          {cfg.icon}
                          {u.rol_nombre || cfg.label}
                        </span>
                        {u.area && <p className="mt-1 text-xs text-slate-500">{u.area}</p>}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium
                          ${u.activo ? "text-emerald-700" : "text-slate-500"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full
                            ${u.activo ? "bg-emerald-500" : "bg-slate-400"}`} />
                          {u.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/admin/usuarios/${u.id}`)}
                            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100
                                       hover:text-institucional transition"
                            title="Ver detalle"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleEditar(u)}
                            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100
                                       hover:text-institucional transition"
                            title="Editar"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteModal({ open: true, usuario: u, loading: false })
                            }
                            className="p-2 rounded-lg text-slate-500 hover:bg-red-50
                                       hover:text-red-600 transition"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <UsuarioModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        usuario={usuarioEditando}
      />

      <ConfirmModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, usuario: null, loading: false })}
        onConfirm={handleDelete}
        loading={deleteModal.loading}
        title="¿Eliminar usuario?"
      >
        Vas a eliminar a{" "}
        <strong className="text-slate-700">{deleteModal.usuario?.username}</strong>.
        Esta acción no se puede deshacer.
      </ConfirmModal>
    </DashboardLayout>
  );
}