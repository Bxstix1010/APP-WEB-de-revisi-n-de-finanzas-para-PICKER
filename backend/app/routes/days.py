from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import date
from app import db
from app.models import Day, Month

days_bp = Blueprint("days", __name__)


def _check_month_access(month_id, user_id):
    month = Month.query.get_or_404(month_id)
    if month.company.profile.user_id != user_id:
        return None
    return month


# ── Listar días de un mes ─────────────────────────────────────────

@days_bp.get("/month/<int:month_id>")
@jwt_required()
def listar_dias(month_id):
    user_id = int(get_jwt_identity())
    month   = _check_month_access(month_id, user_id)
    if not month:
        return jsonify({"error": "Sin acceso"}), 403

    dias = sorted(month.days, key=lambda d: d.fecha)
    return jsonify([d.to_dict(include_orders=True) for d in dias])


# ── Detalle de un día ─────────────────────────────────────────────

@days_bp.get("/<int:day_id>")
@jwt_required()
def detalle_dia(day_id):
    user_id = int(get_jwt_identity())
    day     = Day.query.get_or_404(day_id)
    if day.month.company.profile.user_id != user_id:
        return jsonify({"error": "Sin acceso"}), 403

    return jsonify(day.to_dict(include_orders=True))


# ── Crear día ─────────────────────────────────────────────────────

@days_bp.post("/month/<int:month_id>")
@jwt_required()
def crear_dia(month_id):
    user_id = int(get_jwt_identity())
    month   = _check_month_access(month_id, user_id)
    if not month:
        return jsonify({"error": "Sin acceso"}), 403

    data = request.get_json()
    fecha_str = data.get("fecha", str(date.today()))

    # Evitar días duplicados en el mismo mes
    fecha = date.fromisoformat(fecha_str)
    if Day.query.filter_by(month_id=month_id, fecha=fecha).first():
        return jsonify({"error": "Ya existe un día con esa fecha en este mes"}), 409

    day = Day(
        fecha        = fecha,
        month_id     = month_id,
        racha_inicio = data.get("racha_inicio"),
        racha_fin    = data.get("racha_fin"),
        bono_racha   = int(data.get("bono_racha", 0)),
        horas_reales = float(data.get("horas_reales", 0)),
        meta_diaria  = int(data.get("meta_diaria", 0)),
    )
    db.session.add(day)
    db.session.commit()

    return jsonify(day.to_dict()), 201


# ── Actualizar día ────────────────────────────────────────────────

@days_bp.patch("/<int:day_id>")
@jwt_required()
def actualizar_dia(day_id):
    user_id = int(get_jwt_identity())
    day     = Day.query.get_or_404(day_id)
    if day.month.company.profile.user_id != user_id:
        return jsonify({"error": "Sin acceso"}), 403

    data = request.get_json()
    campos = ["racha_inicio", "racha_fin", "bono_racha", "horas_reales", "meta_diaria", "cerrado"]
    for campo in campos:
        if campo in data:
            setattr(day, campo, data[campo])

    db.session.commit()
    return jsonify(day.to_dict(include_orders=True))


# ── Eliminar día ──────────────────────────────────────────────────

@days_bp.delete("/<int:day_id>")
@jwt_required()
def eliminar_dia(day_id):
    user_id = int(get_jwt_identity())
    day     = Day.query.get_or_404(day_id)
    if day.month.company.profile.user_id != user_id:
        return jsonify({"error": "Sin acceso"}), 403

    db.session.delete(day)
    db.session.commit()
    return jsonify({"ok": True})
