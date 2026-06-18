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
    CORS(app, origins=app.config["CORS_ORIGINS"])

    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.companies import companies_bp
    from app.routes.months import months_bp
    from app.routes.days import days_bp
    from app.routes.orders import orders_bp
    from app.routes.stats import stats_bp

    app.register_blueprint(auth_bp,      url_prefix="/api/auth")
    app.register_blueprint(companies_bp, url_prefix="/api/companies")
    app.register_blueprint(months_bp,    url_prefix="/api/months")
    app.register_blueprint(days_bp,      url_prefix="/api/days")
    app.register_blueprint(orders_bp,    url_prefix="/api/orders")
    app.register_blueprint(stats_bp,     url_prefix="/api/stats")

    return app
