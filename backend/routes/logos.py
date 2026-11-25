# backend/routes/logos.py
# Logotipos del sistema y de los documentos PDF. El administrador puede subir
# una imagen nueva para cada uno o volver a la original.
#   GET    /api/logos            → qué logotipos están cambiados (público: lo usan el inicio y el login)
#   GET    /api/logos/<clave>    → la imagen cambiada (público); 404 si se usa la original
#   PUT    /api/logos/<clave>    → admin: sube la imagen nueva (campo "logo")
#   DELETE /api/logos/<clave>    → admin: vuelve a la imagen original
import io
from flask import Blueprint, request, jsonify, send_file
from extensions import db
from models import LogoSistema, LOGOS, utcnow
from auth_utils import role_required, get_current_user
from routes.fotos import _detectar_imagen

logos_bp = Blueprint("logos", __name__, url_prefix="/api/logos")

MAX_BYTES = 5 * 1024 * 1024  # 5 MB por imagen
# La marca de agua se usa como máscara: necesita fondo transparente (PNG o WEBP)
SOLO_TRANSPARENTE = {"marca_agua"}


@logos_bp.route("", methods=["GET"])
@logos_bp.route("/", methods=["GET"])
def listar():
    cambiados = {l.clave: l.to_dict() for l in LogoSistema.query.all()}
    return jsonify({c: cambiados.get(c, {"clave": c, "personalizado": False}) for c in LOGOS}), 200


@logos_bp.route("/<clave>", methods=["GET"])
def imagen(clave):
    logo = db.session.get(LogoSistema, clave) if clave in LOGOS else None
    if not logo:
        return jsonify({"msg": "Se usa el logotipo original"}), 404
    resp = send_file(io.BytesIO(logo.datos), mimetype=logo.mimetype)
    # La URL lleva ?v=<versión>: si cambia la imagen, cambia la URL
    resp.headers["Cache-Control"] = "public, max-age=86400"
    return resp


@logos_bp.route("/<clave>", methods=["PUT"])
@role_required("admin")
def cambiar(clave):
    if clave not in LOGOS:
        return jsonify({"msg": "Logotipo no válido"}), 404
    archivo = request.files.get("logo")
    if not archivo:
        return jsonify({"msg": "Selecciona una imagen"}), 400
    datos = archivo.read()
    if not datos:
        return jsonify({"msg": "La imagen está vacía"}), 400
    if len(datos) > MAX_BYTES:
        return jsonify({"msg": "La imagen pesa más de 5 MB"}), 400
    mimetype, _ = _detectar_imagen(datos[:16])
    if not mimetype:
        return jsonify({"msg": "El archivo debe ser una imagen PNG, JPG o WEBP"}), 400
    if clave in SOLO_TRANSPARENTE and mimetype == "image/jpeg":
        return jsonify({"msg": "La marca de agua debe ser PNG o WEBP con fondo transparente"}), 400

    logo = db.session.get(LogoSistema, clave) or LogoSistema(clave=clave)
    logo.datos = datos
    logo.mimetype = mimetype
    logo.nombre_archivo = (archivo.filename or "")[:255] or None
    logo.actualizado_por_id = get_current_user().id
    logo.updated_at = utcnow()
    db.session.add(logo)
    db.session.commit()
    return jsonify(logo.to_dict()), 200


@logos_bp.route("/<clave>", methods=["DELETE"])
@role_required("admin")
def restaurar(clave):
    logo = db.session.get(LogoSistema, clave) if clave in LOGOS else None
    if logo:
        db.session.delete(logo)
        db.session.commit()
    return jsonify({"clave": clave, "personalizado": False}), 200
