import os
from datetime import timedelta


class BaseConfig:
    SECRET_KEY = os.environ.get("SECRET_KEY", "cambia-en-produccion")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=12)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)


class DevelopmentConfig(BaseConfig):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        "sqlite:///picker_dev.db"   # fallback local para desarrollo inicial
    )
    CORS_ORIGINS = ["http://localhost:5173"]  # Vite dev server


class ProductionConfig(BaseConfig):
    DEBUG = False
    # Railway provee DATABASE_URL automáticamente
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "").replace(
        "postgres://", "postgresql://"  # SQLAlchemy requiere postgresql://
    )

    # Dominio estable definido manualmente (ej: https://app-picker-fawn.vercel.app)
    _frontend_url = os.environ.get("FRONTEND_URL", "").strip().rstrip("/")
    CORS_ORIGINS = [_frontend_url] if _frontend_url else []

    # Además, acepta cualquier preview deploy de Vercel del mismo proyecto
    # (URLs con hash aleatorio tipo app-picker-xyz123.vercel.app)
    CORS_ORIGIN_REGEX = r"^https://app-picker-.*\.vercel\.app$"


config = {
    "development": DevelopmentConfig,
    "production":  ProductionConfig,
}
