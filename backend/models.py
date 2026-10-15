from datetime import datetime, timezone
from sqlalchemy.dialects.mysql import MEDIUMTEXT
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db


def utcnow():
    """Fecha/hora actual en UTC, sin zona horaria (así la guarda MySQL DATETIME)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


# Roles con acceso al sistema. "almacen" se retiró (el almacén trabaja manual),
# pero sigue en el ENUM de la columna para no romper registros antiguos.
# "area": cuenta compartida de un área (ej. Seguridad Pública); solo hace y
# consulta las solicitudes de los vehículos de su área.
ROLES = ("admin", "mecanico", "area")

# Personal del taller (todo el sistema menos lo exclusivo de las áreas)
ROLES_TALLER = ("admin", "mecanico")


class Rol(db.Model):
    """
    Rol con nombre propio (ej. "Supervisor"). Los permisos los hereda de un
    rol base de ROLES_TALLER, así que el resto del sistema solo revisa Usuario.role.
    """
    __tablename__ = "roles"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(60), unique=True, nullable=False)
    base = db.Column(db.Enum(*ROLES_TALLER), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)

    def to_dict(self):
        return {"id": self.id, "nombre": self.nombre, "base": self.base}


class Usuario(db.Model):
    __tablename__ = "usuarios"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    # Opcional solo en cuentas de área (las demás lo exigen al crearse/editarse)
    email = db.Column(db.String(120), unique=True, nullable=True, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    nombre_completo = db.Column(db.String(150))
    role = db.Column(db.Enum("admin", "almacen", "mecanico", "area"), default="mecanico", nullable=False)
    rol_id = db.Column(db.Integer, db.ForeignKey("roles.id"), nullable=True)
    # Solo cuentas de área: nombre del área tal como está en vehiculos.area
    area = db.Column(db.String(100))
    activo = db.Column(db.Boolean, default=True, nullable=False)
    ultimo_acceso = db.Column(db.DateTime)
    # Seguridad: contraseña temporal (la puso el admin o ya no cumple las reglas)
    # e intentos fallidos de inicio de sesión (al llegar al límite se bloquea un rato)
    debe_cambiar_password = db.Column(db.Boolean, default=False, nullable=False)
    intentos_fallidos = db.Column(db.Integer, default=0, nullable=False)
    bloqueado_hasta = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    rol = db.relationship("Rol")

    def bloqueada(self):
        return bool(self.bloqueado_hasta and self.bloqueado_hasta > utcnow())

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
            "rol_id": self.rol_id,
            "rol_nombre": self.rol.nombre if self.rol else None,
            "area": self.area,
            "activo": self.activo,
            "ultimo_acceso": self.ultimo_acceso.isoformat() if self.ultimo_acceso else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "debe_cambiar_password": bool(self.debe_cambiar_password),
            "bloqueado_hasta": self.bloqueado_hasta.isoformat() if self.bloqueada() else None,
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
#  SOLICITUDES DE SERVICIO
# ════════════════════════════════════════════════════════════
# Se abre cuando el mecánico firma de recibido la solicitud del área. Pasos:
#   diagnostico → ingreso (formato de ingreso a taller) → compra (orden de compra,
#   solo si hay refacciones) → reparacion (evidencia fotográfica y formato de
#   entrega) → entregada
ESTADOS_SOLICITUD = ("diagnostico", "ingreso", "compra", "reparacion", "entregada")
TIPOS_SOLICITUD = ("preventivo", "correctivo", "emergencia")
PRIORIDADES = ("alta", "media", "baja")


def _iso(dt):
    return dt.isoformat() if dt else None


def _ve_costos():
    """Solo el administrador ve precios y costos (parque vehicular no).
    Fuera de una petición con sesión (scripts, pruebas) se muestran."""
    try:
        from flask_jwt_extended import get_jwt_identity
        uid = get_jwt_identity()
    except Exception:
        return True
    if uid is None:
        return True
    u = db.session.get(Usuario, int(uid))
    return u is None or u.role == "admin"


class Solicitud(db.Model):
    __tablename__ = "solicitudes"

    id = db.Column(db.Integer, primary_key=True)
    folio = db.Column(db.String(20), unique=True, index=True)  # SOL-2026-0001

    vehiculo_id = db.Column(db.Integer, db.ForeignKey("vehiculos.id"), nullable=False, index=True)
    mecanico_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), index=True)
    creado_por_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)

    tipo = db.Column(db.Enum(*TIPOS_SOLICITUD), default="correctivo", nullable=False)
    prioridad = db.Column(db.Enum(*PRIORIDADES), default="media", nullable=False)
    estado = db.Column(db.Enum(*ESTADOS_SOLICITUD), default="diagnostico", nullable=False, index=True)

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
    total_birlos = db.Column(db.Integer)       # "Total de número de birlos" del formato
    observaciones_ingreso = db.Column(db.Text)
    hoja_no = db.Column(db.Integer)            # "Hoja no. __ de __" del formato en papel
    hoja_total = db.Column(db.Integer)
    ingreso_at = db.Column(db.DateTime)        # cuándo se llenó el formato de ingreso

    # ─── Diagnóstico ───
    fallas = db.Column(db.Text)               # Diagnóstico de fallas presentadas
    acciones_a_realizar = db.Column(db.Text)  # Acciones a realizar / observaciones
    # Las refacciones a utilizar están en RefaccionServicio

    # ─── Formato de entrega ───
    acciones = db.Column(db.Text)        # Trabajo realizado
    observaciones = db.Column(db.Text)   # Observaciones de la entrega
    operador = db.Column(db.String(150)) # Operador de la unidad (quien la maneja en el área)

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
    # Refacciones a utilizar (diagnóstico): son las piezas de la orden de compra
    piezas = db.relationship(
        "RefaccionServicio", backref="solicitud",
        cascade="all, delete-orphan", order_by="RefaccionServicio.id",
    )
    orden_compra = db.relationship(
        "OrdenCompra", backref="solicitud", uselist=False, cascade="all, delete-orphan",
    )
    eventos = db.relationship(
        "SolicitudEvento", backref="solicitud",
        cascade="all, delete-orphan", order_by="SolicitudEvento.id",
    )
    fotos = db.relationship(
        "SolicitudFoto", backref="solicitud",
        cascade="all, delete-orphan", order_by="SolicitudFoto.id",
    )
    ordenes_foraneas = db.relationship(
        "OrdenForanea", backref="solicitud",
        cascade="all, delete-orphan", order_by="OrdenForanea.id",
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
            "orden_compra_folio": self.orden_compra.folio if self.orden_compra else None,
            "costo": float(self.costo) if self.costo is not None and _ve_costos() else None,
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
                "total_birlos": self.total_birlos,
                "observaciones_ingreso": self.observaciones_ingreso,
                "hoja_no": self.hoja_no,
                "hoja_total": self.hoja_total,
                "fallas": self.fallas,
                "acciones": self.acciones,
                "observaciones": self.observaciones,
                "operador": self.operador,
                "eventos": [e.to_dict() for e in self.eventos],
                "fotos": {f.tipo: f.to_dict() for f in self.fotos},
                "ordenes_foraneas": [o.to_dict(resumen=True) for o in self.ordenes_foraneas],
                "acciones_a_realizar": self.acciones_a_realizar,
                "refacciones": [r.to_dict() for r in self.piezas],
                "ingreso_at": _iso(self.ingreso_at),
                "orden_compra": self.orden_compra.to_dict() if self.orden_compra else None,
                # Lo que pidió el área: base para las refacciones del diagnóstico
                "peticion": _peticion_de(self),
                "creado_por": self.creado_por.to_dict() if self.creado_por else None,
            })
        return data


class RefaccionServicio(db.Model):
    """
    Refacción a utilizar (diagnóstico): cantidad, unidad de medida y descripción
    de la pieza a comprar. Es la lista de la orden de compra; el precio unitario
    lo captura administración al atenderla.
    """
    __tablename__ = "servicio_refacciones"

    id = db.Column(db.Integer, primary_key=True)
    solicitud_id = db.Column(db.Integer, db.ForeignKey("solicitudes.id"), nullable=False, index=True)
    cantidad = db.Column(db.Numeric(10, 2), nullable=False)
    unidad_medida = db.Column(db.String(30), nullable=False)
    concepto = db.Column(db.String(255), nullable=False)  # descripción (pieza a comprar)
    precio_unitario = db.Column(db.Numeric(12, 2), nullable=True)

    def importe(self):
        if self.precio_unitario is None:
            return None
        return round(float(self.cantidad) * float(self.precio_unitario), 2)

    def to_dict(self):
        ve = _ve_costos()
        return {
            "id": self.id,
            "cantidad": float(self.cantidad),
            "unidad_medida": self.unidad_medida,
            "concepto": self.concepto,
            "precio_unitario": float(self.precio_unitario) if ve and self.precio_unitario is not None else None,
            "importe": self.importe() if ve else None,
        }


ESTADOS_ORDEN_COMPRA = ("enviada", "atendida")


class OrdenCompra(db.Model):
    """
    Orden de compra del servicio (formato del municipio). El mecánico la manda
    con las refacciones del diagnóstico, la hoja y su nombre y firma;
    administración captura proveedor, precios e IVA y la atiende.
    """
    __tablename__ = "ordenes_compra"

    id = db.Column(db.Integer, primary_key=True)
    folio = db.Column(db.String(20), unique=True, index=True)  # OC-2026-0001 (número de orden)
    solicitud_id = db.Column(db.Integer, db.ForeignKey("solicitudes.id"), nullable=False, unique=True)
    estado = db.Column(db.Enum(*ESTADOS_ORDEN_COMPRA), default="enviada", nullable=False, index=True)
    hoja_no = db.Column(db.Integer, default=1)
    hoja_total = db.Column(db.Integer, default=1)

    # Mecánico/Almacén: nombre completo y firma
    mecanico_nombre = db.Column(db.String(120))
    mecanico_firma = db.Column(db.Text().with_variant(MEDIUMTEXT(), "mysql"))

    # Datos del proveedor (administración)
    proveedor_nombre = db.Column(db.String(200))
    proveedor_direccion = db.Column(db.String(255))
    proveedor_telefono = db.Column(db.String(50))
    iva_porcentaje = db.Column(db.Numeric(5, 2), default=16)
    adicionales = db.Column(db.Text)

    # Autorizó: coordinador de parque vehicular (firma al atenderla)
    autoriza_nombre = db.Column(db.String(120))
    autoriza_firma = db.Column(db.Text().with_variant(MEDIUMTEXT(), "mysql"))

    creado_por_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)
    atendida_por_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=True)
    atendida_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=utcnow, index=True)

    creado_por = db.relationship("Usuario", foreign_keys=[creado_por_id])
    atendida_por = db.relationship("Usuario", foreign_keys=[atendida_por_id])

    def totales(self):
        """(subtotal, iva %, iva, total) con los precios capturados."""
        subtotal = round(sum(r.importe() or 0 for r in self.solicitud.piezas), 2)
        iva_pct = float(self.iva_porcentaje) if self.iva_porcentaje is not None else 0
        iva = round(subtotal * iva_pct / 100, 2)
        return subtotal, iva_pct, iva, round(subtotal + iva, 2)

    def to_dict(self):
        s = self.solicitud
        v = s.vehiculo
        piezas = [r.to_dict() for r in s.piezas]
        subtotal, iva_pct, iva, total = self.totales()
        if not _ve_costos():  # parque vehicular no ve precios
            subtotal = iva = total = None
        return {
            "id": self.id,
            "folio": self.folio,
            "estado": self.estado,
            "fecha": _iso(self.created_at),
            "hoja_no": self.hoja_no,
            "hoja_total": self.hoja_total,
            "mecanico_nombre": self.mecanico_nombre,
            "mecanico_firma": self.mecanico_firma,
            "proveedor": {
                "nombre": self.proveedor_nombre,
                "direccion": self.proveedor_direccion,
                "telefono": self.proveedor_telefono,
            },
            "adicionales": self.adicionales,
            "autoriza_nombre": self.autoriza_nombre,
            "autoriza_firma": self.autoriza_firma,
            "piezas": piezas,
            "precios_completos": bool(s.piezas) and all(r.precio_unitario is not None for r in s.piezas),
            "subtotal": subtotal,
            "iva_porcentaje": iva_pct,
            "iva": iva,
            "total": total,
            "atendida_por": _nombre_usuario(self.atendida_por),
            "atendida_at": _iso(self.atendida_at),
            "servicio": {
                "id": s.id,
                "folio": s.folio,
                "estado": s.estado,
                "fallas": s.fallas,
                "acciones_a_realizar": s.acciones_a_realizar,
                "mecanico": _nombre_usuario(s.mecanico),
            },
            # Datos de la unidad tal como se registraron en el servicio
            "vehiculo": {
                "nombre": (v.numero_economico or v.unidad or v.no_inventario) if v else None,
                "unidad": s.ing_unidad,
                "area": s.ing_area,
                "modelo": s.ing_modelo,
                "marca": s.ing_marca,
                "no_inventario": s.ing_no_inventario,
                "serie": s.ing_serie,
                "placas": s.ing_placas,
            },
        }


class SolicitudRefaccion(db.Model):
    """
    Refacciones utilizadas / piezas a comprar. Ya no se capturan ni se muestran
    en el sistema; la tabla se conserva para no perder lo registrado antes.
    """
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


class OrdenForanea(db.Model):
    """
    Orden de reparación en taller foráneo: cuando la unidad no se puede reparar
    en el taller del área y se manda a un taller externo. Se genera a partir de
    un ingreso a taller y toma de él los datos del vehículo.
    """
    __tablename__ = "ordenes_foraneas"

    id = db.Column(db.Integer, primary_key=True)
    folio = db.Column(db.String(20), unique=True, index=True)  # OTF-2026-0001
    solicitud_id = db.Column(db.Integer, db.ForeignKey("solicitudes.id"), nullable=False, index=True)

    fecha_remision = db.Column(db.Date, nullable=False)
    diagnostico_inicial = db.Column(db.Text, nullable=False)

    # Taller al que se remite (se llena solo la columna que corresponda)
    taller_muelles = db.Column(db.String(150))
    taller_llantas = db.Column(db.String(150))
    taller_transmision = db.Column(db.String(150))

    creado_por_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    creado_por = db.relationship("Usuario")

    def to_dict(self, resumen=False):
        talleres = {
            "muelles": self.taller_muelles,
            "llantas": self.taller_llantas,
            "transmision": self.taller_transmision,
        }
        data = {
            "id": self.id,
            "folio": self.folio,
            "fecha_remision": self.fecha_remision.isoformat() if self.fecha_remision else None,
            "talleres": talleres,
        }
        if resumen:
            return data

        s = self.solicitud
        data.update({
            "diagnostico_inicial": self.diagnostico_inicial,
            "solicitud": {
                "id": s.id,
                "folio": s.folio,
                "estado": s.estado,
                "mecanico_id": s.mecanico_id,
                "fecha_ingreso": _iso(s.fecha_ingreso),
            },
            # Datos del vehículo tal como se registraron en el ingreso a taller
            "vehiculo": {
                "area": s.ing_area,
                "unidad": s.ing_unidad,
                "color": s.ing_color,
                "serie": s.ing_serie,
                "no_inventario": s.ing_no_inventario,
                "marca": s.ing_marca,
                "placas": s.ing_placas,
                "modelo": s.ing_modelo,
                "nombre": (s.vehiculo.numero_economico or s.vehiculo.unidad or s.vehiculo.no_inventario)
                if s.vehiculo else None,
            },
            "creado_por": (self.creado_por.nombre_completo or self.creado_por.username) if self.creado_por else None,
            "created_at": _iso(self.created_at),
        })
        return data


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


def _peticion_de(solicitud):
    p = PeticionServicio.query.filter_by(solicitud_id=solicitud.id).first()
    if not p:
        return None
    return {
        "id": p.id,
        "folio": p.folio,
        # Mecánico que firmó de recibido: se propone en la orden de compra
        "mecanico_nombre": p.mecanico_nombre,
        "mecanico_firma": p.mecanico_firma,
        # Solicitante: firma en "Área" (quien recibe) del formato de entrega
        "solicitante_nombre": p.solicitante_nombre,
        "solicitante_firma": p.solicitante_firma,
        "materiales": [
            {k: m[k] for k in ("cantidad", "unidad_medida", "concepto")}
            for m in (x.to_dict() for x in p.materiales)
        ],
    }


def _nombre_usuario(u):
    return (u.nombre_completo or u.username) if u else None


class Herramienta(db.Model):
    """Catálogo de herramientas del taller que se prestan a los mecánicos."""
    __tablename__ = "herramientas"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(120), unique=True, nullable=False)
    cantidad = db.Column(db.Integer, nullable=False, default=1)  # piezas que tiene el taller
    created_at = db.Column(db.DateTime, default=utcnow)

    def to_dict(self, en_uso=None):
        # en_uso: [{"mecanico", "cantidad"}] de quienes la tienen sin devolver
        en_uso = en_uso or []
        prestadas = sum(e["cantidad"] for e in en_uso)
        return {
            "id": self.id,
            "nombre": self.nombre,
            "cantidad": self.cantidad,
            "prestadas": prestadas,
            "disponibles": max(self.cantidad - prestadas, 0),
            "en_uso": en_uso,
        }


class Prestamo(db.Model):
    """
    Préstamo de herramientas a un mecánico (la hoja donde se anotaba a mano).
    El nombre del mecánico se escribe tal cual, como en la hoja.
    Sigue abierto mientras tenga herramientas sin devolver.
    """
    __tablename__ = "prestamos_herramientas"

    id = db.Column(db.Integer, primary_key=True)
    mecanico = db.Column(db.String(150), nullable=False)
    registrado_por_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)
    observaciones = db.Column(db.Text)
    fecha_prestamo = db.Column(db.DateTime, default=utcnow, nullable=False, index=True)
    fecha_devolucion = db.Column(db.DateTime)  # se llena cuando ya regresó todo

    registrado_por = db.relationship("Usuario")
    items = db.relationship(
        "PrestamoItem", backref="prestamo", cascade="all, delete-orphan", order_by="PrestamoItem.id"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "mecanico": self.mecanico,
            "registrado_por": _nombre_usuario(self.registrado_por),
            "observaciones": self.observaciones,
            "fecha_prestamo": _iso(self.fecha_prestamo),
            "fecha_devolucion": _iso(self.fecha_devolucion),
            "items": [i.to_dict() for i in self.items],
        }


class PrestamoItem(db.Model):
    """Una herramienta (y cuántas piezas) dentro de un préstamo."""
    __tablename__ = "prestamos_herramientas_items"

    id = db.Column(db.Integer, primary_key=True)
    prestamo_id = db.Column(db.Integer, db.ForeignKey("prestamos_herramientas.id"), nullable=False, index=True)
    herramienta_id = db.Column(db.Integer, db.ForeignKey("herramientas.id"), nullable=False, index=True)
    cantidad = db.Column(db.Integer, nullable=False, default=1)
    devuelto_at = db.Column(db.DateTime)

    herramienta = db.relationship("Herramienta")

    def to_dict(self):
        return {
            "id": self.id,
            "herramienta_id": self.herramienta_id,
            "herramienta": self.herramienta.nombre if self.herramienta else None,
            "cantidad": self.cantidad,
            "devuelto_at": _iso(self.devuelto_at),
        }


# ════════════════════════════════════════════════════════════
#  PETICIONES DE LAS ÁREAS (cada área con su cuenta)
# ════════════════════════════════════════════════════════════

ESTADOS_PETICION = ("pendiente", "atendida", "descartada")


class PeticionServicio(db.Model):
    """
    Solicitud que hace un área con su cuenta: elige un vehículo de su área y
    lista los materiales que necesita. La fecha y la hora
    son las de created_at y el área es la del vehículo (no se guardan aparte).
    El mecánico la convierte en ingreso a taller o la descarta.
    """
    __tablename__ = "peticiones_servicio"

    id = db.Column(db.Integer, primary_key=True)
    folio = db.Column(db.String(20), unique=True, index=True)  # PET-2026-0001
    vehiculo_id = db.Column(db.Integer, db.ForeignKey("vehiculos.id"), nullable=False, index=True)
    estado = db.Column(db.Enum(*ESTADOS_PETICION), default="pendiente", nullable=False, index=True)
    creado_por_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=True)  # cuenta del área
    # Quién hace la solicitud (la cuenta es del área y la usan varias personas)
    solicitante_nombre = db.Column(db.String(120))
    solicitante_firma = db.Column(db.Text().with_variant(MEDIUMTEXT(), "mysql"))  # data:image/png;base64,...

    # Seguimiento del taller (no lo llena el área)
    solicitud_id = db.Column(db.Integer, db.ForeignKey("solicitudes.id"), nullable=True)
    atendida_por_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=True)
    motivo_descarte = db.Column(db.Text)
    atendida_at = db.Column(db.DateTime)
    # Paso 1 de "Atender": el mecánico responsable recibe la solicitud con su
    # nombre y firma. Después se registra el ingreso a taller (estado "atendida").
    mecanico_nombre = db.Column(db.String(120))
    mecanico_firma = db.Column(db.Text().with_variant(MEDIUMTEXT(), "mysql"))
    recibida_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=utcnow, index=True)

    vehiculo = db.relationship("Vehiculo")
    solicitud = db.relationship("Solicitud")
    atendida_por = db.relationship("Usuario", foreign_keys=[atendida_por_id])
    creado_por = db.relationship("Usuario", foreign_keys=[creado_por_id])
    materiales = db.relationship(
        "PeticionMaterial", backref="peticion",
        cascade="all, delete-orphan", order_by="PeticionMaterial.id",
    )

    def to_dict(self):
        v = self.vehiculo
        materiales = [m.to_dict() for m in self.materiales]
        return {
            "id": self.id,
            "folio": self.folio,
            "estado": self.estado,
            "fecha": _iso(self.created_at),   # fecha y hora en que se hizo la solicitud
            "area": v.area if v else None,
            # Datos del catálogo tal cual (no se copian a la petición)
            "vehiculo": {
                **v.to_dict(),
                "nombre": v.numero_economico or v.unidad or v.no_inventario,
            } if v else None,
            "materiales": materiales,
            # Suma de lo que ya tiene precio; None si el admin aún no captura ninguno
            "total": round(sum(m["total"] for m in materiales if m["total"] is not None), 2)
            if any(m["total"] is not None for m in materiales) else None,
            "precios_completos": bool(materiales) and all(m["precio_unitario"] is not None for m in materiales),
            "solicitud": {"id": self.solicitud.id, "folio": self.solicitud.folio} if self.solicitud else None,
            "creado_por": _nombre_usuario(self.creado_por),
            "solicitante_nombre": self.solicitante_nombre,
            "solicitante_firma": self.solicitante_firma,
            "atendida_por": _nombre_usuario(self.atendida_por),
            "mecanico_nombre": self.mecanico_nombre,
            "mecanico_firma": self.mecanico_firma,
            "recibida_at": _iso(self.recibida_at),
            "motivo_descarte": self.motivo_descarte,
            "atendida_at": _iso(self.atendida_at),
        }


class PeticionMaterial(db.Model):
    """
    Un material solicitado. El área captura cantidad, unidad y concepto; el
    precio unitario lo captura después el admin. El total (cantidad × precio)
    se calcula, no se guarda.
    """
    __tablename__ = "peticiones_materiales"

    id = db.Column(db.Integer, primary_key=True)
    peticion_id = db.Column(db.Integer, db.ForeignKey("peticiones_servicio.id"), nullable=False, index=True)
    cantidad = db.Column(db.Numeric(10, 2), nullable=False)
    unidad_medida = db.Column(db.String(30), nullable=False)
    concepto = db.Column(db.String(255), nullable=False)
    precio_unitario = db.Column(db.Numeric(12, 2), nullable=True)  # lo captura el admin

    def to_dict(self):
        cantidad = float(self.cantidad)
        precio = float(self.precio_unitario) if self.precio_unitario is not None else None
        return {
            "id": self.id,
            "cantidad": cantidad,
            "unidad_medida": self.unidad_medida,
            "concepto": self.concepto,
            "precio_unitario": precio,
            "total": round(cantidad * precio, 2) if precio is not None else None,
        }

