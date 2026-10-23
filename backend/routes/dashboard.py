# backend/routes/dashboard.py
import re
from collections import Counter
from flask import Blueprint, jsonify
from sqlalchemy import func
from extensions import db
from models import Vehiculo, Solicitud, SolicitudEvento, OrdenCompra, PeticionServicio, utcnow, _iso
from auth_utils import role_required, get_current_user
from routes.reportes import calcular_reporte, _local

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")

# Un año de 4 dígitos (1900–2099) en cualquier parte del texto del modelo
ANIO_RE = re.compile(r"\b(19\d{2}|20\d{2})\b")


def _anio_de_modelo(modelo):
    """'2019' → '2019'; 'SPORT TSMAN 570 2026' → '2026'; '924F' o vacío → None."""
    m = ANIO_RE.search(modelo or "")
    return m.group(1) if m else None


@dashboard_bp.route("/stats", methods=["GET"])
@role_required()
def stats():
    """
    Devuelve KPIs, datos para gráficas y actividad reciente del panel de control.
    """
    # ─── KPIs de vehículos ───
    total_vehiculos = Vehiculo.query.count()

    por_estado = dict(
        db.session.query(Vehiculo.estado, func.count(Vehiculo.id))
        .group_by(Vehiculo.estado)
        .all()
    )

    activos = por_estado.get("activo", 0)
    mantenimiento = por_estado.get("mantenimiento", 0)
    baja = por_estado.get("baja", 0)

    # ─── Top áreas (para gráfica de barras o tabla) ───
    top_areas = (
        db.session.query(Vehiculo.area, func.count(Vehiculo.id).label("total"))
        .group_by(Vehiculo.area)
        .order_by(func.count(Vehiculo.id).desc())
        .limit(8)
        .all()
    )

    # ─── Marca más común ───
    top_marcas = (
        db.session.query(Vehiculo.marca, func.count(Vehiculo.id).label("total"))
        .filter(Vehiculo.marca.isnot(None), Vehiculo.marca != "")
        .group_by(Vehiculo.marca)
        .order_by(func.count(Vehiculo.id).desc())
        .limit(5)
        .all()
    )

    # ─── Años (para gráfica de líneas) ───
    # Se cuentan TODOS los vehículos: los que no tienen un año válido en
    # "modelo" (vacío o un texto como "924F") van aparte en sin_anio.
    conteo_anios = Counter()
    sin_anio = 0
    for modelo, total in (
        db.session.query(Vehiculo.modelo, func.count(Vehiculo.id))
        .group_by(Vehiculo.modelo)
        .all()
    ):
        anio = _anio_de_modelo(modelo)
        if anio:
            conteo_anios[anio] += total
        else:
            sin_anio += total
    por_anio = sorted(conteo_anios.items())

    # ─── Vehículos por área (para dona) ───
    vehiculos_por_area = (
        db.session.query(Vehiculo.area, func.count(Vehiculo.id).label("total"))
        .group_by(Vehiculo.area)
        .order_by(func.count(Vehiculo.id).desc())
        .all()
    )

    # ─── Solicitudes ───
    solicitudes_abiertas = Solicitud.query.filter(Solicitud.estado != "entregada").count()
    en_reparacion = Solicitud.query.filter(Solicitud.estado == "reparacion").count()
    ordenes_por_atender = OrdenCompra.query.filter(OrdenCompra.estado == "enviada").count()

    # Servicios en taller por paso (diagnóstico, ingreso, compra, reparación)
    en_taller_por_paso = dict(
        db.session.query(Solicitud.estado, func.count(Solicitud.id))
        .filter(Solicitud.estado != "entregada")
        .group_by(Solicitud.estado)
        .all()
    )

    # ─── Solicitudes de las áreas que esperan al taller (las más antiguas primero) ───
    pendientes_q = PeticionServicio.query.filter_by(estado="pendiente")
    pendientes = pendientes_q.order_by(PeticionServicio.created_at.asc()).limit(6).all()
    fechas_pendientes = [f for (f,) in pendientes_q.with_entities(PeticionServicio.created_at).all()]

    # ─── Resumen del mes en curso (mismo cálculo que Reportes → "Este mes") ───
    # Los costos solo los ve el admin
    mes = None
    user = get_current_user()
    if user and user.role == "admin":
        hoy = _local(utcnow()).date()
        resumen = calcular_reporte(hoy.replace(day=1), hoy)["resumen"]
        mes = {
            "servicios": resumen["servicios"],
            "terminados": resumen["terminados"],
            "gasto_total": resumen["gasto_total"],
        }

    # ─── Actividad reciente (bitácora de solicitudes) ───
    eventos = (
        SolicitudEvento.query
        .order_by(SolicitudEvento.created_at.desc(), SolicitudEvento.id.desc())
        .limit(6)
        .all()
    )

    return jsonify({
        "kpis": {
            "total_vehiculos": total_vehiculos,
            "activos": activos,
            "en_mantenimiento": mantenimiento,
            "baja": baja,
            "solicitudes_abiertas": solicitudes_abiertas,
            "en_reparacion": en_reparacion,
            "ordenes_por_atender": ordenes_por_atender,
            "pendientes": len(fechas_pendientes),
        },
        "en_taller_por_paso": en_taller_por_paso,
        # Fechas de todas las pendientes: el panel calcula la prioridad por días de espera
        "fechas_pendientes": [_iso(f) for f in fechas_pendientes],
        "pendientes": [
            {
                "id": p.id,
                "folio": p.folio,
                "fecha": _iso(p.created_at),
                "area": p.vehiculo.area if p.vehiculo else None,
                "vehiculo": (p.vehiculo.numero_economico or p.vehiculo.unidad or p.vehiculo.no_inventario)
                if p.vehiculo else None,
                "materiales": len(p.materiales),
            }
            for p in pendientes
        ],
        "mes": mes,
        "actividad": [
            {**e.to_dict(), "folio": e.solicitud.folio, "solicitud_id": e.solicitud_id}
            for e in eventos
        ],
        "top_areas": [
            {"area": a, "total": t} for a, t in top_areas
        ],
        "top_marcas": [
            {"marca": m, "total": t} for m, t in top_marcas
        ],
        "sin_anio": sin_anio,
        "por_anio": [
            {"anio": a, "total": t} for a, t in por_anio
        ],
        "vehiculos_por_area": [
            {"area": a, "total": t} for a, t in vehiculos_por_area
        ],
    }), 200