# backend/seguridad.py
# Reglas de contraseñas y bloqueo por intentos fallidos de inicio de sesión.
# Las mismas reglas se muestran en el frontend (src/config/password.js).
import re
from datetime import timedelta

LONGITUD_MINIMA = 8

# Intentos fallidos seguidos antes de bloquear la cuenta, y por cuánto tiempo
MAX_INTENTOS = 5
TIEMPO_BLOQUEO = timedelta(minutes=15)

# Contraseñas demasiado comunes aunque cumplan las reglas
COMUNES = {
    "12345678", "123456789", "1234567890", "password", "password1", "contraseña",
    "contrasena1", "qwerty123", "abc12345", "abcd1234", "atlacomulco", "atlacomulco1",
    "admin123", "admin1234", "usuario1", "parque123", "taller123",
}


def error_password(password, usuario=""):
    """Devuelve el motivo por el que la contraseña no es válida, o None si cumple."""
    password = password or ""
    if len(password) < LONGITUD_MINIMA:
        return f"La contraseña debe tener al menos {LONGITUD_MINIMA} caracteres"
    if not re.search(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]", password):
        return "La contraseña debe incluir al menos una letra"
    if not re.search(r"\d", password):
        return "La contraseña debe incluir al menos un número"
    if password.lower() in COMUNES:
        return "Esa contraseña es muy común; elige otra"
    if usuario and usuario.lower() in password.lower():
        return "La contraseña no debe contener el nombre de usuario"
    return None
