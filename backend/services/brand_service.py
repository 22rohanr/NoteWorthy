"""
BrandService – Firestore CRUD for the ``brands`` collection.

Document shape (matches frontend ``Brand`` interface):
    {
        "name":        str,
        "country":     str,
        "foundedYear": int | None,
    }

The ``id`` field is the Firestore document ID and is injected on read.
"""

from __future__ import annotations

from database import get_db


class BrandService:
    """Encapsulates all Firestore operations for brands."""

    COLLECTION = "brands"

    def __init__(self):
        self._db = get_db()

    # ── helpers ───────────────────────────────────────────────────────
    def _doc_to_dict(self, doc) -> dict:
        """Convert a Firestore DocumentSnapshot to a frontend-shaped dict."""
        data = doc.to_dict()
        return {
            "id": doc.id,
            "name": data.get("name", ""),
            "country": data.get("country", ""),
            "foundedYear": data.get("foundedYear"),
        }

    # ── Read ─────────────────────────────────────────────────────────
    def get_all(self) -> list[dict]:
        """Return every brand document."""
        docs = self._db.collection(self.COLLECTION).stream()
        return [self._doc_to_dict(doc) for doc in docs]

    def get_by_id(self, brand_id: str) -> dict | None:
        """Return a single brand by document ID, or ``None``."""
        doc = self._db.collection(self.COLLECTION).document(brand_id).get()
        if doc.exists:
            return self._doc_to_dict(doc)
        return None

    # ── Write ────────────────────────────────────────────────────────
    def create(self, data: dict) -> str:
        """Create a new brand document and return its ID.

        Accepts a dict with keys: ``name``, ``country``, ``foundedYear``.
        """
        doc_data = {
            "name": data["name"],
            "country": data["country"],
            "foundedYear": data.get("foundedYear"),
        }
        _, doc_ref = self._db.collection(self.COLLECTION).add(doc_data)
        return doc_ref.id

    def update(self, brand_id: str, data: dict) -> None:
        """Partial-update an existing brand document."""
        allowed = {"name", "country", "foundedYear"}
        update_data = {k: v for k, v in data.items() if k in allowed}
        if update_data:
            self._db.collection(self.COLLECTION).document(brand_id).update(update_data)

    def delete(self, brand_id: str) -> None:
        """Delete a brand document."""
        self._db.collection(self.COLLECTION).document(brand_id).delete()
