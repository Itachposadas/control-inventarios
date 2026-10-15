# backend/routes/historial.py
# Historial de servicios por vehículo (expediente de mantenimiento).
#  - GET /api/historial/vehiculos       vehículos que ya tuvieron al menos un servicio
#  - GET /api/historial/vehiculos/<id>  datos de la unidad y todos sus servicios
#  - GET /api/historial/preventivo      unidades con mantenimiento preventivo vencido o próximo
# Lo consultan el admin y parque vehicular; el gasto y los costos solo el admin.
from flask import Blueprint, request, jsonify
from sqlalchemy import func
from extensions import db
from models import Vehiculo, Solicitud, PeticionServicio, _iso, _ve_costos
from auth_utils import role_required
from routes.solicitudes import EN_TALLER
from paginacion import pide_pagina, paginar_lista
import preventivo

historial_bp = Blueprint("historial", __name__, url_prefix="/api/historial")

ORDENES = {
    "reciente": lambda r: r["ultimo"] or "",
    "servicios": lambda r: r["servicios"],
    "gasto": lambda r: r["gasto"] or 0,
}


def _nombre(v):
    return v.numero_economico or v.unidad or v.no_inventario


@historial_bp.route("/vehiculos", methods=["GET"])
@role_required("admin", "mecanico")
def vehiculos():
    """?q= (nombre, placas, inventario, marca) &area= &orden=reciente|servicios|gasto
    &preventivo=vencido|proximo|avisos (avisos = vencido o próximo) &pagina= &por_pagina="""
    q = (request.args.get("q") or "").strip()
    area = (request.args.get("area") or "").strip()
    orden = request.args.get("orden") or "reciente"
    ve_costos = _ve_costos()
    if orden == "gasto" and not ve_costos:
        orden = "reciente"

    # Resumen por vehículo en una sola consulta
    resumen = (
        db.session.query(
            Solicitud.vehiculo_id,
            func.count(Solicitud.id),
            func.max(Solicitud.fecha_ingreso),
            func.sum(Solicitud.costo),
            func.sum(db.case((Solicitud.estado.in_(EN_TALLER), 1), else_=0)),
        )
        .group_by(Solicitud.vehiculo_id)
        .all()
    )
    por_vehiculo = {vid: (n, ultimo, gasto, abiertos) for vid, n, ultimo, gasto, abiertos in resumen}
    if not por_vehiculo:
        return jsonify({"vehiculos": [], "areas": []}), 200

    query = Vehiculo.query.filter(Vehiculo.id.in_(por_vehiculo.keys()))
    areas = sorted({a for (a,) in query.with_entities(Vehiculo.area).distinct() if a})
    if area:
        query = query.filter(Vehiculo.area == area)
    if q:
        like = f"%{q}%"
        query = query.filter(db.or_(
            Vehiculo.numero_economico.like(like), Vehiculo.unidad.like(like), Vehiculo.placas.like(like),
            Vehiculo.no_inventario.like(like), Vehiculo.marca.like(like), Vehiculo.modelo.like(like),
        ))

    prev = preventivo.por_vehiculo()
    filtro_prev = (request.args.get("preventivo") or "").strip()
    filas = []
    for v in query.all():
        p = prev.get(v.id)
        if filtro_prev == "avisos" and not (p and p["estado"] != "al_dia"):
            continue
        if filtro_prev in ("vencido", "proximo") and not (p and p["estado"] == filtro_prev):
            continue
        n, ultimo, gasto, abiertos = por_vehiculo[v.id]
        filas.append({
            "id": v.id,
            "nombre": _nombre(v),
            "unidad": v.unidad,
            "marca": v.marca,
            "modelo": v.modelo,
            "placas": v.placas,
            "no_inventario": v.no_inventario,
            "area": v.area,
            "servicios": n,
            "ultimo": _iso(ultimo),
            "en_taller": bool(abiertos),
            "gasto": round(float(gasto), 2) if ve_costos and gasto is not None else None,
            "preventivo": p,
        })
    filas.sort(key=ORDENES.get(orden, ORDENES["reciente"]), reverse=True)
    if not pide_pagina():
        return jsonify({"vehiculos": filas, "areas": areas}), 200
    pagina, info = paginar_lista(filas, por_defecto=25)
    return jsonify({**info, "vehiculos": pagina, "areas": areas}), 200


