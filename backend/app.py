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

    # Crea las tablas que falten al arrancar (no modifica las que ya existen),
    # así un módulo nuevo no deja al sistema sin funcionar.
    with app.app_context():
        import models  # noqa: F401  (registra todos los modelos)
        try:
            db.create_all()
        except Exception as e:
            app.logger.error("No se pudieron crear las tablas: %s", e)

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