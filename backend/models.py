from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db


def utcnow():
    """Fecha/hora actual en UTC, sin zona horaria (así la guarda MySQL DATETIME)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


# Roles con acceso al sistema. "almacen" se retiró (el almacén trabaja manual),
# pero sigue en el ENUM de la columna para no romper registros antiguos.
ROLES = ("admin", "mecanico")


class Usuario(db.Model):
    __tablename__ = "usuarios"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    nombre_completo = db.Column(db.String(150))
    role = db.Column(db.Enum("admin", "almacen", "mecanico"), default="mecanico", nullable=False)
    activo = db.Column(db.Boolean, default=True, nullable=False)
    ultimo_acceso = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "nombre_completo": self.nombre_completo,
            "role": self.role,
            "activo": self.activo,
            "ultimo_acceso": self.ultimo_acceso.isoformat() if self.ultimo_acceso else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Vehiculo(db.Model):
    __tablename__ = "vehiculos"

    id = db.Column(db.Integer, primary_key=True)
    np = db.Column(db.Integer)
    no_inventario = db.Column(db.String(50), unique=True, nullable=False)
    area = db.Column(db.String(100))
    unidad = db.Column(db.String(150))
    descripcion = db.Column(db.String(255))
    modelo = db.Column(db.String(30))
    marca = db.Column(db.String(100))
    serie = db.Column(db.String(100))
    no_motor = db.Column(db.String(100))
    placas = db.Column(db.String(30))
    numero_economico = db.Column(db.String(50))
    color = db.Column(db.String(50))
    estado = db.Column(db.Enum("activo", "mantenimiento", "baja"), default="activo")
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "np": self.np,
            "noInventario": self.no_inventario,
            "area": self.area,
            "unidad": self.unidad,
            "descripcion": self.descripcion,
            "modelo": self.modelo,
            "marca": self.marca,
            "serie": self.serie,
            "noMotor": self.no_motor,
            "placas": self.placas,
            "numeroEconomico": self.numero_economico,
            "color": self.color,
            "estado": self.estado,
        }

# ════════════════════════════════════════════════════════════
#  SOLICITUDES DE SERVICIO (ingreso a taller)
# ════════════════════════════════════════════════════════════

ESTADOS_SOLICITUD = ("recibida", "diagnostico", "reparacion", "completada", "entregada")
TIPOS_SOLICITUD = ("preventivo", "correctivo", "emergencia")
PRIORIDADES = ("alta", "media", "baja")


def _iso(dt):
    return dt.isoformat() if dt else None


class Solicitud(db.Model):
    __tablename__ = "solicitudes"

    id = db.Column(db.Integer, primary_key=True)
    folio = db.Column(db.String(20), unique=True, index=True)  # SOL-2026-0001

    vehiculo_id = db.Column(db.Integer, db.ForeignKey("vehiculos.id"), nullable=False, index=True)
    mecanico_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), index=True)
    creado_por_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)

    tipo = db.Column(db.Enum(*TIPOS_SOLICITUD), default="correctivo", nullable=False)
    prioridad = db.Column(db.Enum(*PRIORIDADES), default="media", nullable=False)
    estado = db.Column(db.Enum(*ESTADOS_SOLICITUD), default="recibida", nullable=False, index=True)

    # ─── Formato de ingreso: datos del vehículo tal como llegó ───
    # Se copian del catálogo al crear y el mecánico puede corregirlos;
    # así el formato conserva cómo estaba el vehículo ese día.
    ing_marca = db.Column(db.String(100))
    ing_placas = db.Column(db.String(30))
    ing_modelo = db.Column(db.String(30))
    ing_area = db.Column(db.String(100))
    ing_unidad = db.Column(db.String(150))
    ing_color = db.Column(db.String(50))
    ing_serie = db.Column(db.String(100))
    ing_no_inventario = db.Column(db.String(50))

    # Accesorios y herramientas: {"espejo_derecho": true, "claxon": false, ...}
    checklist = db.Column(db.JSON)
    observaciones_ingreso = db.Column(db.Text)

    # ─── Trabajo del mecánico ───
    fallas = db.Column(db.Text)          # Diagnóstico de fallas presentadas
    acciones = db.Column(db.Text)        # Acciones realizadas
    observaciones = db.Column(db.Text)   # Observaciones / lo que se trabajó

    # ─── Lo captura el admin ───
    costo = db.Column(db.Numeric(12, 2))

    fecha_ingreso = db.Column(db.DateTime, default=utcnow, nullable=False)
    fecha_entrega = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    vehiculo = db.relationship("Vehiculo", backref=db.backref("solicitudes", lazy="dynamic"))
    mecanico = db.relationship("Usuario", foreign_keys=[mecanico_id])
    creado_por = db.relationship("Usuario", foreign_keys=[creado_por_id])
    refacciones = db.relationship(
        "SolicitudRefaccion", backref="solicitud",
        cascade="all, delete-orphan", order_by="SolicitudRefaccion.id",
    )
    eventos = db.relationship(
        "SolicitudEvento", backref="solicitud",
        cascade="all, delete-orphan", order_by="SolicitudEvento.id",
    )
    fotos = db.relationship(
        "SolicitudFoto", backref="solicitud",
        cascade="all, delete-orphan", order_by="SolicitudFoto.id",
    )

    def to_dict(self, detalle=False):
        v = self.vehiculo
        data = {
            "id": self.id,
            "folio": self.folio,
            "estado": self.estado,
            "tipo": self.tipo,
            "prioridad": self.prioridad,
            "vehiculo": {
                "id": v.id,
                "noInventario": v.no_inventario,
                "numeroEconomico": v.numero_economico,
                "unidad": v.unidad,
                "placas": v.placas,
                "area": v.area,
            } if v else None,
            "mecanico": self.mecanico.to_dict() if self.mecanico else None,
            "fotos_tipos": sorted(f.tipo for f in self.fotos),
            "costo": float(self.costo) if self.costo is not None else None,
            "fecha_ingreso": _iso(self.fecha_ingreso),
            "fecha_entrega": _iso(self.fecha_entrega),
            "updated_at": _iso(self.updated_at),
        }
        if detalle:
            data.update({
                "ingreso": {
                    "marca": self.ing_marca,
                    "placas": self.ing_placas,
                    "modelo": self.ing_modelo,
                    "area": self.ing_area,
                    "unidad": self.ing_unidad,
                    "color": self.ing_color,
                    "serie": self.ing_serie,
                    "no_inventario": self.ing_no_inventario,
                },
                "checklist": self.checklist or {},
                "observaciones_ingreso": self.observaciones_ingreso,
                "fallas": self.fallas,
                "acciones": self.acciones,
                "observaciones": self.observaciones,
                "refacciones": [r.to_dict() for r in self.refacciones],
                "eventos": [e.to_dict() for e in self.eventos],
                "fotos": {f.tipo: f.to_dict() for f in self.fotos},
                "creado_por": self.creado_por.to_dict() if self.creado_por else None,
            })
        return data


class SolicitudRefaccion(db.Model):
    """Refacciones utilizadas o piezas a comprar de una solicitud."""
    __tablename__ = "solicitud_refacciones"

    id = db.Column(db.Integer, primary_key=True)
    solicitud_id = db.Column(db.Integer, db.ForeignKey("solicitudes.id"), nullable=False, index=True)
    tipo = db.Column(db.Enum("utilizada", "por_comprar"), nullable=False)
    descripcion = db.Column(db.String(255), nullable=False)
    cantidad = db.Column(db.Integer, default=1, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "tipo": self.tipo,
            "descripcion": self.descripcion,
            "cantidad": self.cantidad,
        }


# Evidencia fotográfica obligatoria de cada servicio
TIPOS_FOTO = ("llegada", "reparacion", "final")


class SolicitudFoto(db.Model):
    """Una foto por tipo (llegada, reparación, final). El archivo vive en backend/uploads/."""
    __tablename__ = "solicitud_fotos"
    __table_args__ = (db.UniqueConstraint("solicitud_id", "tipo", name="uq_solicitud_foto_tipo"),)

    id = db.Column(db.Integer, primary_key=True)
    solicitud_id = db.Column(db.Integer, db.ForeignKey("solicitudes.id"), nullable=False, index=True)
    tipo = db.Column(db.Enum(*TIPOS_FOTO), nullable=False)
    archivo = db.Column(db.String(255), nullable=False)   # ruta relativa dentro de uploads/
    mimetype = db.Column(db.String(50), nullable=False)
    tamano = db.Column(db.Integer, nullable=False)        # bytes
    subido_por_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)

    subido_por = db.relationship("Usuario")

    def to_dict(self):
        return {
            "id": self.id,
            "tipo": self.tipo,
            "tamano": self.tamano,
            "subido_por": (self.subido_por.nombre_completo or self.subido_por.username) if self.subido_por else None,
            "fecha": _iso(self.created_at),
        }


class SolicitudEvento(db.Model):
    """Bitácora: quién hizo qué y cuándo en cada solicitud."""
    __tablename__ = "solicitud_eventos"

    id = db.Column(db.Integer, primary_key=True)
    solicitud_id = db.Column(db.Integer, db.ForeignKey("solicitudes.id"), nullable=False, index=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)
    accion = db.Column(db.String(255), nullable=False)   # "Creó el ingreso a taller", "Cambió a Diagnóstico"...
    nota = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=utcnow, index=True)

    usuario = db.relationship("Usuario")

    def to_dict(self):
        return {
            "id": self.id,
            "accion": self.accion,
            "nota": self.nota,
            "usuario": self.usuario.nombre_completo or self.usuario.username if self.usuario else None,
            "fecha": _iso(self.created_at),
        }
