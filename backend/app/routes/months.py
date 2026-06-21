from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Month, Company

months_bp = Blueprint("months", __name__)


# ── Listar meses de una empresa ───────────────────────────────────

@months_bp.get("/company/<int:company_id>")
@jwt_required()
def listar_meses(company_id):
    user_id = int(get_jwt_identity())
    company = Company.query.get_or_404(company_id)
    if company.profile.user_id != user_id:
        return jsonify({"error": "Sin acceso"}), 403

    meses = sorted(company.months, key=lambda m: m.created_at, reverse=True)
    return jsonify([m.to_dict() for m in meses])


# ── Detalle de un mes ───────────────────────────────────────────────

@months_bp.get("/<int:month_id>")
@jwt_required()
def detalle_mes(month_id):
    user_id = int(get_jwt_identity())
    mes     = Month.query.get_or_404(month_id)
    if mes.company.profile.user_id != user_id:
        return jsonify({"error": "Sin acceso"}), 403

    return jsonify(mes.to_dict())


# ── Crear mes ─────────────────────────────────────────────────────

@months_bp.post("/company/<int:company_id>")
@jwt_required()
def crear_mes(company_id):
    user_id = int(get_jwt_identity())
    company = Company.query.get_or_404(company_id)
    if company.profile.user_id != user_id:
        return jsonify({"error": "Sin acceso"}), 403

    data   = request.get_json()
    nombre = data.get("nombre", "").strip()
    if not nombre:
        return jsonify({"error": "nombre requerido"}), 400

    mes = Month(
        nombre       = nombre,
        company_id   = company_id,
        meta_mensual = int(data.get("meta_mensual", 0)),
    )
    db.session.add(mes)
    db.session.commit()
    return jsonify(mes.to_dict()), 201


# ── Actualizar mes ────────────────────────────────────────────────

@months_bp.patch("/<int:month_id>")
@jwt_required()
def actualizar_mes(month_id):
    user_id = int(get_jwt_identity())
    mes     = Month.query.get_or_404(month_id)
    if mes.company.profile.user_id != user_id:
        return jsonify({"error": "Sin acceso"}), 403

    data = request.get_json()
    if "nombre" in data:
        mes.nombre = data["nombre"]
    if "meta_mensual" in data:
        mes.meta_mensual = int(data["meta_mensual"])

    db.session.commit()
    return jsonify(mes.to_dict())


# ── Eliminar mes ──────────────────────────────────────────────────

@months_bp.delete("/<int:month_id>")
@jwt_required()
def eliminar_mes(month_id):
    user_id = int(get_jwt_identity())
    mes     = Month.query.get_or_404(month_id)
    if mes.company.profile.user_id != user_id:
        return jsonify({"error": "Sin acceso"}), 403

    db.session.delete(mes)
    db.session.commit()
    return jsonify({"ok": True})
