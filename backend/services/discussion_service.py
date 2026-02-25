"""
DiscussionService -- Firestore CRUD for the ``discussions`` collection.

Document shape:
    {
        "title":       str,
        "body":        str,
        "category":    str,           # Recommendation | Comparison | General | News
        "authorId":    str,
        "authorName":  str,
        "authorAvatar": str | None,
        "commentCount": int,
        "createdAt":   str,           # ISO-8601
    }

Replies are stored as sub-documents under
``discussions/{id}/replies/{replyId}``:
    {
        "body":        str,
        "authorId":    str,
        "authorName":  str,
        "authorAvatar": str | None,
        "createdAt":   str,
    }
"""

from __future__ import annotations

from datetime import datetime, timezone

from google.cloud.firestore_v1 import Increment

from database import get_db


class DiscussionService:
    COLLECTION = "discussions"

    def __init__(self):
        self._db = get_db()

    # ── helpers ───────────────────────────────────────────────────────

    def _doc_to_dict(self, doc) -> dict:
        data = doc.to_dict()
        return {
            "id": doc.id,
            "title": data.get("title", ""),
            "body": data.get("body", ""),
            "category": data.get("category", "General"),
            "authorId": data.get("authorId", ""),
            "authorName": data.get("authorName", ""),
            "authorAvatar": data.get("authorAvatar"),
            "commentCount": data.get("commentCount", 0),
            "createdAt": data.get("createdAt", ""),
        }

    def _reply_to_dict(self, doc) -> dict:
        data = doc.to_dict()
        return {
            "id": doc.id,
            "body": data.get("body", ""),
            "authorId": data.get("authorId", ""),
            "authorName": data.get("authorName", ""),
            "authorAvatar": data.get("authorAvatar"),
            "createdAt": data.get("createdAt", ""),
        }

    # ── Read ──────────────────────────────────────────────────────────

    def get_all(self) -> list[dict]:
        docs = (
            self._db.collection(self.COLLECTION)
            .order_by("createdAt", direction="DESCENDING")
            .stream()
        )
        return [self._doc_to_dict(doc) for doc in docs]

    def get_by_id(self, discussion_id: str) -> dict | None:
        doc = self._db.collection(self.COLLECTION).document(discussion_id).get()
        if doc.exists:
            return self._doc_to_dict(doc)
        return None

    def get_replies(self, discussion_id: str) -> list[dict]:
        docs = (
            self._db.collection(self.COLLECTION)
            .document(discussion_id)
            .collection("replies")
            .order_by("createdAt")
            .stream()
        )
        return [self._reply_to_dict(doc) for doc in docs]

    # ── Write ─────────────────────────────────────────────────────────

    def create(self, data: dict) -> dict:
        doc_data = {
            "title": data["title"],
            "body": data.get("body", ""),
            "category": data.get("category", "General"),
            "authorId": data["authorId"],
            "authorName": data["authorName"],
            "authorAvatar": data.get("authorAvatar"),
            "commentCount": 0,
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }
        _, doc_ref = self._db.collection(self.COLLECTION).add(doc_data)
        return {"id": doc_ref.id, **doc_data}

    def add_reply(self, discussion_id: str, data: dict) -> dict:
        reply_data = {
            "body": data["body"],
            "authorId": data["authorId"],
            "authorName": data["authorName"],
            "authorAvatar": data.get("authorAvatar"),
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }
        ref = (
            self._db.collection(self.COLLECTION)
            .document(discussion_id)
            .collection("replies")
        )
        _, doc_ref = ref.add(reply_data)

        # Increment comment count on the parent discussion
        self._db.collection(self.COLLECTION).document(discussion_id).update(
            {"commentCount": Increment(1)}
        )

        return {"id": doc_ref.id, **reply_data}

    def delete(self, discussion_id: str) -> None:
        self._db.collection(self.COLLECTION).document(discussion_id).delete()
