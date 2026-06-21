from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()


def create_app(config_name="development"):
    app = Flask(__name__)

    from app.config import config
    app.config.from_object(config[config_name])

    # Extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    cors_kwargs = {"origins": app.config["CORS_ORIGINS"]}
    regex = app.config.get("CORS_ORIGIN_REGEX")
    if regex:
        # flask-cors acepta origins como lista de strings O regex;
        # combinamos ambos pasando una lista que incluya el patrón compilado.
        import re
        cors_kwargs["origins"] = app.config["CORS_ORIGINS"] + [re.compile(regex)]

    CORS(app, **cors_kwargs)

    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.profiles import profiles_bp
    from app.routes.companies import companies_bp
    from app.routes.months import months_bp
    from app.routes.days import days_bp
    from app.routes.orders import orders_bp
    from app.routes.stats import stats_bp

    app.register_blueprint(auth_bp,      url_prefix="/api/auth")
    app.register_blueprint(profiles_bp,  url_prefix="/api/profiles")
    app.register_blueprint(companies_bp, url_prefix="/api/companies")
    app.register_blueprint(months_bp,    url_prefix="/api/months")
    app.register_blueprint(days_bp,      url_prefix="/api/days")
    app.register_blueprint(orders_bp,    url_prefix="/api/orders")
    app.register_blueprint(stats_bp,     url_prefix="/api/stats")

    # Crea las tablas si no existen. Se ejecuta siempre que la app arranca,
    # sin importar si es vía `python run.py` (desarrollo) o gunicorn (producción/Railway).
    with app.app_context():
        db.create_all()

    return app
