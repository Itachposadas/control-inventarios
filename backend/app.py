# backend/app.py
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from extensions import db, jwt
from routes.auth import auth_bp
from routes.vehiculos import vehiculos_bp
from routes.dashboard import dashboard_bp
from routes.usuarios import usuarios_bp
from routes.solicitudes import solicitudes_bp
from routes.general import general_bp
from routes.reportes import reportes_bp
from routes.fotos import fotos_bp
from routes.foraneas import foraneas_bp
from routes.roles import roles_bp
from routes.herramientas import herramientas_bp
from routes.peticiones import area_bp, peticiones_bp

# Columnas agregadas a tablas que ya existían. create_all() no las añade,
# así que se agregan al arrancar si faltan (solo agrega, nunca borra datos).
COLUMNAS_NUEVAS = [
    ("vehiculos", "color", "VARCHAR(50) NULL"),
    ("solicitudes", "total_birlos", "INT NULL"),
    ("solicitudes", "hoja_no", "INT NULL"),
    ("solicitudes", "hoja_total", "INT NULL"),
    ("usuarios", "rol_id", "INT NULL"),
    ("usuarios", "area", "VARCHAR(100) NULL"),
    ("peticiones_servicio", "creado_por_id", "INT NULL"),
]

# Valores que debe aceptar la columna usuarios.role (ENUM de MySQL)
ROLES_COLUMNA = ("admin", "almacen", "mecanico", "area")


def _ampliar_roles(app):
    """Agrega 'area' al ENUM de usuarios.role si falta (solo amplía, no borra valores)."""
    if db.engine.dialect.name != "mysql":
        return
    with db.engine.begin() as conn:
        tipo = conn.execute(db.text(
            "SELECT COLUMN_TYPE FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'role'"
        )).scalar() or ""
        if "'area'" in tipo:
            return
        valores = ",".join(f"'{r}'" for r in ROLES_COLUMNA)
        conn.execute(db.text(
            f"ALTER TABLE usuarios MODIFY COLUMN role ENUM({valores}) NOT NULL DEFAULT 'mecanico'"
        ))
    app.logger.info("Rol 'area' agregado a usuarios.role")


def _precio_opcional(app):
    """El precio unitario de los materiales lo captura el admin después: puede ir vacío."""
    if db.engine.dialect.name != "mysql":
        return
    with db.engine.begin() as conn:
        nulo = conn.execute(db.text(
            "SELECT IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() "
            "AND TABLE_NAME = 'peticiones_materiales' AND COLUMN_NAME = 'precio_unitario'"
        )).scalar()
        if nulo != "NO":
            return
        conn.execute(db.text("ALTER TABLE peticiones_materiales MODIFY COLUMN precio_unitario DECIMAL(12,2) NULL"))
    app.logger.info("peticiones_materiales.precio_unitario ahora es opcional")


def _email_opcional(app):
    """Permite usuarios.email vacío (cuentas de área sin correo). Solo relaja la columna."""
    if db.engine.dialect.name != "mysql":
        return
    with db.engine.begin() as conn:
        nulo = conn.execute(db.text(
            "SELECT IS_NULLABLE FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'email'"
        )).scalar()
        if nulo == "YES":
            return
        conn.execute(db.text("ALTER TABLE usuarios MODIFY COLUMN email VARCHAR(120) NULL"))
    app.logger.info("usuarios.email ahora es opcional")


def _agregar_columnas_faltantes(app):
    inspector = db.inspect(db.engine)
    for tabla, columna, tipo in COLUMNAS_NUEVAS:
        existentes = {c["name"] for c in inspector.get_columns(tabla)}
        if columna not in existentes:
            with db.engine.begin() as conn:
                conn.execute(db.text(f"ALTER TABLE {tabla} ADD COLUMN {columna} {tipo}"))
            app.logger.info("Columna agregada: %s.%s", tabla, columna)


def _cargar_catalogo_herramientas(app):
    """Llena el catálogo de herramientas la primera vez (si está vacío y nunca se ha prestado nada)."""
    from models import Herramienta, PrestamoItem
    from catalogo_herramientas import HERRAMIENTAS_INICIALES

    if Herramienta.query.first() or PrestamoItem.query.first():
        return
    db.session.add_all(Herramienta(nombre=n, cantidad=c) for n, c in HERRAMIENTAS_INICIALES)
    db.session.commit()
    app.logger.info("Catálogo de herramientas cargado (%d)", len(HERRAMIENTAS_INICIALES))


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(
        app,
        resources={r"/api/*": {"origins": [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]}},
        supports_credentials=True,
    )

    db.init_app(app)
    jwt.init_app(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(vehiculos_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(usuarios_bp)
    app.register_blueprint(solicitudes_bp)
    app.register_blueprint(general_bp)
    app.register_blueprint(reportes_bp)
    app.register_blueprint(fotos_bp)
    app.register_blueprint(foraneas_bp)
    app.register_blueprint(roles_bp)
    app.register_blueprint(herramientas_bp)
    app.register_blueprint(area_bp)
    app.register_blueprint(peticiones_bp)

    # Crea las tablas que falten al arrancar (no modifica las que ya existen),
    # así un módulo nuevo no deja al sistema sin funcionar.
    with app.app_context():
        import models  # noqa: F401  (registra todos los modelos)
        try:
            db.create_all()
            _agregar_columnas_faltantes(app)
            _ampliar_roles(app)
            _email_opcional(app)
            _precio_opcional(app)
            _cargar_catalogo_herramientas(app)
        except Exception as e:
            app.logger.error("No se pudieron crear las tablas: %s", e)

    # Foto demasiado grande (MAX_CONTENT_LENGTH) → mensaje claro en JSON
    @app.errorhandler(413)
    def archivo_grande(_e):
        return jsonify({"msg": "La foto es demasiado grande (máximo 10 MB)"}), 413

    @app.route("/api/health")
    def health():
        try:
            db.session.execute(db.text("SELECT 1"))
            return jsonify({"status": "ok", "db": "connected"})
        except Exception:
            # No exponemos el detalle del error (puede incluir datos de conexión)
            return jsonify({
                "status": "degraded",
                "db": "disconnected",
            }), 503

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="127.0.0.1", port=5000, debug=Config.DEBUG)