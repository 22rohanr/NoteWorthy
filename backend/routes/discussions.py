"""
Discussion routes -- threads and replies.

Blueprint: ``discussions_bp``, registered at ``/api/discussions``

Endpoints:
    GET   /              -- list all discussions (optional ?category= filter)
    POST  /              -- create a new discussion (authenticated)
    GET   /<id>          -- single discussion with replies
    POST  /<id>/replies  -- add a reply (authenticated)
    DELETE /<id>         -- delete a discussion (author only)
"""

from __future__ import annotations

from flask import Blueprint, jsonify, request
from firebase_admin import auth as firebase_auth

from services.discussion_service import DiscussionService
from services.user_service import UserService

discussions_bp = Blueprint("discussions", __name__)

_discussion_service = DiscussionService()
_user_service = UserService()

VALID_CATEGORIES = {"Recommendation", "Comparison", "General", "News"}


def _get_uid_from_token() -> tuple[str | None, tuple | None]:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None, (jsonify({"error": "Authorization header required"}), 401)

    id_token = auth_header.split("Bearer ", 1)[1]
    try:
        decoded = firebase_auth.verify_id_token(id_token)
    except Exception:
        return None, (jsonify({"error": "Invalid or expired token"}), 401)

    return decoded.get("uid", ""), None


# ── GET / ────────────────────────────────────────────────────────────
@discussions_bp.route("/", methods=["GET"])
def list_discussions():
    """Return all discussions, optionally filtered by category."""
    all_discussions = _discussion_service.get_all()

    category = request.args.get("category", "").strip()
    if category and category in VALID_CATEGORIES:
        all_discussions = [d for d in all_discussions if d["category"] == category]

    return jsonify({"discussions": all_discussions}), 200


# ── POST / ───────────────────────────────────────────────────────────
@discussions_bp.route("/", methods=["POST"])
def create_discussion():
    """Create a new discussion thread (authenticated).

    Expects JSON::

        {
            "title":    "Looking for a summer scent",
            "body":     "I need something light and fresh ...",
            "category": "Recommendation"
        }
    """
    uid, error = _get_uid_from_token()
    if error:
        return error

    user = _user_service.get_by_id(uid)
    if user is None:
        return jsonify({"error": "User profile not found"}), 404

    body = request.get_json(silent=True) or {}

    title = (body.get("title") or "").strip()
    if not title:
        return jsonify({"error": "title is required"}), 400

    category = body.get("category", "General")
    if category not in VALID_CATEGORIES:
        return jsonify({"error": f"category must be one of: {', '.join(sorted(VALID_CATEGORIES))}"}), 400

    discussion = _discussion_service.create({
        "title": title,
        "body": (body.get("body") or "").strip(),
        "category": category,
        "authorId": uid,
        "authorName": user.get("username", ""),
        "authorAvatar": user.get("avatar"),
    })

    return jsonify({"discussion": discussion}), 201


# ── GET /<id> ────────────────────────────────────────────────────────
@discussions_bp.route("/<discussion_id>", methods=["GET"])
def get_discussion(discussion_id: str):
    """Return a single discussion with all its replies."""
    discussion = _discussion_service.get_by_id(discussion_id)
    if discussion is None:
        return jsonify({"error": "Discussion not found"}), 404

    replies = _discussion_service.get_replies(discussion_id)
    return jsonify({"discussion": discussion, "replies": replies}), 200


# ── POST /<id>/replies ───────────────────────────────────────────────
@discussions_bp.route("/<discussion_id>/replies", methods=["POST"])
def add_reply(discussion_id: str):
    """Add a reply to a discussion (authenticated).

    Expects JSON::

        { "body": "Great question! I'd suggest ..." }
    """
    uid, error = _get_uid_from_token()
    if error:
        return error

    user = _user_service.get_by_id(uid)
    if user is None:
        return jsonify({"error": "User profile not found"}), 404

    discussion = _discussion_service.get_by_id(discussion_id)
    if discussion is None:
        return jsonify({"error": "Discussion not found"}), 404

    body = request.get_json(silent=True) or {}
    text = (body.get("body") or "").strip()
    if not text:
        return jsonify({"error": "body is required"}), 400

    reply = _discussion_service.add_reply(discussion_id, {
        "body": text,
        "authorId": uid,
        "authorName": user.get("username", ""),
        "authorAvatar": user.get("avatar"),
    })

    return jsonify({"reply": reply}), 201


# ── DELETE /<id> ─────────────────────────────────────────────────────
@discussions_bp.route("/<discussion_id>", methods=["DELETE"])
def delete_discussion(discussion_id: str):
    """Delete a discussion (author only)."""
    uid, error = _get_uid_from_token()
    if error:
        return error

    discussion = _discussion_service.get_by_id(discussion_id)
    if discussion is None:
        return jsonify({"error": "Discussion not found"}), 404

    if discussion.get("authorId") != uid:
        return jsonify({"error": "You can only delete your own discussions"}), 403

    _discussion_service.delete(discussion_id)
    return jsonify({"success": True}), 200