@historial_bp.route("/preventivo", methods=["GET"])
@role_required("admin", "mecanico")
def avisos_preventivo():
    """Unidades con el mantenimiento preventivo vencido o próximo, la más atrasada primero."""
    prev = preventivo.por_vehiculo()
    avisos = {vid: p for vid, p in prev.items() if p["estado"] != "al_dia"}
    vehiculos = Vehiculo.query.filter(Vehiculo.id.in_(avisos.keys())).all() if avisos else []
    lista = sorted(
        (
            {
                "id": v.id, "nombre": _nombre(v), "area": v.area, "placas": v.placas,
                "no_inventario": v.no_inventario, **avisos[v.id],
            }
            for v in vehiculos
        ),
        key=lambda x: x["dias"],
    )
    return jsonify({
        "meses": preventivo.MESES_PREVENTIVO,
        "dias_aviso": preventivo.DIAS_AVISO,
        "vencidos": sum(1 for x in lista if x["estado"] == "vencido"),
        "proximos": sum(1 for x in lista if x["estado"] == "proximo"),
        "avisos": lista,
    }), 200


@historial_bp.route("/vehiculos/<int:vehiculo_id>", methods=["GET"])
@role_required("admin", "mecanico")
def vehiculo(vehiculo_id):
    v = db.session.get(Vehiculo, vehiculo_id)
    if not v:
        return jsonify({"msg": "Vehículo no encontrado"}), 404
    ve_costos = _ve_costos()

    servicios = v.solicitudes.order_by(Solicitud.fecha_ingreso.desc(), Solicitud.id.desc()).all()
    peticiones = {
        p.solicitud_id: p for p in
        PeticionServicio.query.filter(PeticionServicio.solicitud_id.in_([s.id for s in servicios])).all()
    } if servicios else {}

    def servicio(s):
        p = peticiones.get(s.id)
        o = s.orden_compra
        dias = (s.fecha_entrega - s.fecha_ingreso).total_seconds() / 86400 if s.fecha_entrega else None
        return {
            "id": s.id,
            "folio": s.folio,
            "estado": s.estado,
            "tipo": s.tipo,
            "fecha_recepcion": _iso(s.fecha_ingreso),
            "fecha_entrega": _iso(s.fecha_entrega),
            "dias_taller": round(dias, 1) if dias is not None else None,
            "area": s.ing_area,
            "mecanico": (s.mecanico.nombre_completo or s.mecanico.username) if s.mecanico else None,
            "fallas": s.fallas,
            "acciones_a_realizar": s.acciones_a_realizar,
            "ingreso_at": _iso(s.ingreso_at),  # ya tiene formato de ingreso
            "trabajo_realizado": s.acciones,
            "observaciones": s.observaciones,
            "refacciones": [r.to_dict() for r in s.piezas],
            "costo": float(s.costo) if ve_costos and s.costo is not None else None,
            "solicitud": {
                "id": p.id,
                "folio": p.folio,
                "solicitante": p.solicitante_nombre,
                "recibio": p.mecanico_nombre,
            } if p else None,
            "orden_compra": {"id": o.id, "folio": o.folio, "estado": o.estado} if o else None,
            "fotos": len(s.fotos),
        }

    lista = [servicio(s) for s in servicios]
    costos = [x["costo"] for x in lista if x["costo"] is not None]
    dias = [x["dias_taller"] for x in lista if x["dias_taller"] is not None]
    return jsonify({
        "vehiculo": {**v.to_dict(), "nombre": _nombre(v)},
        "resumen": {
            "servicios": len(lista),
            "entregados": sum(1 for x in lista if x["estado"] == "entregada"),
            "en_taller": sum(1 for x in lista if x["estado"] in EN_TALLER),
            "dias_promedio": round(sum(dias) / len(dias), 1) if dias else None,
            "gasto_total": round(sum(costos), 2) if ve_costos else None,
        },
        "servicios": lista,
    }), 200
