# backend/preventivo.py
# Mantenimiento preventivo por fecha: cada unidad debe volver a revisión cierto
# tiempo después de su último servicio entregado. Se avisa cuando ya pasó la
# fecha (vencido) o cuando faltan pocos días (próximo).
# Las unidades dadas de baja o que ya están en el taller no generan aviso.
import calendar
from sqlalchemy import func
from extensions import db
from models import Solicitud, Vehiculo, utcnow
from routes.solicitudes import EN_TALLER

MESES_PREVENTIVO = 6   # cada cuánto debe revisarse una unidad
DIAS_AVISO = 30        # con cuánta anticipación se avisa


def sumar_meses(fecha, meses):
    mes = fecha.month - 1 + meses
    anio = fecha.year + mes // 12
    mes = mes % 12 + 1
    dia = min(fecha.day, calendar.monthrange(anio, mes)[1])
    return fecha.replace(year=anio, month=mes, day=dia)


def calcular(ultimo, hoy=None):
    """{estado: vencido|proximo|al_dia, proximo, dias} a partir del último servicio entregado."""
    hoy = hoy or utcnow().date()
    proximo = sumar_meses(ultimo.date(), MESES_PREVENTIVO)
    dias = (proximo - hoy).days
    estado = "vencido" if dias < 0 else "proximo" if dias <= DIAS_AVISO else "al_dia"
    return {"estado": estado, "proximo": proximo.isoformat(), "dias": dias}


def por_vehiculo():
    """{vehiculo_id: calcular(...)} de las unidades activas con al menos un servicio entregado."""
    ultimos = dict(
        db.session.query(Solicitud.vehiculo_id, func.max(Solicitud.fecha_entrega))
        .filter(Solicitud.estado == "entregada", Solicitud.fecha_entrega.isnot(None))
        .group_by(Solicitud.vehiculo_id)
        .all()
    )
    if not ultimos:
        return {}
    en_taller = {
        vid for (vid,) in db.session.query(Solicitud.vehiculo_id)
        .filter(Solicitud.estado.in_(EN_TALLER)).distinct()
    }
    de_baja = {
        vid for (vid,) in db.session.query(Vehiculo.id)
        .filter(Vehiculo.id.in_(ultimos.keys()), Vehiculo.estado == "baja")
    }
    hoy = utcnow().date()
    return {
        vid: {**calcular(ultimo, hoy), "ultimo_servicio": ultimo.isoformat()}
        for vid, ultimo in ultimos.items()
        if vid not in en_taller and vid not in de_baja
    }
