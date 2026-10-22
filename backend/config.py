# backend/config.py
import os
from urllib.parse import quote_plus
from dotenv import load_dotenv

load_dotenv()


def _required(name):
    """Lee una variable obligatoria del .env; si falta, detiene el arranque."""
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Falta la variable {name} en backend/.env")
    return value


class Config:
    SECRET_KEY = _required("SECRET_KEY")
    JWT_SECRET_KEY = _required("JWT_SECRET_KEY")
    JWT_ACCESS_TOKEN_EXPIRES = 3600  # 1 hora

    # Modo debug solo en desarrollo (FLASK_ENV=development en el .env)
    DEBUG = os.getenv("FLASK_ENV") == "development"

    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
    DB_PORT = os.getenv("DB_PORT", "3306")
    DB_NAME = os.getenv("DB_NAME")

    # quote_plus: la contraseña puede traer caracteres como @ o / que romperían la URL
    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{DB_USER}:{quote_plus(DB_PASSWORD)}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        "?charset=utf8mb4"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 280,  # menor que el tiempo de inactividad de las BD en la nube
    }

    # MySQL en la nube (Aiven) exige conexión cifrada: DB_SSL_CA es la ruta a su ca.pem
    DB_SSL_CA = os.getenv("DB_SSL_CA")
    if DB_SSL_CA:
        SQLALCHEMY_ENGINE_OPTIONS["connect_args"] = {"ssl": {"ca": DB_SSL_CA}}

    # Direcciones del frontend que pueden llamar a la API, separadas por coma
    CORS_ORIGINS = [
        o.strip().rstrip("/")
        for o in os.getenv(
            "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",")
        if o.strip()
    ]

    # Fotos de evidencia: se guardan en backend/uploads/ (no se suben a git)
    UPLOAD_FOLDER = os.getenv(
        "UPLOAD_FOLDER",
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads"),
    )
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10 MB por petición