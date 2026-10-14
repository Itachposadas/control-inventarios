# backend/firmas.py
# Validación de las firmas dibujadas en pantalla (solicitante y mecánico).
# Llegan como data URL PNG en base64 y así se guardan.
import base64
import binascii

PREFIJO_FIRMA = "data:image/png;base64,"
MAX_FIRMA = 300_000  # caracteres (~220 KB de imagen); una firma pesa mucho menos


def validar_firma(valor, quien):
    """Devuelve (firma, error). `quien` completa el mensaje: "del solicitante", "del mecánico"."""
    if not isinstance(valor, str) or not valor.startswith(PREFIJO_FIRMA):
        return None, f"Falta la firma {quien}"
    if len(valor) > MAX_FIRMA:
        return None, "La firma es demasiado grande; límpiala y vuelve a firmar"
    try:
        datos = base64.b64decode(valor[len(PREFIJO_FIRMA):], validate=True)
    except (binascii.Error, ValueError):
        return None, "La firma no es válida"
    if not datos.startswith(b"\x89PNG\r\n\x1a\n"):
        return None, "La firma no es válida"
    return valor, None


def validar_nombre(valor, quien):
    """Nombre completo de quien firma. Devuelve (nombre, error)."""
    nombre = (str(valor) if valor is not None else "").strip()[:120]
    if len(nombre) < 3:
        return None, f"Escribe el nombre completo {quien}"
    return nombre, None
