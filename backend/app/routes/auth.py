from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
)
from app import db
from app.models import User, Profile

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/register")
def register():
    data = request.get_json()
    nombre   = data.get("nombre", "").strip()
    email    = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password or not nombre:
        return jsonify({"error": "nombre, email y password son requeridos"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Ya existe una cuenta con ese email"}), 409

    user = User(
        nombre=nombre,
        email=email,
        password_hash=generate_password_hash(password),
        rol="admin" if User.query.count() == 0 else "usuario",
    )
    db.session.add(user)
    db.session.flush()  # obtenemos el id antes del commit

    # Crear perfil por defecto
    perfil = Profile(nombre="Mi perfil", user_id=user.id)
    db.session.add(perfil)
    db.session.commit()

    access_token  = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify({
        "user":          user.to_dict(),
        "access_token":  access_token,
        "refresh_token": refresh_token,
    }), 201


@auth_bp.post("/login")
def login():
    data     = request.get_json()
    email    = data.get("email", "").strip().lower()
    password = data.get("password", "")

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Email o contraseña incorrectos"}), 401

    access_token  = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify({
        "user":          user.to_dict(),
        "access_token":  access_token,
        "refresh_token": refresh_token,
    })


@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    identity     = get_jwt_identity()
    access_token = create_access_token(identity=identity)
    return jsonify({"access_token": access_token})


@auth_bp.get("/me")
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    user    = User.query.get_or_404(user_id)
    return jsonify(user.to_dict())


@auth_bp.patch("/me")
@jwt_required()
def actualizar_me():
    user_id = int(get_jwt_identity())
    user    = User.query.get_or_404(user_id)

    data = request.get_json()
    if "retencion_pct" in data:
        pct = float(data["retencion_pct"])
        if pct < 0 or pct > 100:
            return jsonify({"error": "El porcentaje debe estar entre 0 y 100"}), 400
        user.retencion_pct = pct

    if "nombre" in data and data["nombre"].strip():
        user.nombre = data["nombre"].strip()

    db.session.commit()
    return jsonify(user.to_dict())
