"""
NotificationService – Firestore CRUD for the ``notifications`` collection.

Document shape:
    {
        "recipientId": str,        # user who receives the notification
        "actorId":     str,        # user who triggered the action
        "type":        str,        # "follow", "follow_request", "follow_accepted",
                                   # "review_upvote", "discussion_reply"
        "referenceId": str | None, # related entity ID (review, discussion, etc.)
        "message":     str,        # human-readable summary
        "read":        bool,
        "createdAt":   str,        # ISO-8601 datetime string
    }

The ``id`` field is the Firestore document ID and is injected on read.
"""

from __future__ import annotations

from datetime import datetime, timezone

from database import get_db

NOTIFICATION_TYPES = frozenset([
    "follow",
    "follow_request",
    "follow_accepted",
    "review_upvote",
    "discussion_reply",
])


class NotificationService:
    """Encapsulates all Firestore operations for notifications."""

    COLLECTION = "notifications"

    def __init__(self):
        self._db = get_db()

    # ── helpers ───────────────────────────────────────────────────────
    def _doc_to_dict(self, doc) -> dict:
        """Convert a Firestore DocumentSnapshot to a dict."""
        data = doc.to_dict()
        return {
            "id": doc.id,
            "recipientId": data.get("recipientId", ""),
            "actorId": data.get("actorId", ""),
            "type": data.get("type", ""),
            "referenceId": data.get("referenceId"),
            "message": data.get("message", ""),
            "read": bool(data.get("read", False)),
            "createdAt": data.get("createdAt", ""),
        }

    # ── Read ──────────────────────────────────────────────────────────
    def get_for_user(self, user_id: str, limit: int = 50) -> list[dict]:
        """Return notifications for a user, newest first."""
        docs = (
            self._db.collection(self.COLLECTION)
            .where("recipientId", "==", user_id)
            .order_by("createdAt", direction="DESCENDING")
            .limit(limit)
            .stream()
        )
        return [self._doc_to_dict(doc) for doc in docs]

    def count_unread(self, user_id: str) -> int:
        """Return the number of unread notifications for a user."""
        docs = (
            self._db.collection(self.COLLECTION)
            .where("recipientId", "==", user_id)
            .where("read", "==", False)
            .stream()
        )
        return sum(1 for _ in docs)

    # ── Write ─────────────────────────────────────────────────────────
    def create(
        self,
        *,
        recipient_id: str,
        actor_id: str,
        notification_type: str,
        message: str,
        reference_id: str | None = None,
    ) -> str:
        """Create a new notification and return its document ID."""
        if notification_type not in NOTIFICATION_TYPES:
            raise ValueError(f"Invalid notification type: {notification_type!r}")

        if recipient_id == actor_id:
            return ""

        doc_data = {
            "recipientId": recipient_id,
            "actorId": actor_id,
            "type": notification_type,
            "referenceId": reference_id,
            "message": message,
            "read": False,
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }
        _, doc_ref = self._db.collection(self.COLLECTION).add(doc_data)
        return doc_ref.id

    def mark_read(self, notification_id: str) -> None:
        """Mark a single notification as read."""
        self._db.collection(self.COLLECTION).document(notification_id).update(
            {"read": True}
        )

    def mark_all_read(self, user_id: str) -> int:
        """Mark all unread notifications for a user as read. Returns count updated."""
        docs = (
            self._db.collection(self.COLLECTION)
            .where("recipientId", "==", user_id)
            .where("read", "==", False)
            .stream()
        )
        count = 0
        for doc in docs:
            doc.reference.update({"read": True})
            count += 1
        return count

    def delete(self, notification_id: str) -> None:
        """Delete a single notification."""
        self._db.collection(self.COLLECTION).document(notification_id).delete()
