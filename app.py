from flask import (
    Flask,
    render_template,
    request,
    redirect,
    url_for,
    flash,
    abort,
)
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta

from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import (
    LoginManager,
    login_user,
    login_required,
    logout_user,
    current_user,
    UserMixin,
)

# =========================
# CONFIGURACIÓN BÁSICA
# =========================
app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///picker.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.secret_key = "cambia-esta-clave"

db = SQLAlchemy(app)

login_manager = LoginManager(app)
login_manager.login_view = "login"  # ruta de login


# =========================
# CONSTANTES / TARIFAS
# =========================

# Tarifas por tipo de pedido (puedes cambiarlas después)
TARIFAS = {
    "normal": {"sku": 65, "pedido": 1350},
    "bipicking": {"sku": 52, "pedido": 1080},
}


# =========================
# FUNCIONES AUXILIARES
# =========================

def obtener_semana(fecha_str):
    fecha = datetime.strptime(fecha_str, "%Y-%m-%d")
    inicio_semana = fecha - timedelta(days=fecha.weekday())  # lunes
    fin_semana = inicio_semana + timedelta(days=6)  # domingo
    return inicio_semana.date(), fin_semana.date()


def calcular_total_semanal(dia_actual):
    inicio, fin = obtener_semana(dia_actual.fecha)

    dias_semana = Day.query.filter(
        Day.fecha >= str(inicio),
        Day.fecha <= str(fin),
        Day.month_id == dia_actual.month_id,  # solo días del mismo mes
    ).all()

    return sum(d.total_dia for d in dias_semana)


def calcular_total_semanal_mes(mes):
    # Si no hay días, total semanal = 0
    if not mes.days:
        return 0, None, None

    # Tomamos la fecha más reciente del mes
    ultimo_dia = sorted(mes.days, key=lambda d: d.fecha)[-1]

    inicio, fin = obtener_semana(ultimo_dia.fecha)

    dias_semana = Day.query.filter(
        Day.month_id == mes.id,
        Day.fecha >= str(inicio),
        Day.fecha <= str(fin),
    ).all()

    total = sum(d.total_dia for d in dias_semana)

    return total, inicio, fin


def es_admin():
    return current_user.is_authenticated and current_user.rol == "admin"


# =========================
# MODELOS
# =========================

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100))
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    rol = db.Column(db.String(20), default="usuario")  # "usuario" o "admin"

    meses = db.relationship(
        "Month",
        backref="user",
        lazy=True,
        cascade="all, delete-orphan",
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class Month(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)  # Ej: "Noviembre 2025"
    meta_mensual = db.Column(db.Integer, default=0)

    # Relación con usuario
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)

    days = db.relationship(
        "Day", backref="month", lazy=True, cascade="all, delete-orphan"
    )

    @property
    def total_mes(self):
        return sum(d.total_dia for d in self.days)


