"""
Collection routes – manage a user's fragrance collection.

Blueprint: ``collection_bp``, registered at ``/api/collection``

Endpoints:
    GET  /        – return the authenticated user's collection with resolved fragrances
    POST /add     – add a fragrance to a collection tab
    POST /remove  – remove a fragrance from a collection tab

All endpoints require a valid Firebase ID token in the Authorization header.
"""

from __future__ import annotations

from flask import Blueprint, jsonify, request
from firebase_admin import auth as firebase_auth

from cache import get_cache
from services.user_service import UserService

collection_bp = Blueprint("collection", __name__)

_user_service = UserService()


# ── helpers ──────────────────────────────────────────────────────────

def _get_uid_from_token() -> tuple[str | None, tuple | None]:
    """Extract and verify the Firebase UID from the Authorization header.

    Returns ``(uid, None)`` on success, or ``(None, (response, status))``
    on failure so callers can ``return error_response``.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None, (jsonify({"error": "Authorization header required"}), 401)

    id_token = auth_header.split("Bearer ", 1)[1]
    try:
        decoded = firebase_auth.verify_id_token(id_token)
    except Exception:
        return None, (jsonify({"error": "Invalid or expired token"}), 401)

    return decoded.get("uid", ""), None


def _resolve_fragrances(ids: list[str]) -> list[dict]:
    """Look up full fragrance objects for a list of IDs using the cache."""
    cache = get_cache()
    id_set = set(ids)
    return [f for f in cache.fragrances if f["id"] in id_set]


# ── GET / ────────────────────────────────────────────────────────────

@collection_bp.route("/", methods=["GET"])
def get_collection():
    """Return the authenticated user's collection with resolved fragrance objects.

    Response::

        {
            "collection": {
                "owned":    [ {fragrance}, ... ],
                "sampled":  [ {fragrance}, ... ],
                "wishlist": [ {fragrance}, ... ]
            }
        }
    """
    uid, error = _get_uid_from_token()
    if error:
        return error

    user = _user_service.get_by_id(uid)
    if user is None:
        return jsonify({"error": "User not found"}), 404

    raw = user.get("collection", {"owned": [], "sampled": [], "wishlist": []})

    return jsonify({
        "collection": {
            "owned":    _resolve_fragrances(raw.get("owned", [])),
            "sampled":  _resolve_fragrances(raw.get("sampled", [])),
            "wishlist": _resolve_fragrances(raw.get("wishlist", [])),
        }
    }), 200


# ── POST /add ────────────────────────────────────────────────────────

@collection_bp.route("/add", methods=["POST"])
def add_to_collection():
    """Add a fragrance to one of the user's collection tabs.

    Expects JSON::

        { "fragranceId": "<id>", "tab": "owned" | "sampled" | "wishlist" }
    """
    uid, error = _get_uid_from_token()
    if error:
        return error

    body = request.get_json(silent=True) or {}
    fragrance_id = body.get("fragranceId", "").strip()
    tab = body.get("tab", "").strip()

    if not fragrance_id:
        return jsonify({"error": "fragranceId is required"}), 400
    if not tab:
        return jsonify({"error": "tab is required"}), 400

    try:
        _user_service.add_to_collection(uid, tab, fragrance_id)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify({"success": True}), 200


# ── POST /remove ─────────────────────────────────────────────────────

@collection_bp.route("/remove", methods=["POST"])
def remove_from_collection():
    """Remove a fragrance from one of the user's collection tabs.

    Expects JSON::

        { "fragranceId": "<id>", "tab": "owned" | "sampled" | "wishlist" }
    """
    uid, error = _get_uid_from_token()
    if error:
        return error

    body = request.get_json(silent=True) or {}
    fragrance_id = body.get("fragranceId", "").strip()
    tab = body.get("tab", "").strip()

    if not fragrance_id:
        return jsonify({"error": "fragranceId is required"}), 400
    if not tab:
        return jsonify({"error": "tab is required"}), 400

    try:
        _user_service.remove_from_collection(uid, tab, fragrance_id)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify({"success": True}), 200
