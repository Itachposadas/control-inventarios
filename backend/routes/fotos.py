# backend/routes/fotos.py
# Evidencia fotográfica de cada servicio: llegada, reparación y final.
import io
import os
import uuid
from flask import Blueprint, request, jsonify, send_file, current_app
from extensions import db
from models import Solicitud, SolicitudFoto, TIPOS_FOTO
from auth_utils import role_required, get_current_user
from routes.solicitudes import _puede_ver, _registrar

fotos_bp = Blueprint("fotos", __name__, url_prefix="/api/solicitudes")

TIPO_LABEL = {"llegada": "llegada", "reparacion": "reparación", "final": "final"}

# Se identifica el formato por los primeros bytes del archivo (no por la extensión)
FIRMAS = (
    (b"\xff\xd8\xff", "image/jpeg", "jpg"),
    (b"\x89PNG\r\n\x1a\n", "image/png", "png"),
)


def _detectar_imagen(cabecera):
    for firma, mimetype, ext in FIRMAS:
        if cabecera.startswith(firma):
            return mimetype, ext
    if cabecera[:4] == b"RIFF" and cabecera[8:12] == b"WEBP":
        return "image/webp", "webp"
    return None, None


def _ruta_absoluta(relativa):
    # En la BD se guarda con "/" para que funcione igual en Windows y Linux
    return os.path.join(current_app.config["UPLOAD_FOLDER"], *relativa.split("/"))


def _borrar_archivo(relativa):
    try:
        os.remove(_ruta_absoluta(relativa))
    except OSError:
        pass  # si ya no existe, no pasa nada


def borrar_archivos_de(solicitud):
    """Se usa al eliminar una solicitud: borra sus fotos del disco."""
    for f in solicitud.fotos:
        _borrar_archivo(f.archivo)


def _obtener(solicitud_id, tipo):
    """Valida tipo y permisos de lectura. Devuelve (user, solicitud) o una respuesta de error."""
    if tipo not in TIPOS_FOTO:
        return None, (jsonify({"msg": "Tipo de foto inválido"}), 400)
    user = get_current_user()
    s = db.session.get(Solicitud, solicitud_id)
    if not s or not _puede_ver(user, s):
        return None, (jsonify({"msg": "Solicitud no encontrada"}), 404)
    return (user, s), None


def _puede_subir(user, s):
    # Solo el mecánico asignado, mientras el servicio no esté completado
    return (
        user.role == "mecanico"
        and s.mecanico_id == user.id
        and s.estado not in ("completada", "entregada")
    )


# ─── Subir o reemplazar ───
@fotos_bp.route("/<int:solicitud_id>/fotos/<tipo>", methods=["POST"])
@role_required("mecanico")
def subir(solicitud_id, tipo):
    ok, error = _obtener(solicitud_id, tipo)
    if error:
        return error
    user, s = ok
    if not _puede_subir(user, s):
        return jsonify({"msg": "Ya no puedes modificar las fotos de este servicio"}), 403

    archivo = request.files.get("foto")
    if not archivo:
        return jsonify({"msg": "Selecciona una foto"}), 400

    datos = archivo.read()
    mimetype, ext = _detectar_imagen(datos[:16])
    if not mimetype:
        return jsonify({"msg": "El archivo debe ser una imagen JPG, PNG o WEBP"}), 400

    relativa = f"solicitudes/{s.id}/{tipo}-{uuid.uuid4().hex}.{ext}"
    destino = _ruta_absoluta(relativa)
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    with open(destino, "wb") as fh:
        fh.write(datos)

    anterior = next((f for f in s.fotos if f.tipo == tipo), None)
    if anterior:
        _borrar_archivo(anterior.archivo)
        anterior.archivo = relativa
        anterior.mimetype = mimetype
        anterior.tamano = len(datos)
        anterior.subido_por_id = user.id
        _registrar(s, user, f"Reemplazó la foto de {TIPO_LABEL[tipo]}")
    else:
        s.fotos.append(SolicitudFoto(
            tipo=tipo, archivo=relativa, mimetype=mimetype,
            tamano=len(datos), subido_por_id=user.id,
        ))
        _registrar(s, user, f"Subió la foto de {TIPO_LABEL[tipo]}")

    db.session.commit()
    return jsonify(s.to_dict(detalle=True)), 200


# ─── Ver (requiere sesión; el frontend la descarga con su token) ───
@fotos_bp.route("/<int:solicitud_id>/fotos/<tipo>", methods=["GET"])
@role_required()
def ver(solicitud_id, tipo):
    ok, error = _obtener(solicitud_id, tipo)
    if error:
        return error
    _, s = ok
    foto = next((f for f in s.fotos if f.tipo == tipo), None)
    if not foto or not os.path.exists(_ruta_absoluta(foto.archivo)):
        return jsonify({"msg": "Foto no encontrada"}), 404

    # Se lee completa a memoria (pesan ~300 KB): así el archivo no queda abierto
    # y en Windows se puede reemplazar o borrar aunque alguien la esté viendo.
    with open(_ruta_absoluta(foto.archivo), "rb") as fh:
        datos = fh.read()
    resp = send_file(io.BytesIO(datos), mimetype=foto.mimetype)
    resp.headers["Cache-Control"] = "private, max-age=3600"
    return resp


# ─── Quitar ───
@fotos_bp.route("/<int:solicitud_id>/fotos/<tipo>", methods=["DELETE"])
@role_required("mecanico")
def quitar(solicitud_id, tipo):
    ok, error = _obtener(solicitud_id, tipo)
    if error:
        return error
    user, s = ok
    if not _puede_subir(user, s):
        return jsonify({"msg": "Ya no puedes modificar las fotos de este servicio"}), 403

    foto = next((f for f in s.fotos if f.tipo == tipo), None)
    if not foto:
        return jsonify({"msg": "Foto no encontrada"}), 404

    _borrar_archivo(foto.archivo)
    s.fotos.remove(foto)
    _registrar(s, user, f"Quitó la foto de {TIPO_LABEL[tipo]}")
    db.session.commit()
    return jsonify(s.to_dict(detalle=True)), 200
