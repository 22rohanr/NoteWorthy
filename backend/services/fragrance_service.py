"""
FragranceService – Firestore CRUD for the ``fragrances`` collection.

Firestore document shape (normalised – stores IDs, not embedded objects):
    {
        "name":          str,
        "brandId":       str,              # FK → brands collection
        "releaseYear":   int,
        "concentration": str,              # EDP | EDT | Parfum | EDC | Cologne
        "gender":        str,              # Unisex | Masculine | Feminine
        "description":   str,
        "perfumer":      str | None,
        "imageUrl":      str,
        "notes": {
            "top":    [str],               # note IDs
            "middle": [str],
            "base":   [str],
        },
        "ratings": {
            "overall":     float,
            "longevity":   float,
            "sillage":     float,
            "value":       float,
            "reviewCount": int,
        },
        "price": {                         # optional
            "amount":   float,
            "currency": str,
            "size":     str,
        } | None,
    }

On **read**, ``brandId`` is resolved to a full ``Brand`` dict and note-ID
arrays are resolved to full ``Note`` dicts so the returned dict matches the
frontend ``Fragrance`` TypeScript interface exactly.

On **write**, the service accepts the frontend-shaped payload (with nested
``brand`` object and ``Note`` arrays) and extracts/stores only the IDs.
"""

from __future__ import annotations

from database import get_db
from services.brand_service import BrandService
from services.note_service import NoteService


