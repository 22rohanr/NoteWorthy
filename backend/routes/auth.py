"""
Auth routes – Firebase ID-token verification and user sync.

Blueprint: ``auth_bp``, registered at ``/api/auth``

Endpoints:
    POST /login    – verify token, return existing user
    POST /register – verify token, create new user
"""

from flask import Blueprint, jsonify, request
from firebase_admin import auth as firebase_auth

from services.user_service import UserService

auth_bp = Blueprint("auth", __name__)

_user_service = UserService()


# ── POST /login ──────────────────────────────────────────────────────
@auth_bp.route("/login", methods=["POST"])
def login():
    """Verify a Firebase ID token and return the matching user profile.

    Expects JSON::

        { "idToken": "<Firebase ID token>" }

    Returns 200 with ``{ "user": {...} }`` or 404 if the user has no
    Firestore profile yet.
    """
    body = request.get_json(silent=True) or {}
    id_token = body.get("idToken", "")

    if not id_token:
        return jsonify({"error": "idToken is required"}), 400

    # Verify the token with Firebase Admin SDK
    try:
        decoded = firebase_auth.verify_id_token(id_token)
    except (
        firebase_auth.InvalidIdTokenError,
        firebase_auth.ExpiredIdTokenError,
        firebase_auth.RevokedIdTokenError,
    ):
        return jsonify({"error": "Invalid or expired token"}), 401
    except Exception:
        return jsonify({"error": "Token verification failed"}), 401

    uid = decoded.get("uid", "")

    # Look up the user by their Firebase UID (= Firestore document ID)
    user = _user_service.get_by_id(uid)
    if user is None:
        return jsonify({"error": "User profile not found"}), 404

    return jsonify({"user": user}), 200


# ── POST /register ───────────────────────────────────────────────────
@auth_bp.route("/register", methods=["POST"])
def register():
    """Verify a Firebase ID token and create a new user profile.

    Expects JSON::

        {
            "idToken":  "<Firebase ID token>",
            "username": "<display name>"
        }

    Returns 201 with ``{ "user": {...} }`` on success.
    Returns 409 if a profile already exists for this UID.
    """
    body = request.get_json(silent=True) or {}
    id_token = body.get("idToken", "")
    username = body.get("username", "").strip()

    if not id_token:
        return jsonify({"error": "idToken is required"}), 400
    if not username:
        return jsonify({"error": "username is required"}), 400

    # Verify the token
    try:
        decoded = firebase_auth.verify_id_token(id_token)
    except (
        firebase_auth.InvalidIdTokenError,
        firebase_auth.ExpiredIdTokenError,
        firebase_auth.RevokedIdTokenError,
    ):
        return jsonify({"error": "Invalid or expired token"}), 401
    except Exception:
        return jsonify({"error": "Token verification failed"}), 401

    uid = decoded.get("uid", "")
    email = decoded.get("email", "")

    # Prevent duplicate profiles
    existing = _user_service.get_by_id(uid)
    if existing is not None:
        return jsonify({"error": "User profile already exists", "user": existing}), 409

    # Create the user with the Firebase UID as the document ID
    user = _user_service.create_with_id(uid, {
        "username": username,
        "email": email,
    })

    return jsonify({"user": user}), 201
