"""
Flask application factory.

Creates and configures the Flask app, applies CORS, and registers
all route blueprints.  Import `create_app` wherever you need the app
instance (e.g. run.py, tests).
"""

from flask import Flask
from flask_cors import CORS

from config import Config


def create_app() -> Flask:
    """Application factory – call this to build a configured Flask app."""

    app = Flask(__name__)
    app.url_map.strict_slashes = False

    # ── Core configuration ───────────────────────────────────────────
    app.config["SECRET_KEY"] = Config.SECRET_KEY
    app.config["DEBUG"] = Config.DEBUG

    # ── CORS ─────────────────────────────────────────────────────────
    # Allow the typical Vite dev-server origin plus any origins
    # specified in the CORS_ORIGINS env var.
    CORS(
        app,
        origins=Config.CORS_ORIGINS,
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    )

    # ── Register blueprints ──────────────────────────────────────────
    _register_blueprints(app)

    # ── Health-check route ───────────────────────────────────────────
    @app.route("/health")
    def health():
        return {"status": "ok"}

    return app


def _register_blueprints(app: Flask) -> None:
    """Import and register all route blueprints."""
    from routes.auth import auth_bp
    from routes.fragrances import fragrances_bp
    from routes.reviews import reviews_bp
    from routes.discovery import discovery_bp
    from routes.collection import collection_bp

    app.register_blueprint(auth_bp,        url_prefix="/api/auth")
    app.register_blueprint(fragrances_bp,  url_prefix="/api/fragrances")
    app.register_blueprint(reviews_bp,     url_prefix="/api/reviews")
    app.register_blueprint(discovery_bp,   url_prefix="/api/discovery")
    app.register_blueprint(collection_bp,  url_prefix="/api/collection")