class Day(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    fecha = db.Column(db.String(10), nullable=False)
    racha_inicio = db.Column(db.String(5))
    racha_fin = db.Column(db.String(5))
    bono_racha = db.Column(db.Integer, default=0)
    horas_reales = db.Column(db.Float, default=0.0)
    month_id = db.Column(db.Integer, db.ForeignKey("month.id"), nullable=False)

    meta_diaria = db.Column(db.Integer, default=0)
    sku_estimado = db.Column(db.Integer, default=0)
    cerrado = db.Column(db.Boolean, default=False)

    orders = db.relationship(
        "Order", backref="day", lazy=True, cascade="all, delete-orphan"
    )

    @property
    def total_pedidos(self):
        return sum(o.total_pedido for o in self.orders)

    @property
    def total_sku(self):
        return sum(o.sku for o in self.orders)

    @property
    def total_dia(self):
        return self.total_pedidos + self.bono_racha


class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    tipo = db.Column(db.String(20), nullable=False)  # "normal" o "bipicking"
    sku = db.Column(db.Integer, nullable=False)
    especial = db.Column(db.Boolean, default=False)
    extra_especial = db.Column(
        db.Integer, default=0
    )  # extra por pedido especial (si aplica)

    day_id = db.Column(db.Integer, db.ForeignKey("day.id"), nullable=False)

    @property
    def total_pedido(self):
        tarifas = TARIFAS[self.tipo]
        base = tarifas["pedido"] + tarifas["sku"] * self.sku
        return base + (self.extra_especial or 0)


# =========================
# LOGIN MANAGER
# =========================

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


# =========================
# RUTAS AUTENTICACIÓN
# =========================

@app.route("/register", methods=["GET", "POST"])
def register():
    if current_user.is_authenticated:
        return redirect(url_for("listar_meses"))

    if request.method == "POST":
        nombre = request.form.get("nombre")
        email = request.form.get("email")
        password = request.form.get("password")

        if not email or not password:
            flash("Email y contraseña son obligatorios.", "danger")
            return redirect(url_for("register"))

        if User.query.filter_by(email=email).first():
            flash("Ya existe un usuario con ese email.", "danger")
            return redirect(url_for("register"))

        user = User(nombre=nombre, email=email)
        user.set_password(password)

        # Opcional: el primer usuario creado puede ser admin
        if User.query.count() == 0:
            user.rol = "admin"

        db.session.add(user)
        db.session.commit()

        flash("Usuario creado. Ahora puedes iniciar sesión.", "success")
        return redirect(url_for("login"))

    return render_template("register.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("listar_meses"))

    if request.method == "POST":
        email = request.form.get("email")
        password = request.form.get("password")

        user = User.query.filter_by(email=email).first()
        if not user or not user.check_password(password):
            flash("Email o contraseña incorrectos.", "danger")
            return redirect(url_for("login"))

        login_user(user)
        flash("Sesión iniciada.", "success")
        return redirect(url_for("listar_meses"))

    return render_template("login.html")


@app.route("/logout")
@login_required
def logout():
    logout_user()
    flash("Sesión cerrada.", "info")
    return redirect(url_for("login"))


# =========================
# RUTAS ADMIN
# =========================

@app.route("/admin/usuarios")
@login_required
def admin_usuarios():
    if not es_admin():
        abort(403)
    usuarios = User.query.all()
    return render_template("usuarios.html", usuarios=usuarios)


@app.route("/admin/usuarios/<int:user_id>/delete", methods=["POST"])
@login_required
def admin_eliminar_usuario(user_id):
    if not es_admin():
        abort(403)
    if current_user.id == user_id:
        flash("No puedes eliminar tu propio usuario desde aquí.", "warning")
        return redirect(url_for("admin_usuarios"))

    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    flash("Usuario eliminado.", "info")
    return redirect(url_for("admin_usuarios"))


# =========================
# RUTAS PRINCIPALES
# =========================

@app.route("/")
def home():
    if current_user.is_authenticated:
        return redirect(url_for("listar_meses"))
    return redirect(url_for("login"))


# ----- MESES -----

@app.route("/months")
@login_required
def listar_meses():
    meses = Month.query.filter_by(user_id=current_user.id).all()
    return render_template("months.html", meses=meses)


@app.route("/months/new", methods=["POST"])
@login_required
def crear_mes():
    nombre = request.form.get("nombre")
    if not nombre:
        flash("Debes ingresar un nombre para el mes.", "danger")
        return redirect(url_for("listar_meses"))

    mes = Month(nombre=nombre, user_id=current_user.id)
    db.session.add(mes)
    db.session.commit()
    flash("Mes creado correctamente.", "success")
    return redirect(url_for("listar_meses"))


@app.route("/months/<int:month_id>/delete", methods=["POST"])
@login_required
def eliminar_mes(month_id):
    mes = Month.query.get_or_404(month_id)
    if mes.user_id != current_user.id and not es_admin():
        abort(403)

    db.session.delete(mes)
    db.session.commit()
    flash("Mes eliminado.", "info")
    return redirect(url_for("listar_meses"))


@app.route("/months/<int:month_id>/update_goal", methods=["POST"])
@login_required
def actualizar_meta_mensual(month_id):
    mes = Month.query.get_or_404(month_id)
    if mes.user_id != current_user.id and not es_admin():
        abort(403)

    mes.meta_mensual = int(request.form.get("meta_mensual") or 0)
    db.session.commit()
    return redirect(url_for("detalle_mes", month_id=month_id))


# ----- DÍAS -----

@app.route("/months/<int:month_id>")
@login_required
def detalle_mes(month_id):
    mes = Month.query.get_or_404(month_id)
    if mes.user_id != current_user.id and not es_admin():
        abort(403)

    fecha_base = request.args.get("fecha")

    if fecha_base:
        fecha_base_dt = datetime.strptime(fecha_base, "%Y-%m-%d")
    else:
        if not mes.days:
            return render_template("month_detail.html", mes=mes, total_semana=0)
        fecha_base_dt = datetime.strptime(mes.days[-1].fecha, "%Y-%m-%d")

    inicio, fin = obtener_semana(fecha_base_dt.strftime("%Y-%m-%d"))

    dias_semana = Day.query.filter(
        Day.month_id == mes.id,
        Day.fecha >= str(inicio),
        Day.fecha <= str(fin),
    ).all()

    total_semana = sum(d.total_dia for d in dias_semana)

    return render_template(
        "month_detail.html",
        mes=mes,
        total_semana=total_semana,
        inicio_semana=inicio,
        fin_semana=fin,
        fecha_base=fecha_base_dt.strftime("%Y-%m-%d"),
        timedelta=timedelta,
    )


@app.route("/months/<int:month_id>/days/new", methods=["POST"])
@login_required
def crear_dia(month_id):
    mes = Month.query.get_or_404(month_id)
    if mes.user_id != current_user.id and not es_admin():
        abort(403)

    fecha = request.form.get("fecha")
    racha = request.form.get("racha")
    racha_inicio, racha_fin = racha.split("-")

    bono_racha = int(request.form.get("bono_racha") or 0)
    horas_reales = float(request.form.get("horas_reales") or 0)

    dia = Day(
        fecha=fecha,
        racha_inicio=racha_inicio.strip(),
        racha_fin=racha_fin.strip(),
        bono_racha=bono_racha,
        horas_reales=horas_reales,
        month=mes,
    )
    db.session.add(dia)
    db.session.commit()

    return redirect(url_for("detalle_mes", month_id=month_id))


@app.route("/days/<int:day_id>/delete", methods=["POST"])
@login_required
def eliminar_dia(day_id):
    dia = Day.query.get_or_404(day_id)
    mes = dia.month
    if mes.user_id != current_user.id and not es_admin():
        abort(403)

    month_id = dia.month_id
    db.session.delete(dia)
    db.session.commit()
    flash("Día eliminado.", "info")
    return redirect(url_for("detalle_mes", month_id=month_id))


@app.route("/days/<int:day_id>/update_hours", methods=["POST"])
@login_required
def actualizar_horas(day_id):
    dia = Day.query.get_or_404(day_id)
    mes = dia.month
    if mes.user_id != current_user.id and not es_admin():
        abort(403)

    horas = float(request.form.get("horas_reales") or 0)
    dia.horas_reales = horas
    db.session.commit()
    return redirect(url_for("detalle_dia", day_id=day_id))


@app.route("/days/<int:day_id>/update_goal", methods=["POST"])
@login_required
def actualizar_meta(day_id):
    dia = Day.query.get_or_404(day_id)
    mes = dia.month
    if mes.user_id != current_user.id and not es_admin():
        abort(403)

    dia.meta_diaria = int(request.form.get("meta_diaria") or 0)
    dia.sku_estimado = int(request.form.get("sku_estimado") or 0)
    db.session.commit()
    return redirect(url_for("detalle_dia", day_id=day_id))


@app.route("/days/<int:day_id>/close", methods=["POST"])
@login_required
def cerrar_dia(day_id):
    dia = Day.query.get_or_404(day_id)
    mes = dia.month
    if mes.user_id != current_user.id and not es_admin():
        abort(403)

    dia.cerrado = True
    db.session.commit()
    return redirect(url_for("detalle_dia", day_id=day_id))


@app.route("/days/<int:day_id>/open", methods=["POST"])
@login_required
def abrir_dia(day_id):
    dia = Day.query.get_or_404(day_id)
    mes = dia.month
    if mes.user_id != current_user.id and not es_admin():
        abort(403)

    dia.cerrado = False
    db.session.commit()
    return redirect(url_for("detalle_dia", day_id=day_id))


# ----- PEDIDOS -----

@app.route("/days/<int:day_id>")
@login_required
def detalle_dia(day_id):
    dia = Day.query.get_or_404(day_id)
    mes = dia.month
    if mes.user_id != current_user.id and not es_admin():
        abort(403)

    total_semana = calcular_total_semanal(dia)
    return render_template("day_detail.html", dia=dia, total_semana=total_semana)


@app.route("/days/<int:day_id>/orders/new", methods=["POST"])
@login_required
def crear_pedido(day_id):
    dia = Day.query.get_or_404(day_id)
    mes = dia.month
    if mes.user_id != current_user.id and not es_admin():
        abort(403)

    if dia.cerrado:
        flash("El día está cerrado. No puedes agregar más pedidos.", "warning")
        return redirect(url_for("detalle_dia", day_id=day_id))

    tipo = request.form.get("tipo")
    sku = int(request.form.get("sku") or 0)
    especial = request.form.get("especial") == "on"
    extra_especial = int(request.form.get("extra_especial") or 0)

    pedido = Order(
        tipo=tipo,
        sku=sku,
        especial=especial,
        extra_especial=extra_especial,
        day=dia,
    )

    db.session.add(pedido)
    db.session.commit()

    return redirect(url_for("detalle_dia", day_id=day_id))


@app.route("/orders/<int:order_id>/delete", methods=["POST"])
@login_required
def eliminar_pedido(order_id):
    pedido = Order.query.get_or_404(order_id)
    dia = pedido.day
    mes = dia.month
    if mes.user_id != current_user.id and not es_admin():
        abort(403)

    day_id = pedido.day_id
    db.session.delete(pedido)
    db.session.commit()
    flash("Pedido eliminado.", "info")
    return redirect(url_for("detalle_dia", day_id=day_id))


# =========================
# MAIN
# =========================

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)
