from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Order, Day, Month

orders_bp = Blueprint("orders", __name__)


def _check_day_access(day_id, user_id):
    day = Day.query.get_or_404(day_id)
    month = day.month
    company = month.company
    if company.profile.user_id != user_id:
        return None, None
    return day, company


# ── Crear pedido ──────────────────────────────────────────────────

@orders_bp.post("/day/<int:day_id>")
@jwt_required()
def crear_pedido(day_id):
    user_id = int(get_jwt_identity())
    day, company = _check_day_access(day_id, user_id)
    if not day:
        return jsonify({"error": "Sin acceso"}), 403

    if day.cerrado:
        return jsonify({"error": "El día está cerrado"}), 400

    data = request.get_json()
    tipo        = data.get("tipo", "normal")
    sku         = int(data.get("sku", 0))
    especial    = bool(data.get("especial", False))
    extra_monto = int(data.get("extra_monto", 0))
    nota        = data.get("nota", "")

    # Guardar snapshot de la tarifa vigente al momento del pedido
    tariff = company.tariff_activa()
    snapshot = tariff.to_dict() if tariff else {}

    order = Order(
        day_id          = day_id,
        tipo            = tipo,
        sku             = sku,
        especial        = especial,
        extra_monto     = extra_monto,
        nota            = nota,
        tariff_snapshot = snapshot,
    )
    db.session.add(order)
    db.session.commit()

    # Retorna el pedido + totales actualizados del día
    return jsonify({
        "order":     order.to_dict(),
        "day_total": day.total_dia,
    }), 201


# ── Eliminar pedido ───────────────────────────────────────────────

@orders_bp.delete("/<int:order_id>")
@jwt_required()
def eliminar_pedido(order_id):
    user_id = int(get_jwt_identity())
    order   = Order.query.get_or_404(order_id)
    day     = order.day
    company = day.month.company

    if company.profile.user_id != user_id:
        return jsonify({"error": "Sin acceso"}), 403

    db.session.delete(order)
    db.session.commit()

    return jsonify({
        "ok":        True,
        "day_total": day.total_dia,
    })


# ── Listar pedidos de un día ──────────────────────────────────────

@orders_bp.get("/day/<int:day_id>")
@jwt_required()
def listar_pedidos(day_id):
    user_id = int(get_jwt_identity())
    day, _ = _check_day_access(day_id, user_id)
    if not day:
        return jsonify({"error": "Sin acceso"}), 403

    return jsonify([o.to_dict() for o in day.orders])
