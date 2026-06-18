from datetime import date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Company, Tariff, Profile

companies_bp = Blueprint("companies", __name__)


def _get_user_profile(profile_id, user_id):
    profile = Profile.query.get_or_404(profile_id)
    if profile.user_id != user_id:
        return None
    return profile


# ── Listar empresas de un perfil ──────────────────────────────────

@companies_bp.get("/profile/<int:profile_id>")
@jwt_required()
def listar_empresas(profile_id):
    user_id = int(get_jwt_identity())
    profile = _get_user_profile(profile_id, user_id)
    if not profile:
        return jsonify({"error": "Sin acceso"}), 403

    return jsonify([c.to_dict() for c in profile.companies])


# ── Crear empresa ─────────────────────────────────────────────────

@companies_bp.post("/profile/<int:profile_id>")
@jwt_required()
def crear_empresa(profile_id):
    user_id = int(get_jwt_identity())
    profile = _get_user_profile(profile_id, user_id)
    if not profile:
        return jsonify({"error": "Sin acceso"}), 403

    data   = request.get_json()
    nombre = data.get("nombre", "").strip()
    if not nombre:
        return jsonify({"error": "nombre requerido"}), 400

    company = Company(nombre=nombre, perfil_id=profile_id)
    db.session.add(company)
    db.session.flush()

    # Tarifa inicial obligatoria al crear la empresa
    tariff_data = data.get("tarifa", {})
    tariff = Tariff(
        company_id        = company.id,
        vigente_desde     = date.today(),
        activa            = True,
        normal_por_pedido = tariff_data.get("normal_por_pedido", 0),
        normal_por_sku    = tariff_data.get("normal_por_sku", 0),
        bip_por_pedido    = tariff_data.get("bip_por_pedido", 0),
        bip_por_sku       = tariff_data.get("bip_por_sku", 0),
        tipos_extra       = tariff_data.get("tipos_extra", {}),
    )
    db.session.add(tariff)
    db.session.commit()

    return jsonify(company.to_dict()), 201


# ── Actualizar tarifas (crea nueva versión, no borra la anterior) ──

@companies_bp.post("/<int:company_id>/tariffs")
@jwt_required()
def actualizar_tarifa(company_id):
    user_id = int(get_jwt_identity())
    company = Company.query.get_or_404(company_id)
    if company.profile.user_id != user_id:
        return jsonify({"error": "Sin acceso"}), 403

    # Desactivar tarifa anterior
    Tariff.query.filter_by(company_id=company_id, activa=True).update({"activa": False})

    data = request.get_json()
    tariff = Tariff(
        company_id        = company_id,
        vigente_desde     = date.fromisoformat(data.get("vigente_desde", str(date.today()))),
        activa            = True,
        normal_por_pedido = data.get("normal_por_pedido", 0),
        normal_por_sku    = data.get("normal_por_sku", 0),
        bip_por_pedido    = data.get("bip_por_pedido", 0),
        bip_por_sku       = data.get("bip_por_sku", 0),
        tipos_extra       = data.get("tipos_extra", {}),
    )
    db.session.add(tariff)
    db.session.commit()

    return jsonify(tariff.to_dict()), 201


# ── Historial de tarifas ──────────────────────────────────────────

@companies_bp.get("/<int:company_id>/tariffs")
@jwt_required()
def historial_tarifas(company_id):
    user_id = int(get_jwt_identity())
    company = Company.query.get_or_404(company_id)
    if company.profile.user_id != user_id:
        return jsonify({"error": "Sin acceso"}), 403

    tariffs = (
        Tariff.query
        .filter_by(company_id=company_id)
        .order_by(Tariff.vigente_desde.desc())
        .all()
    )
    return jsonify([t.to_dict() for t in tariffs])


# ── Eliminar empresa ──────────────────────────────────────────────

@companies_bp.delete("/<int:company_id>")
@jwt_required()
def eliminar_empresa(company_id):
    user_id = int(get_jwt_identity())
    company = Company.query.get_or_404(company_id)
    if company.profile.user_id != user_id:
        return jsonify({"error": "Sin acceso"}), 403

    db.session.delete(company)
    db.session.commit()
    return jsonify({"ok": True})
