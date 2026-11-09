# backend/validacion.py
# Revisiones que aplican a TODAS las rutas, además de las de cada formulario:
#  - Antes de guardar, cada dato se compara con su columna: largo de los textos,
#    tamaño de los números y que no lleguen NaN/infinito. Así un dato fuera de
#    medida responde 400 con un mensaje claro en lugar de un error 500 de MySQL.
#  - El cuerpo JSON de POST/PUT/PATCH debe ser un objeto ({...}).
#  - Los errores inesperados responden en JSON y deshacen la transacción.
# Todas las consultas pasan por el ORM de SQLAlchemy (parámetros enlazados);
# no se arma SQL con datos del usuario.
import math
import re
from decimal import Decimal

from flask import jsonify, request
from sqlalchemy import Integer, Numeric, String, Text, event, inspect as sa_inspect
from sqlalchemy.orm import Session
from werkzeug.exceptions import HTTPException

from extensions import db

LARGO_TEXT = 65_535          # TEXT de MySQL (bytes)
LARGO_MEDIUMTEXT = 16_777_215
MAX_INT = 2_147_483_647      # INT de MySQL

EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
USUARIO = re.compile(r"^[A-Za-z0-9._-]{3,50}$")

# Nombre que ve el usuario para cada columna (las demás se muestran con espacios)
ETIQUETAS = {
    "username": "nombre de usuario",
    "email": "correo",
    "nombre_completo": "nombre completo",
    "no_inventario": "No. de inventario",
    "numero_economico": "número económico",
    "no_motor": "No. de motor",
    "descripcion": "descripción",
    "fallas": "diagnóstico de fallas",
    "acciones_a_realizar": "acciones a realizar",
    "acciones": "trabajo realizado",
    "observaciones_ingreso": "observaciones del ingreso",
    "proveedor_nombre": "nombre del proveedor",
    "proveedor_direccion": "dirección del proveedor",
    "proveedor_telefono": "teléfono del proveedor",
    "unidad_medida": "unidad de medida",
    "precio_unitario": "precio unitario",
    "iva_porcentaje": "IVA",
    "diagnostico_inicial": "diagnóstico inicial",
    "motivo_descarte": "motivo",
    "mecanico": "nombre del mecánico",
    "mecanico_nombre": "nombre del mecánico",
    "autoriza_nombre": "nombre de quien autoriza",
    "solicitante_nombre": "nombre del solicitante",
}


MENSAJES_HTTP = {
    400: "La solicitud no es válida",
    404: "No se encontró lo que buscas",
    405: "Acción no permitida",
    413: "El archivo es demasiado grande",
    415: "Formato de datos no admitido",
}


class ErrorValidacion(Exception):
    """Dato inválido: se responde 400 con este mensaje."""


def _etiqueta(nombre):
    return ETIQUETAS.get(nombre, nombre.replace("_", " "))


def _largo_texto(tipo):
    """Máximo de un Text según la variante de MySQL (TEXT o MEDIUMTEXT)."""
    variante = getattr(tipo, "_variant_mapping", {}).get("mysql")
    if variante is not None and type(variante).__name__ == "MEDIUMTEXT":
        return LARGO_MEDIUMTEXT
    return LARGO_TEXT


def _revisar_valor(columna, valor):
    if valor is None:
        return
    tipo = columna.type
    nombre = _etiqueta(columna.name)

    if isinstance(tipo, String) and isinstance(valor, str):
        if isinstance(tipo, Text) and not tipo.length:
            if len(valor.encode("utf-8")) > _largo_texto(tipo):
                raise ErrorValidacion(f"El campo «{nombre}» es demasiado largo")
        elif tipo.length and len(valor) > tipo.length:
            raise ErrorValidacion(f"El campo «{nombre}» es demasiado largo (máximo {tipo.length} caracteres)")
        return

    if isinstance(tipo, (Numeric, Integer)) and not isinstance(valor, bool) and isinstance(valor, (int, float, Decimal)):
        if isinstance(valor, float) and not math.isfinite(valor):
            raise ErrorValidacion(f"El campo «{nombre}» debe ser un número válido")
        if isinstance(valor, Decimal) and not valor.is_finite():
            raise ErrorValidacion(f"El campo «{nombre}» debe ser un número válido")
        if isinstance(tipo, Integer):
            if abs(valor) > MAX_INT:
                raise ErrorValidacion(f"El campo «{nombre}» es demasiado grande")
        elif tipo.precision is not None:
            limite = 10 ** (tipo.precision - (tipo.scale or 0))
            if abs(valor) >= limite:
                raise ErrorValidacion(f"El campo «{nombre}» es demasiado grande")


def _revisar_objeto(obj):
    estado = sa_inspect(obj)
    for attr in estado.mapper.column_attrs:
        for columna in attr.columns:
            if columna.table is not None and not columna.primary_key:
                _revisar_valor(columna, getattr(obj, attr.key, None))


@event.listens_for(Session, "before_flush")
def _antes_de_guardar(session, _contexto, _instancias):
    for obj in list(session.new) + list(session.dirty):
        if hasattr(obj, "__table__"):
            _revisar_objeto(obj)


# ─── Ayudas para leer el JSON de un formulario ───
def texto(valor, largo=None):
    """Texto limpio (sin espacios dobles al inicio/fin) o None. Acepta números."""
    if valor is None or isinstance(valor, (dict, list, bool)):
        return None
    limpio = str(valor).strip()
    if largo:
        limpio = limpio[:largo]
    return limpio or None


def una_linea(valor):
    """Texto en una sola línea con espacios normalizados ("" si no hay)."""
    return " ".join((texto(valor) or "").split())


def validar_nombre(valor, quien):
    """Nombre completo de una persona (ej. quien solicita). Devuelve (nombre, error)."""
    nombre = una_linea(valor)[:120]
    if len(nombre) < 3:
        return None, f"Escribe el nombre completo {quien}"
    return nombre, None


def es_email(valor):
    return bool(valor) and len(valor) <= 120 and bool(EMAIL.match(valor))


def es_usuario(valor):
    return bool(valor) and bool(USUARIO.match(valor))


# ─── Registro en la app ───
def registrar(app):
    @app.before_request
    def _json_es_objeto():
        if request.method in ("POST", "PUT", "PATCH") and request.is_json and request.get_data(cache=True):
            data = request.get_json(silent=True)
            if not isinstance(data, dict):
                return jsonify({"msg": "Los datos enviados no tienen un formato válido"}), 400
        return None

    @app.errorhandler(ErrorValidacion)
    def _dato_invalido(e):
        db.session.rollback()
        return jsonify({"msg": str(e)}), 400

    @app.errorhandler(Exception)
    def _inesperado(e):
        if isinstance(e, HTTPException):
            return jsonify({"msg": MENSAJES_HTTP.get(e.code, e.name)}), e.code
        db.session.rollback()
        app.logger.exception("Error no controlado: %s", e)
        return jsonify({"msg": "Ocurrió un error inesperado. Revisa los datos e intenta de nuevo."}), 500
