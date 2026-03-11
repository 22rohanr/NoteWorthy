"""
Analytics routes – trending data derived from recent reviews.

Blueprint: ``analytics_bp``, registered at ``/api/analytics``

Endpoints:
    GET /trending  – top trending notes and brands
"""

from flask import Blueprint, jsonify

from services.trending_service import TrendingService

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.route("/trending", methods=["GET"])
def trending():
    """Return the top 5 trending notes and brands from recent reviews."""
    data = TrendingService().get_trending()
    return jsonify(data), 200
