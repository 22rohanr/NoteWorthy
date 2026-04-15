"""
Notification routes – CRUD for in-app notifications.

Blueprint: ``notifications_bp``, registered at ``/api/notifications``

Endpoints:
    GET  /              – list notifications for the authenticated user
    GET  /unread-count  – number of unread notifications
    POST /<id>/read     – mark a single notification as read
    POST /read-all      – mark all notifications as read
    DELETE /<id>         – delete a notification
"""

from __future__ import annotations

from flask import Blueprint, jsonify, request
from firebase_admin import auth as firebase_auth

from services.notification_service import NotificationService

notifications_bp = Blueprint("notifications", __name__)

_notification_service = NotificationService()


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


# ── GET / ─────────────────────────────────────────────────────────────
@notifications_bp.route("/", methods=["GET"])
def list_notifications():
    """Return notifications for the authenticated user, newest first."""
    uid, error = _get_uid_from_token()
    if error:
        return error

    limit = request.args.get("limit", 50, type=int)
    notifications = _notification_service.get_for_user(uid, limit=limit)
    return jsonify({"notifications": notifications}), 200


# ── GET /unread-count ─────────────────────────────────────────────────
@notifications_bp.route("/unread-count", methods=["GET"])
def unread_count():
    """Return the count of unread notifications."""
    uid, error = _get_uid_from_token()
    if error:
        return error

    count = _notification_service.count_unread(uid)
    return jsonify({"count": count}), 200


# ── POST /<id>/read ──────────────────────────────────────────────────
@notifications_bp.route("/<notification_id>/read", methods=["POST"])
def mark_read(notification_id: str):
    """Mark a single notification as read."""
    uid, error = _get_uid_from_token()
    if error:
        return error

    _notification_service.mark_read(notification_id)
    return jsonify({"success": True}), 200


# ── POST /read-all ───────────────────────────────────────────────────
@notifications_bp.route("/read-all", methods=["POST"])
def mark_all_read():
    """Mark all notifications as read for the authenticated user."""
    uid, error = _get_uid_from_token()
    if error:
        return error

    count = _notification_service.mark_all_read(uid)
    return jsonify({"success": True, "updated": count}), 200


# ── DELETE /<id> ─────────────────────────────────────────────────────
@notifications_bp.route("/<notification_id>", methods=["DELETE"])
def delete_notification(notification_id: str):
    """Delete a single notification."""
    uid, error = _get_uid_from_token()
    if error:
        return error

    _notification_service.delete(notification_id)
    return jsonify({"success": True}), 200
