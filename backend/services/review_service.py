"""
ReviewService – Firestore CRUD for the ``reviews`` collection.

Document shape (matches frontend ``Review`` interface):
    {
        "fragranceId": str,
        "userId":      str,
        "userName":    str,
        "userAvatar":  str | None,
        "rating": {
            "overall":   float,
            "longevity": float,
            "sillage":   float,
            "value":     float,
        },
        "content":     str,
        "wearContext": {                    # optional
            "sprays":    int,
            "weather":   str,
            "occasion":  str,
        } | None,
        "impressions": {                    # optional
            "opening":    str,
            "midDrydown": str,
            "dryDown":    str,
        } | None,
        "upvotes":   int,
        "createdAt": str,                   # ISO-8601 date string
    }

The ``id`` field is the Firestore document ID and is injected on read.
"""

from __future__ import annotations

from datetime import datetime, timezone

from google.cloud.firestore_v1 import Increment

from database import get_db


class ReviewService:
    """Encapsulates all Firestore operations for reviews."""

    COLLECTION = "reviews"

    def __init__(self):
        self._db = get_db()

    # ── helpers ───────────────────────────────────────────────────────
    def _doc_to_dict(self, doc) -> dict:
        """Convert a Firestore DocumentSnapshot to a frontend-shaped dict."""
        data = doc.to_dict()

        # Rating sub-object
        raw_rating = data.get("rating", {})
        rating = {
            "overall": raw_rating.get("overall", 0),
            "longevity": raw_rating.get("longevity", 0),
            "sillage": raw_rating.get("sillage", 0),
            "value": raw_rating.get("value", 0),
        }

        # Optional wearContext
        raw_wc = data.get("wearContext")
        wear_context = None
        if raw_wc:
            wear_context = {
                "sprays": raw_wc.get("sprays", 0),
                "weather": raw_wc.get("weather", ""),
                "occasion": raw_wc.get("occasion", ""),
            }

        # Optional impressions
        raw_imp = data.get("impressions")
        impressions = None
        if raw_imp:
            impressions = {
                "opening": raw_imp.get("opening", ""),
                "midDrydown": raw_imp.get("midDrydown", ""),
                "dryDown": raw_imp.get("dryDown", ""),
            }

        return {
            "id": doc.id,
            "fragranceId": data.get("fragranceId", ""),
            "userId": data.get("userId", ""),
            "userName": data.get("userName", ""),
            "userAvatar": data.get("userAvatar"),
            "rating": rating,
            "content": data.get("content", ""),
            "wearContext": wear_context,
            "impressions": impressions,
            "upvotes": data.get("upvotes", 0),
            "createdAt": data.get("createdAt", ""),
        }

    # ── Read ─────────────────────────────────────────────────────────
    def get_all(self) -> list[dict]:
        """Return every review document."""
        docs = self._db.collection(self.COLLECTION).stream()
        return [self._doc_to_dict(doc) for doc in docs]

    def get_by_id(self, review_id: str) -> dict | None:
        """Return a single review by document ID, or ``None``."""
        doc = self._db.collection(self.COLLECTION).document(review_id).get()
        if doc.exists:
            return self._doc_to_dict(doc)
        return None

    def get_by_fragrance(self, fragrance_id: str) -> list[dict]:
        """Return all reviews for a given fragrance (detail page)."""
        docs = (
            self._db.collection(self.COLLECTION)
            .where("fragranceId", "==", fragrance_id)
            .stream()
        )
        return [self._doc_to_dict(doc) for doc in docs]

    def get_by_user(self, user_id: str) -> list[dict]:
        """Return all reviews written by a given user."""
        docs = (
            self._db.collection(self.COLLECTION)
            .where("userId", "==", user_id)
            .stream()
        )
        return [self._doc_to_dict(doc) for doc in docs]

    # ── Write ────────────────────────────────────────────────────────
    def create(self, data: dict) -> str:
        """Create a new review document and return its ID.

        Required keys: ``fragranceId``, ``userId``, ``userName``,
        ``rating``, ``content``.
        Optional keys: ``userAvatar``, ``wearContext``, ``impressions``.
        ``upvotes`` defaults to ``0``; ``createdAt`` is set automatically
        if not provided.
        """
        rating = data.get("rating", {})
        doc_data: dict = {
            "fragranceId": data["fragranceId"],
            "userId": data["userId"],
            "userName": data["userName"],
            "userAvatar": data.get("userAvatar"),
            "rating": {
                "overall": rating.get("overall", 0),
                "longevity": rating.get("longevity", 0),
                "sillage": rating.get("sillage", 0),
                "value": rating.get("value", 0),
            },
            "content": data.get("content", ""),
            "upvotes": data.get("upvotes", 0),
            "createdAt": data.get(
                "createdAt",
                datetime.now(timezone.utc).date().isoformat(),
            ),
        }

        # Optional nested objects
        if data.get("wearContext"):
            wc = data["wearContext"]
            doc_data["wearContext"] = {
                "sprays": wc.get("sprays", 0),
                "weather": wc.get("weather", ""),
                "occasion": wc.get("occasion", ""),
            }

        if data.get("impressions"):
            imp = data["impressions"]
            doc_data["impressions"] = {
                "opening": imp.get("opening", ""),
                "midDrydown": imp.get("midDrydown", ""),
                "dryDown": imp.get("dryDown", ""),
            }

        _, doc_ref = self._db.collection(self.COLLECTION).add(doc_data)
        return doc_ref.id

    def update(self, review_id: str, data: dict) -> None:
        """Partial-update an existing review document.

        Supports top-level scalars as well as nested ``rating``,
        ``wearContext``, and ``impressions`` sub-objects.
        """
        allowed_top = {
            "fragranceId", "userId", "userName", "userAvatar",
            "content", "upvotes", "createdAt",
        }
        allowed_nested = {"rating", "wearContext", "impressions"}

        update_data: dict = {}
        for key, value in data.items():
            if key in allowed_top:
                update_data[key] = value
            elif key in allowed_nested and isinstance(value, dict):
                for sub_key, sub_val in value.items():
                    update_data[f"{key}.{sub_key}"] = sub_val

        if update_data:
            self._db.collection(self.COLLECTION).document(review_id).update(
                update_data
            )

    def delete(self, review_id: str) -> None:
        """Delete a review document."""
        self._db.collection(self.COLLECTION).document(review_id).delete()

    # ── Special operations ───────────────────────────────────────────
    def upvote(self, review_id: str) -> None:
        """Atomically increment the upvote count by 1."""
        self._db.collection(self.COLLECTION).document(review_id).update(
            {"upvotes": Increment(1)}
        )
