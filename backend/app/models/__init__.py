"""
Modelos de base de datos — Picker Income Tracker
=================================================

Jerarquía:
  User
  └── Profile          (ej: "Picker Lider", "Picker Normal")
      └── Company       (ej: "Walmart", "Falabella")
          ├── Tariff     (tarifas por tipo de pedido — pueden cambiar en el tiempo)
          └── Month
              └── Day
                  └── Order
"""

from datetime import datetime
from app import db


# ─────────────────────────────────────────────
# USER
# ─────────────────────────────────────────────

class User(db.Model):
    __tablename__ = "users"

    id            = db.Column(db.Integer, primary_key=True)
    nombre        = db.Column(db.String(100), nullable=False)
    email         = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    rol           = db.Column(db.String(20), default="usuario")   # "usuario" | "admin"

    # Porcentaje de retención de boleta de honorarios (Chile).
    # Configurable porque el cronograma legal lo va subiendo cada año tributario.
    retencion_pct = db.Column(db.Float, default=15.25)

    created_at    = db.Column(db.DateTime, default=datetime.utcnow)

    profiles = db.relationship(
        "Profile", backref="user", lazy=True, cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id":            self.id,
            "nombre":        self.nombre,
            "email":         self.email,
            "rol":           self.rol,
            "retencion_pct": self.retencion_pct,
            "created_at":    self.created_at.isoformat(),
        }


# ─────────────────────────────────────────────
# PROFILE  (permite tener distintos "roles laborales" por usuario)
# ─────────────────────────────────────────────

class Profile(db.Model):
    __tablename__ = "profiles"

    id         = db.Column(db.Integer, primary_key=True)
    nombre     = db.Column(db.String(100), nullable=False)   # "Picker Lider", "Picker Normal"
    user_id    = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    companies = db.relationship(
        "Company", backref="profile", lazy=True, cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id":      self.id,
            "nombre":  self.nombre,
            "user_id": self.user_id,
        }


# ─────────────────────────────────────────────
# COMPANY  (empresa para la que trabaja, dentro de un perfil)
# ─────────────────────────────────────────────

class Company(db.Model):
    __tablename__ = "companies"

    id         = db.Column(db.Integer, primary_key=True)
    nombre     = db.Column(db.String(100), nullable=False)   # "Walmart", "Falabella"
    perfil_id  = db.Column(db.Integer, db.ForeignKey("profiles.id"), nullable=False)
    activa     = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    tariffs = db.relationship(
        "Tariff", backref="company", lazy=True, cascade="all, delete-orphan"
    )
    months = db.relationship(
        "Month", backref="company", lazy=True, cascade="all, delete-orphan"
    )

    def tariff_activa(self):
        """Retorna la tarifa vigente más reciente."""
        return (
            Tariff.query
            .filter_by(company_id=self.id, activa=True)
            .order_by(Tariff.vigente_desde.desc())
            .first()
        )

    def to_dict(self):
        tariff = self.tariff_activa()
        return {
            "id":            self.id,
            "nombre":        self.nombre,
            "perfil_id":     self.perfil_id,
            "activa":        self.activa,
            "tariff_activa": tariff.to_dict() if tariff else None,
        }


# ─────────────────────────────────────────────
# TARIFF  (tarifas por tipo de pedido — histórico, puede cambiar)
# ─────────────────────────────────────────────

class Tariff(db.Model):
    __tablename__ = "tariffs"

    id             = db.Column(db.Integer, primary_key=True)
    company_id     = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False)

    # Cada fila es una "versión" de tarifas para esa empresa
    vigente_desde  = db.Column(db.Date, nullable=False)
    activa         = db.Column(db.Boolean, default=True)

    # Tipo normal
    normal_por_pedido = db.Column(db.Integer, default=0)
    normal_por_sku    = db.Column(db.Integer, default=0)

    # Tipo bipicking
    bip_por_pedido = db.Column(db.Integer, default=0)
    bip_por_sku    = db.Column(db.Integer, default=0)

    # Tipos extra que la empresa pueda tener (JSON flexible)
    # Ej: {"express": {"pedido": 1500, "sku": 70}}
    tipos_extra = db.Column(db.JSON, default=dict)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def calcular(self, tipo: str, sku: int, extra: int = 0) -> int:
        """Calcula el valor de un pedido según tipo y SKU."""
        if tipo == "normal":
            base = self.normal_por_pedido + self.normal_por_sku * sku
        elif tipo == "bipicking":
            base = self.bip_por_pedido + self.bip_por_sku * sku
        elif tipo in (self.tipos_extra or {}):
            t = self.tipos_extra[tipo]
            base = t.get("pedido", 0) + t.get("sku", 0) * sku
        else:
            base = 0
        return base + extra

    def to_dict(self):
        return {
            "id":                self.id,
            "company_id":        self.company_id,
            "vigente_desde":     self.vigente_desde.isoformat(),
            "activa":            self.activa,
            "normal_por_pedido": self.normal_por_pedido,
            "normal_por_sku":    self.normal_por_sku,
            "bip_por_pedido":    self.bip_por_pedido,
            "bip_por_sku":       self.bip_por_sku,
            "tipos_extra":       self.tipos_extra,
        }


