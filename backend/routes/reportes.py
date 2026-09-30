# backend/routes/reportes.py
# Reportes del admin. Se toman los servicios cuyo INGRESO a taller cae en el periodo.
from collections import defaultdict
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from sqlalchemy.orm import selectinload
from models import Solicitud, Vehiculo, utcnow
from auth_utils import role_required
from routes.solicitudes import EN_TALLER

reportes_bp = Blueprint("reportes", __name__, url_prefix="/api/reportes")

TERMINADOS = ("completada", "entregada")
TOP = 10

# Las fechas se guardan en UTC; los periodos se cuentan en hora del centro de México
# (UTC-6, sin horario de verano desde 2022). Así un servicio de las 7 pm del día 30
# no cae en el mes siguiente.
UTC_OFFSET = timedelta(hours=6)


def _local(dt_utc):
    return dt_utc - UTC_OFFSET


def _utc_desde_local(d):
    return datetime.combine(d, datetime.min.time()) + UTC_OFFSET


def _fecha(valor, por_defecto):
    try:
        return datetime.strptime(valor, "%Y-%m-%d").date()
    except (TypeError, ValueError):
        return por_defecto


def _meses(desde, hasta):
    """Lista 'AAAA-MM' de cada mes entre dos fechas (incluidos)."""
    meses, y, m = [], desde.year, desde.month
    while (y, m) <= (hasta.year, hasta.month):
        meses.append(f"{y}-{m:02d}")
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)
    return meses


def _nombre(v):
    return v.numero_economico or v.unidad or v.no_inventario


def _fecha_completada(s):
    """Última vez que el servicio pasó a Completada (según la bitácora)."""
    fechas = [e.created_at for e in s.eventos if e.accion == "Avanzó a Completada"]
    return max(fechas) if fechas else None


@reportes_bp.route("", methods=["GET"])
@reportes_bp.route("/", methods=["GET"])
@role_required("admin")
def reporte():
    hoy = _local(utcnow()).date()
    desde = _fecha(request.args.get("desde"), hoy.replace(day=1))
    hasta = _fecha(request.args.get("hasta"), hoy)
    if desde > hasta:
        return jsonify({"msg": "La fecha inicial no puede ser mayor a la final"}), 400
    area = (request.args.get("area") or "").strip()

    query = (
        Solicitud.query.join(Vehiculo)
        .options(selectinload(Solicitud.eventos), selectinload(Solicitud.refacciones))
        .filter(
            Solicitud.fecha_ingreso >= _utc_desde_local(desde),
            Solicitud.fecha_ingreso < _utc_desde_local(hasta + timedelta(days=1)),
        )
    )
    if area:
        query = query.filter(Vehiculo.area == area)
    servicios = query.order_by(Solicitud.fecha_ingreso.asc()).all()

    # ─── Acumuladores ───
    por_mes = {m: {"mes": m, "gasto": 0.0, "servicios": 0, "terminados": 0} for m in _meses(desde, hasta)}
    por_area = defaultdict(lambda: {"gasto": 0.0, "servicios": 0})
    por_tipo = defaultdict(lambda: {"gasto": 0.0, "servicios": 0})
    por_vehiculo = {}
    piezas = {}
    dias_taller = []
    gasto_total = 0.0
    terminados = en_taller = sin_costo = con_costo = 0

    for s in servicios:
        v = s.vehiculo
        costo = float(s.costo) if s.costo is not None else 0.0
        mes = _local(s.fecha_ingreso).strftime("%Y-%m")
        terminado = s.estado in TERMINADOS

        gasto_total += costo
        terminados += terminado
        en_taller += s.estado in EN_TALLER
        sin_costo += terminado and s.costo is None
        con_costo += s.costo is not None

        if mes in por_mes:
            por_mes[mes]["gasto"] += costo
            por_mes[mes]["servicios"] += 1
            por_mes[mes]["terminados"] += terminado

        a = por_area[v.area or "Sin área"]
        a["gasto"] += costo
        a["servicios"] += 1

        t = por_tipo[s.tipo]
        t["gasto"] += costo
        t["servicios"] += 1

        pv = por_vehiculo.setdefault(v.id, {
            "vehiculo_id": v.id,
            "nombre": _nombre(v),
            "no_inventario": v.no_inventario,
            "area": v.area,
            "gasto": 0.0,
            "servicios": 0,
        })
        pv["gasto"] += costo
        pv["servicios"] += 1

        completada = _fecha_completada(s) if terminado else None
        if completada:
            dias_taller.append((completada - s.fecha_ingreso).total_seconds() / 86400)

        # Piezas a comprar: se agrupan por descripción (sin distinguir mayúsculas)
        for r in s.refacciones:
            if r.tipo != "por_comprar":
                continue
            clave = " ".join(r.descripcion.lower().split())
            p = piezas.setdefault(clave, {"descripcion": r.descripcion, "cantidad": 0, "servicios": []})
            p["cantidad"] += r.cantidad
            p["servicios"].append({
                "solicitud_id": s.id,
                "folio": s.folio,
                "vehiculo": _nombre(v),
                "cantidad": r.cantidad,
                "estado": s.estado,
            })

    def ordenar(dic, clave):
        return sorted(
            [{clave: k, **val} for k, val in dic.items()],
            key=lambda x: (-x["gasto"], -x["servicios"]),
        )

    vehiculos = list(por_vehiculo.values())

    return jsonify({
        "periodo": {"desde": desde.isoformat(), "hasta": hasta.isoformat(), "area": area or None},
        "resumen": {
            "servicios": len(servicios),
            "terminados": terminados,
            "en_taller": en_taller,
            "gasto_total": round(gasto_total, 2),
            # Promedio solo de los servicios que ya tienen costo capturado
            "gasto_promedio": round(gasto_total / con_costo, 2) if con_costo else 0,
            "sin_costo": sin_costo,
            "dias_promedio_taller": round(sum(dias_taller) / len(dias_taller), 1) if dias_taller else None,
        },
        "por_mes": list(por_mes.values()),
        "por_area": ordenar(por_area, "area"),
        "por_tipo": ordenar(por_tipo, "tipo"),
        "top_costo": sorted(vehiculos, key=lambda x: (-x["gasto"], -x["servicios"]))[:TOP],
        "top_ingresos": sorted(vehiculos, key=lambda x: (-x["servicios"], -x["gasto"]))[:TOP],
        "piezas_por_comprar": sorted(piezas.values(), key=lambda p: (-p["cantidad"], p["descripcion"].lower())),
    }), 200
