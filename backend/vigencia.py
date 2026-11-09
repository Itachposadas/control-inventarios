# backend/vigencia.py
# Vigencia de las solicitudes de las áreas. Muchas áreas mandaban su solicitud
# y nunca llevaban la unidad, y la bandeja del taller se llenaba de rezago.
# Cada solicitud pendiente tiene un plazo (días naturales desde que se envía):
#   - vigente:    menos de DIAS_VIGENTE días  → el área puede llevar la unidad
#   - por_vencer: de DIAS_VIGENTE a DIAS_LIMITE → se le avisa al área (amarillo)
#   - vencida:    DIAS_LIMITE días o más        → se cancela sola con el motivo
# No hay un proceso programado (en Render el servidor se duerme): las vencidas
# se cancelan al recibir peticiones (máximo una vez por minuto) y justo antes de
# crear o atender una solicitud. El frontend usa los mismos números
# (frontend/src/config/espera.js).
import time
from datetime import timedelta

from extensions import db
from models import PeticionServicio, utcnow

DIAS_VIGENTE = 8
DIAS_LIMITE = 12

MOTIVO_VENCIDA = (
    f"Cancelada automáticamente: la unidad no se presentó en el taller dentro de los "
    f"{DIAS_LIMITE} días de vigencia de la solicitud. Si la unidad aún requiere servicio, "
    "el área puede enviar una nueva solicitud."
)

_ultima_revision = 0.0
CADA_SEGUNDOS = 60


def limites(p):
    """(aviso_at, vence_at) de una solicitud, en UTC."""
    return p.created_at + timedelta(days=DIAS_VIGENTE), p.created_at + timedelta(days=DIAS_LIMITE)


def plazo(p, ahora=None):
    """Situación del plazo de una solicitud pendiente (None si ya no está pendiente)."""
    if p.estado != "pendiente" or not p.created_at:
        return None
    ahora = ahora or utcnow()
    aviso_at, vence_at = limites(p)
    if ahora >= vence_at:
        estado = "vencida"
    elif ahora >= aviso_at:
        estado = "por_vencer"
    else:
        estado = "vigente"
    return {
        "estado": estado,
        "aviso_at": aviso_at.isoformat(),
        "vence_at": vence_at.isoformat(),
    }


def _vencer(p, momento):
    p.estado = "vencida"
    p.motivo_descarte = MOTIVO_VENCIDA
    p.atendida_por_id = None
    p.atendida_at = momento


def vencer_si_toca(p):
    """Cancela esta solicitud si ya pasó su plazo. Devuelve True si la venció (sin commit)."""
    if p.estado == "pendiente" and p.created_at and utcnow() >= limites(p)[1]:
        _vencer(p, limites(p)[1])
        return True
    return False


def vencer_solicitudes():
    """Cancela todas las pendientes que ya pasaron su plazo. Devuelve cuántas."""
    corte = utcnow() - timedelta(days=DIAS_LIMITE)
    vencidas = PeticionServicio.query.filter(
        PeticionServicio.estado == "pendiente",
        PeticionServicio.created_at <= corte,
    ).all()
    for p in vencidas:
        # La fecha de cancelación es el momento en que venció, no cuando se revisó
        _vencer(p, limites(p)[1])
    if vencidas:
        db.session.commit()
    return len(vencidas)


def registrar(app):
    """Revisa los vencimientos al llegar peticiones, como máximo una vez por minuto."""
    @app.before_request
    def _revisar_vencimientos():
        global _ultima_revision
        ahora = time.monotonic()
        if ahora - _ultima_revision < CADA_SEGUNDOS:
            return None
        _ultima_revision = ahora
        try:
            n = vencer_solicitudes()
            if n:
                app.logger.info("Solicitudes vencidas por falta de unidad: %s", n)
        except Exception as e:  # sin BD no se detiene la petición
            db.session.rollback()
            app.logger.error("No se pudieron revisar los vencimientos: %s", e)
        return None
