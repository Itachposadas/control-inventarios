# backend/init_db.py
import os
import secrets
from app import create_app
from extensions import db
from models import Usuario, Vehiculo, Solicitud, SolicitudRefaccion, SolicitudEvento  # noqa: F401 (registran sus tablas)

def seed_password():
    """
    Contraseña para los usuarios semilla: SEED_PASSWORD del .env,
    o una aleatoria que se imprime una sola vez en consola.
    """
    return os.getenv("SEED_PASSWORD") or secrets.token_urlsafe(9)


def seed():
    app = create_app()
    password = seed_password()
    with app.app_context():
        # Crea las tablas que falten (no toca las que ya existen)
        db.create_all()

        # Usuarios semilla (si no existen)
        if not Usuario.query.filter_by(username="admin").first():
            admin = Usuario(username="admin", email="admin@demo.com", role="admin", nombre_completo="Administrador del Sistema")
            admin.set_password(password)
            db.session.add(admin)
            print(f"✓ Usuario 'admin' creado (contraseña: {password})")

        if not Usuario.query.filter_by(username="mecanico").first():
            mec = Usuario(username="mecanico", email="mecanico@demo.com", role="mecanico", nombre_completo="Mecánico")
            mec.set_password(password)
            db.session.add(mec)
            print(f"✓ Usuario 'mecanico' creado (contraseña: {password})")

        db.session.commit()

        # Chequeo de vehículos
        count = Vehiculo.query.count()
        print(f"✓ Vehículos en la BD: {count}")

        print("\n✅ Listo. Ahora corre: python app.py")

if __name__ == "__main__":
    seed()