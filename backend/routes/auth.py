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
from services.review_service import ReviewService
from services.discussion_service import DiscussionService
from services.fragrance_service import FragranceService

auth_bp = Blueprint("auth", __name__)

_user_service = UserService()
_review_service = ReviewService()
_discussion_service = DiscussionService()
_fragrance_service = FragranceService()

def _fragrance_summary(fid: str) -> dict | None:
    frag = _fragrance_service.get_by_id(fid)
    if not frag:
        return None
    return {
        "id": frag["id"],
        "name": frag.get("name", ""),
        "brand": {"name": frag.get("brand", {}).get("name", "")},
    }


def _get_uid_from_token() -> tuple[str | None, tuple | None]:
    """Extract and verify the Firebase UID from the Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None, (jsonify({"error": "Authorization header required"}), 401)
    id_token = auth_header.split("Bearer ", 1)[1]
    try:
        decoded = firebase_auth.verify_id_token(id_token)
    except Exception:
        return None, (jsonify({"error": "Invalid or expired token"}), 401)
    return decoded.get("uid", ""), None


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


# ── GET /profile/<user_id> ───────────────────────────────────────────
@auth_bp.route("/profile/<user_id>", methods=["GET"])
def get_profile(user_id: str):
    """Return a user profile with activity summary.

    Public fields are always returned.  The ``email`` field is only
    included when the requester is the profile owner.
    """
    user = _user_service.get_by_id(user_id)
    if user is None:
        return jsonify({"error": "User not found"}), 404

    # Determine if the caller owns this profile
    is_owner = False
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            decoded = firebase_auth.verify_id_token(
                auth_header.split("Bearer ", 1)[1]
            )
            is_owner = decoded.get("uid") == user_id
        except Exception:
            pass

    # Strip private fields for non-owners
    if not is_owner:
        user.pop("email", None)

    # Activity: recent reviews
    reviews = _review_service.get_by_user(user_id)
    frag_ids = {r.get("fragranceId", "") for r in reviews if r.get("fragranceId")}
    frag_map: dict[str, dict] = {}
    for fid in frag_ids:
        summary = _fragrance_summary(fid)
        if summary:
            frag_map[fid] = summary
    enriched_reviews = [
        {**r, "fragrance": frag_map.get(r.get("fragranceId", ""))}
        for r in reviews
    ]
    enriched_reviews.sort(key=lambda r: r.get("createdAt", ""), reverse=True)

    # Resolve the user's collection IDs into fragrance summaries
    raw_collection = user.get("collection") or {"owned": [], "sampled": [], "wishlist": []}
    collection_with_fragrances = {}
    for tab in ("owned", "sampled", "wishlist"):
        items: list[dict] = []
        for fid in raw_collection.get(tab, []):
            summary = _fragrance_summary(fid)
            if summary:
                items.append(summary)
        collection_with_fragrances[tab] = items

    # Activity: discussions
    try:
        discussions = _discussion_service.get_by_user(user_id)
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning("Failed to fetch discussions for %s: %s", user_id, exc)
        discussions = []

    return jsonify({
        "user": user,
        "collectionFragrances": collection_with_fragrances,
        "reviews": enriched_reviews[:10],
        "reviewCount": len(reviews),
        "discussions": discussions[:10],
        "discussionCount": len(discussions),
    }), 200


# ── PATCH /profile ───────────────────────────────────────────────────
@auth_bp.route("/profile", methods=["PATCH"])
def update_profile():
    """Update the authenticated user's profile.

    Accepts any combination of: ``username``, ``bio``, ``avatar``,
    ``preferences`` (partial merge via dot-notation).
    """
    uid, error = _get_uid_from_token()
    if error:
        return error

    user = _user_service.get_by_id(uid)
    if user is None:
        return jsonify({"error": "User profile not found"}), 404

    body = request.get_json(silent=True) or {}

    allowed = {"username", "bio", "avatar", "preferences"}
    update_data = {k: v for k, v in body.items() if k in allowed}

    if not update_data:
        return jsonify({"error": "No valid fields to update"}), 400

    _user_service.update(uid, update_data)

    updated_user = _user_service.get_by_id(uid)
    return jsonify({"user": updated_user}), 200