class FragranceService:
    """Encapsulates all Firestore operations for fragrances."""

    COLLECTION = "fragrances"

    def __init__(self):
        self._db = get_db()
        self._brand_service = BrandService()
        self._note_service = NoteService()

    # ── private helpers ──────────────────────────────────────────────
    def _resolve(self, doc) -> dict:
        """Convert a Firestore document to the fully-nested frontend dict.

        Resolves ``brandId`` → full Brand and note-ID arrays → full Note
        objects.
        """
        data = doc.to_dict()

        # --- Brand resolution -----------------------------------------
        brand_id = data.get("brandId", "")
        brand = self._brand_service.get_by_id(brand_id) if brand_id else None
        if brand is None:
            brand = {"id": brand_id, "name": "", "country": ""}

        # --- Note resolution ------------------------------------------
        raw_notes = data.get("notes", {})
        top_ids = raw_notes.get("top", [])
        middle_ids = raw_notes.get("middle", [])
        base_ids = raw_notes.get("base", [])

        all_ids = list(set(top_ids + middle_ids + base_ids))
        note_map = self._note_service.get_many(all_ids)

        def _resolve_notes(ids: list[str]) -> list[dict]:
            resolved = []
            for nid in ids:
                note = note_map.get(nid)
                if note is not None:
                    resolved.append(note)
                else:
                    resolved.append({"id": nid, "name": "", "family": None})
            return resolved

        # --- Ratings --------------------------------------------------
        raw_ratings = data.get("ratings", {})
        ratings = {
            "overall": raw_ratings.get("overall", 0),
            "longevity": raw_ratings.get("longevity", 0),
            "sillage": raw_ratings.get("sillage", 0),
            "value": raw_ratings.get("value", 0),
            "reviewCount": raw_ratings.get("reviewCount", 0),
        }

        # --- Price (optional) -----------------------------------------
        raw_price = data.get("price")
        price = None
        if raw_price:
            price = {
                "amount": raw_price.get("amount", 0),
                "currency": raw_price.get("currency", "USD"),
                "size": raw_price.get("size", ""),
            }

        return {
            "id": doc.id,
            "name": data.get("name", ""),
            "brand": brand,
            "releaseYear": data.get("releaseYear", 0),
            "concentration": data.get("concentration", ""),
            "gender": data.get("gender", ""),
            "description": data.get("description", ""),
            "perfumer": data.get("perfumer"),
            "imageUrl": data.get("imageUrl", ""),
            "notes": {
                "top": _resolve_notes(top_ids),
                "middle": _resolve_notes(middle_ids),
                "base": _resolve_notes(base_ids),
            },
            "ratings": ratings,
            "price": price,
        }

    @staticmethod
    def _normalize_for_write(data: dict) -> dict:
        """Extract a Firestore-friendly document from the frontend shape.

        Accepts a dict that may contain a nested ``brand`` object and
        full ``Note`` arrays.  Converts them to ``brandId`` and note-ID
        arrays respectively.
        """
        doc: dict = {}

        # Scalar fields
        for key in (
            "name", "releaseYear", "concentration", "gender",
            "description", "perfumer", "imageUrl",
        ):
            if key in data:
                doc[key] = data[key]

        # Brand → brandId
        if "brand" in data:
            brand = data["brand"]
            doc["brandId"] = brand["id"] if isinstance(brand, dict) else brand
        elif "brandId" in data:
            doc["brandId"] = data["brandId"]

        # Notes → note-ID arrays
        if "notes" in data:
            raw = data["notes"]
            doc["notes"] = {}
            for layer in ("top", "middle", "base"):
                items = raw.get(layer, [])
                if items and isinstance(items[0], dict):
                    doc["notes"][layer] = [n["id"] for n in items]
                else:
                    doc["notes"][layer] = list(items)

        # Ratings (store as-is; nested map)
        if "ratings" in data:
            doc["ratings"] = {
                "overall": data["ratings"].get("overall", 0),
                "longevity": data["ratings"].get("longevity", 0),
                "sillage": data["ratings"].get("sillage", 0),
                "value": data["ratings"].get("value", 0),
                "reviewCount": data["ratings"].get("reviewCount", 0),
            }

        # Price (optional)
        if "price" in data and data["price"] is not None:
            doc["price"] = {
                "amount": data["price"]["amount"],
                "currency": data["price"].get("currency", "USD"),
                "size": data["price"].get("size", ""),
            }

        return doc

    def _resolve_with_cache(self, doc, brand_map: dict, note_map: dict) -> dict:
        """Resolve a fragrance doc using pre-fetched brand/note maps.

        Same logic as ``_resolve`` but avoids per-document Firestore calls.
        """
        data = doc.to_dict()

        # --- Brand resolution -----------------------------------------
        brand_id = data.get("brandId", "")
        brand = brand_map.get(brand_id)
        if brand is None:
            brand = {"id": brand_id, "name": "", "country": ""}

        # --- Note resolution ------------------------------------------
        raw_notes = data.get("notes", {})
        top_ids = raw_notes.get("top", [])
        middle_ids = raw_notes.get("middle", [])
        base_ids = raw_notes.get("base", [])

        def _resolve_notes(ids: list[str]) -> list[dict]:
            resolved = []
            for nid in ids:
                note = note_map.get(nid)
                if note is not None:
                    resolved.append(note)
                else:
                    resolved.append({"id": nid, "name": "", "family": None})
            return resolved

        # --- Ratings --------------------------------------------------
        raw_ratings = data.get("ratings", {})
        ratings = {
            "overall": raw_ratings.get("overall", 0),
            "longevity": raw_ratings.get("longevity", 0),
            "sillage": raw_ratings.get("sillage", 0),
            "value": raw_ratings.get("value", 0),
            "reviewCount": raw_ratings.get("reviewCount", 0),
        }

        # --- Price (optional) -----------------------------------------
        raw_price = data.get("price")
        price = None
        if raw_price:
            price = {
                "amount": raw_price.get("amount", 0),
                "currency": raw_price.get("currency", "USD"),
                "size": raw_price.get("size", ""),
            }

        return {
            "id": doc.id,
            "name": data.get("name", ""),
            "brand": brand,
            "releaseYear": data.get("releaseYear", 0),
            "concentration": data.get("concentration", ""),
            "gender": data.get("gender", ""),
            "description": data.get("description", ""),
            "perfumer": data.get("perfumer"),
            "imageUrl": data.get("imageUrl", ""),
            "notes": {
                "top": _resolve_notes(top_ids),
                "middle": _resolve_notes(middle_ids),
                "base": _resolve_notes(base_ids),
            },
            "ratings": ratings,
            "price": price,
        }

    # ── Read ─────────────────────────────────────────────────────────
    def get_all(self) -> list[dict]:
        """Return every fragrance with resolved brand and notes.

        Uses batch pre-fetching (3 Firestore queries total) instead of
        per-document resolution to avoid the N+1 query problem.
        """
        # 1. Fetch all fragrance docs
        docs = list(self._db.collection(self.COLLECTION).stream())

        # 2. Pre-fetch all brands and notes in bulk (2 queries)
        all_brands = self._brand_service.get_all()
        brand_map = {b["id"]: b for b in all_brands}

        all_notes = self._note_service.get_all()
        note_map = {n["id"]: n for n in all_notes}

        # 3. Resolve in-memory
        return [self._resolve_with_cache(doc, brand_map, note_map) for doc in docs]

    def get_by_id(self, fragrance_id: str) -> dict | None:
        """Return a single fragrance with resolved brand and notes."""
        doc = (
            self._db.collection(self.COLLECTION)
            .document(fragrance_id)
            .get()
        )
        if doc.exists:
            return self._resolve(doc)
        return None

    def get_by_brand(self, brand_id: str) -> list[dict]:
        """Return all fragrances belonging to a given brand."""
        docs = (
            self._db.collection(self.COLLECTION)
            .where("brandId", "==", brand_id)
            .stream()
        )
        return [self._resolve(doc) for doc in docs]

    # ── Write ────────────────────────────────────────────────────────
    def create(self, data: dict) -> str:
        """Create a new fragrance and return its Firestore document ID.

        ``data`` may use the frontend shape (nested brand/note objects)
        or the normalised shape (brandId + note-ID arrays).
        """
        doc_data = self._normalize_for_write(data)
        _, doc_ref = self._db.collection(self.COLLECTION).add(doc_data)
        return doc_ref.id

    def update(self, fragrance_id: str, data: dict) -> None:
        """Partial-update an existing fragrance document.

        ``data`` may use the frontend shape; it will be normalised before
        writing.
        """
        doc_data = self._normalize_for_write(data)
        if doc_data:
            self._db.collection(self.COLLECTION).document(fragrance_id).update(
                doc_data
            )

    def delete(self, fragrance_id: str) -> None:
        """Delete a fragrance document."""
        self._db.collection(self.COLLECTION).document(fragrance_id).delete()
