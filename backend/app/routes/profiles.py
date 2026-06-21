from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import Profile

profiles_bp = Blueprint("profiles", __name__)


@profiles_bp.get("/me")
@jwt_required()
def mi_perfil():
    """
    Devuelve el (los) perfil(es) del usuario logueado.
    Por ahora cada usuario tiene un único perfil creado automáticamente
    al registrarse (ver auth.py /register), pero este endpoint ya soporta
    múltiples perfiles para cuando se construya esa función en el frontend.
    """
    user_id = int(get_jwt_identity())
    perfiles = Profile.query.filter_by(user_id=user_id).all()
    return jsonify([p.to_dict() for p in perfiles])
