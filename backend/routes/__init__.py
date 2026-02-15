"""
Route blueprints package.

Re-exports every blueprint for convenient imports::

    from routes import auth_bp, fragrances_bp, reviews_bp, discovery_bp
"""

from routes.auth import auth_bp
from routes.discovery import discovery_bp
from routes.fragrances import fragrances_bp
from routes.reviews import reviews_bp

__all__ = [
    "auth_bp",
    "discovery_bp",
    "fragrances_bp",
    "reviews_bp",
]
