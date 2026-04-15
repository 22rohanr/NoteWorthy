"""
Auth routes – Firebase ID-token verification and user sync.

Blueprint: ``auth_bp``, registered at ``/api/auth``

Endpoints:
    POST /login    – verify token, return existing user
    POST /register – verify token, create new user
"""

from __future__ import annotations

from flask import Blueprint, jsonify, request
from firebase_admin import auth as firebase_auth

from services.user_service import UserService
from services.review_service import ReviewService
from services.discussion_service import DiscussionService
from services.fragrance_service import FragranceService
from services.notification_service import NotificationService

auth_bp = Blueprint("auth", __name__)

_user_service = UserService()
_review_service = ReviewService()
_discussion_service = DiscussionService()
_fragrance_service = FragranceService()
_notification_service = NotificationService()

def _user_summary(uid: str) -> dict | None:
    user = _user_service.get_by_id(uid)
    if not user:
        return None
    return {
        "id": user["id"],
        "username": user.get("username", ""),
        "avatar": user.get("avatar"),
    }

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
    requester_uid = None
    is_owner = False
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            decoded = firebase_auth.verify_id_token(
                auth_header.split("Bearer ", 1)[1]
            )
            requester_uid = decoded.get("uid")
            is_owner = requester_uid == user_id
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

    follower_ids = user.get("followers") or []
    following_ids = user.get("following") or []
    followers = [s for s in (_user_summary(uid) for uid in follower_ids) if s]
    following = [s for s in (_user_summary(uid) for uid in following_ids) if s]
    request_ids = user.get("followRequests") or []
    follow_requests = [s for s in (_user_summary(uid) for uid in request_ids) if s]
    is_following = bool(requester_uid and requester_uid in follower_ids)
    is_requested = bool(requester_uid and requester_uid in request_ids)
    relationship = "not_following"
    if requester_uid == user_id:
        relationship = "self"
    elif is_following:
        relationship = "following"
    elif is_requested:
        relationship = "requested"
    can_view_activity = bool(
        is_owner
        or not user.get("isPrivate", False)
        or (requester_uid and requester_uid in follower_ids)
    )

    return jsonify({
        "user": user,
        "collectionFragrances": collection_with_fragrances,
        "followStats": {
            "followers": len(follower_ids),
            "following": len(following_ids),
        },
        "followUsers": {
            "followers": followers,
            "following": following,
            "requests": follow_requests if is_owner else [],
        },
        "canViewActivity": can_view_activity,
        "followRelationship": relationship,
        "isFollowing": is_following,
        "reviews": enriched_reviews[:10] if can_view_activity else [],
        "reviewCount": len(reviews) if can_view_activity else 0,
        "discussions": discussions[:10] if can_view_activity else [],
        "discussionCount": len(discussions) if can_view_activity else 0,
    }), 200


@auth_bp.route("/follow/<target_id>", methods=["POST"])
def follow_user(target_id: str):
    uid, error = _get_uid_from_token()
    if error:
        return error

    if _user_service.get_by_id(uid) is None:
        return jsonify({"error": "User profile not found"}), 404
    if _user_service.get_by_id(target_id) is None:
        return jsonify({"error": "Target user not found"}), 404

    try:
        _user_service.follow_user(uid, target_id)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    updated_target = _user_service.get_by_id(target_id) or {}
    is_private = bool(updated_target.get("isPrivate"))

    actor = _user_service.get_by_id(uid) or {}
    actor_name = actor.get("username", "Someone")
    if is_private:
        _notification_service.create(
            recipient_id=target_id,
            actor_id=uid,
            notification_type="follow_request",
            message=f"{actor_name} requested to follow you",
        )
    else:
        _notification_service.create(
            recipient_id=target_id,
            actor_id=uid,
            notification_type="follow",
            message=f"{actor_name} started following you",
        )

    return jsonify({"success": True, "status": "requested" if is_private else "following"}), 200


@auth_bp.route("/follow/<target_id>", methods=["DELETE"])
def unfollow_user(target_id: str):
    uid, error = _get_uid_from_token()
    if error:
        return error

    if _user_service.get_by_id(uid) is None:
        return jsonify({"error": "User profile not found"}), 404
    if _user_service.get_by_id(target_id) is None:
        return jsonify({"error": "Target user not found"}), 404

    try:
        _user_service.unfollow_user(uid, target_id)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    return jsonify({"success": True}), 200


@auth_bp.route("/follow/requests/<requester_id>/accept", methods=["POST"])
def accept_follow_request(requester_id: str):
    uid, error = _get_uid_from_token()
    if error:
        return error
    if _user_service.get_by_id(uid) is None:
        return jsonify({"error": "User profile not found"}), 404
    if _user_service.get_by_id(requester_id) is None:
        return jsonify({"error": "Requester not found"}), 404
    try:
        _user_service.accept_follow_request(uid, requester_id)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    actor = _user_service.get_by_id(uid) or {}
    actor_name = actor.get("username", "Someone")
    _notification_service.create(
        recipient_id=requester_id,
        actor_id=uid,
        notification_type="follow_accepted",
        message=f"{actor_name} accepted your follow request",
    )

    return jsonify({"success": True}), 200


@auth_bp.route("/follow/requests/<requester_id>", methods=["DELETE"])
def decline_follow_request(requester_id: str):
    uid, error = _get_uid_from_token()
    if error:
        return error
    if _user_service.get_by_id(uid) is None:
        return jsonify({"error": "User profile not found"}), 404
    if _user_service.get_by_id(requester_id) is None:
        return jsonify({"error": "Requester not found"}), 404
    try:
        _user_service.decline_follow_request(uid, requester_id)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    return jsonify({"success": True}), 200


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

    allowed = {"username", "bio", "avatar", "preferences", "isPrivate"}
    update_data = {k: v for k, v in body.items() if k in allowed}

    if not update_data:
        return jsonify({"error": "No valid fields to update"}), 400

    _user_service.update(uid, update_data)

    updated_user = _user_service.get_by_id(uid)
    return jsonify({"user": updated_user}), 200