# ─────────────────────────────────────────────
# MONTH
# ─────────────────────────────────────────────

class Month(db.Model):
    __tablename__ = "months"

    id           = db.Column(db.Integer, primary_key=True)
    nombre       = db.Column(db.String(100), nullable=False)   # "Junio 2025"
    meta_mensual = db.Column(db.Integer, default=0)
    company_id   = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False)
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)

    days = db.relationship(
        "Day", backref="month", lazy=True, cascade="all, delete-orphan"
    )

    @property
    def total_mes(self):
        return sum(d.total_dia for d in self.days)

    @property
    def progreso_pct(self):
        if not self.meta_mensual:
            return 0
        return round(min(self.total_mes / self.meta_mensual * 100, 100), 1)

    def to_dict(self, include_days=False):
        data = {
            "id":            self.id,
            "nombre":        self.nombre,
            "meta_mensual":  self.meta_mensual,
            "company_id":    self.company_id,
            "total_mes":     self.total_mes,
            "progreso_pct":  self.progreso_pct,
        }
        if include_days:
            data["days"] = [d.to_dict() for d in sorted(self.days, key=lambda d: d.fecha)]
        return data


# ─────────────────────────────────────────────
# DAY
# ─────────────────────────────────────────────

class Day(db.Model):
    __tablename__ = "days"

    id            = db.Column(db.Integer, primary_key=True)
    fecha         = db.Column(db.Date, nullable=False)
    month_id      = db.Column(db.Integer, db.ForeignKey("months.id"), nullable=False)

    racha_inicio  = db.Column(db.String(5))    # "08:00"
    racha_fin     = db.Column(db.String(5))    # "16:00"
    bono_racha    = db.Column(db.Integer, default=0)
    horas_reales  = db.Column(db.Float, default=0.0)

    meta_diaria   = db.Column(db.Integer, default=0)
    cerrado       = db.Column(db.Boolean, default=False)

    orders = db.relationship(
        "Order", backref="day", lazy=True, cascade="all, delete-orphan"
    )

    @property
    def total_pedidos(self):
        return sum(o.total_orden for o in self.orders)

    @property
    def total_sku(self):
        return sum(o.sku for o in self.orders)

    @property
    def total_dia(self):
        return self.total_pedidos + self.bono_racha

    @property
    def progreso_pct(self):
        if not self.meta_diaria:
            return 0
        return round(min(self.total_dia / self.meta_diaria * 100, 100), 1)

    def to_dict(self, include_orders=False):
        company = self.month.company
        tariff  = company.tariff_activa()

        data = {
            "id":           self.id,
            "fecha":        self.fecha.isoformat(),
            "month_id":     self.month_id,
            "company_id":   company.id,
            "tariff_activa": tariff.to_dict() if tariff else None,
            "racha_inicio": self.racha_inicio,
            "racha_fin":    self.racha_fin,
            "bono_racha":   self.bono_racha,
            "horas_reales": self.horas_reales,
            "meta_diaria":  self.meta_diaria,
            "cerrado":      self.cerrado,
            "total_pedidos":self.total_pedidos,
            "total_sku":    self.total_sku,
            "total_dia":    self.total_dia,
            "progreso_pct": self.progreso_pct,
        }
        if include_orders:
            data["orders"] = [o.to_dict() for o in self.orders]
        return data


# ─────────────────────────────────────────────
# ORDER
# ─────────────────────────────────────────────

class Order(db.Model):
    __tablename__ = "orders"

    id            = db.Column(db.Integer, primary_key=True)
    day_id        = db.Column(db.Integer, db.ForeignKey("days.id"), nullable=False)

    tipo          = db.Column(db.String(30), nullable=False)  # "normal" | "bipicking" | custom
    sku           = db.Column(db.Integer, nullable=False, default=0)
    especial      = db.Column(db.Boolean, default=False)
    extra_monto   = db.Column(db.Integer, default=0)   # monto extra manual (bonos, especiales)
    nota          = db.Column(db.String(200))           # observación opcional

    # Snapshot de tarifas al momento de registrar (para no perder historial)
    tariff_snapshot = db.Column(db.JSON)

    created_at    = db.Column(db.DateTime, default=datetime.utcnow)

    @property
    def total_orden(self):
        """Calcula usando el snapshot guardado, no la tarifa actual."""
        snap = self.tariff_snapshot or {}
        if self.tipo == "normal":
            base = snap.get("normal_por_pedido", 0) + snap.get("normal_por_sku", 0) * self.sku
        elif self.tipo == "bipicking":
            base = snap.get("bip_por_pedido", 0) + snap.get("bip_por_sku", 0) * self.sku
        else:
            tipos_extra = snap.get("tipos_extra", {})
            t = tipos_extra.get(self.tipo, {})
            base = t.get("pedido", 0) + t.get("sku", 0) * self.sku
        return base + (self.extra_monto or 0)

    def to_dict(self):
        return {
            "id":          self.id,
            "day_id":      self.day_id,
            "tipo":        self.tipo,
            "sku":         self.sku,
            "especial":    self.especial,
            "extra_monto": self.extra_monto,
            "nota":        self.nota,
            "total_orden": self.total_orden,
            "created_at":  self.created_at.isoformat(),
        }
