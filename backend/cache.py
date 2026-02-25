"""
Simple in-memory TTL cache for Firestore data.

Loads all fragrances, brands, and notes **once** from Firestore and
serves subsequent requests from memory.  The cache refreshes after
``TTL_SECONDS`` (default 10 minutes) or when ``invalidate()`` is
called explicitly (e.g. after a write).

This keeps Firestore reads to an absolute minimum – roughly 3 queries
per cache fill (one each for fragrances, brands, notes) instead of
hundreds per HTTP request.

Usage:
    from cache import get_cache
    c = get_cache()
    c.fragrances   # list[dict] – fully resolved
    c.brands       # list[dict]
    c.notes        # list[dict]
"""

from __future__ import annotations

import time
import threading

from database import get_db


# ── Configuration ────────────────────────────────────────────────────
TTL_SECONDS = 10 * 60  # 10 minutes


class _DataCache:
    """Thread-safe in-memory cache for the read-heavy catalogue data."""

    def __init__(self):
        self._lock = threading.Lock()
        self._db = get_db()

        # Cached data
        self._brands: list[dict] = []
        self._notes: list[dict] = []
        self._fragrances: list[dict] = []

        self._loaded_at: float = 0  # epoch seconds

    # ── Public API ────────────────────────────────────────────────────

    @property
    def brands(self) -> list[dict]:
        self._ensure_loaded()
        return self._brands

    @property
    def notes(self) -> list[dict]:
        self._ensure_loaded()
        return self._notes

    @property
    def fragrances(self) -> list[dict]:
        self._ensure_loaded()
        return self._fragrances

    def invalidate(self):
        """Force the next access to reload from Firestore."""
        with self._lock:
            self._loaded_at = 0

    # ── Internals ─────────────────────────────────────────────────────

    def _ensure_loaded(self):
        """Load from Firestore if the cache is stale or empty."""
        if time.time() - self._loaded_at < TTL_SECONDS:
            return
        with self._lock:
            # Double-check after acquiring the lock
            if time.time() - self._loaded_at < TTL_SECONDS:
                return
            self._load()

    def _load(self):
        """Fetch all brands, notes, and fragrances from Firestore.

        Total Firestore queries: exactly 3 (one per collection).
        """
        # 1. Brands
        brand_docs = self._db.collection("brands").stream()
        self._brands = []
        brand_map: dict[str, dict] = {}
        for doc in brand_docs:
            d = doc.to_dict()
            brand = {
                "id": doc.id,
                "name": d.get("name", ""),
                "country": d.get("country", ""),
                "foundedYear": d.get("foundedYear"),
            }
            self._brands.append(brand)
            brand_map[doc.id] = brand

        # 2. Notes
        note_docs = self._db.collection("notes").stream()
        self._notes = []
        note_map: dict[str, dict] = {}
        for doc in note_docs:
            d = doc.to_dict()
            note = {
                "id": doc.id,
                "name": d.get("name", ""),
                "family": d.get("family"),
            }
            self._notes.append(note)
            note_map[doc.id] = note

        # 3. Fragrances (resolve brand + notes in-memory)
        frag_docs = self._db.collection("fragrances").stream()
        self._fragrances = []
        for doc in frag_docs:
            data = doc.to_dict()

            # Brand resolution
            brand_id = data.get("brandId", "")
            brand = brand_map.get(brand_id, {"id": brand_id, "name": "", "country": ""})

            # Note resolution
            raw_notes = data.get("notes", {})

            def _resolve_notes(ids: list[str]) -> list[dict]:
                return [
                    note_map.get(nid, {"id": nid, "name": "", "family": None})
                    for nid in ids
                ]

            # Ratings
            raw_ratings = data.get("ratings", {})
            ratings = {
                "overall": raw_ratings.get("overall", 0),
                "longevity": raw_ratings.get("longevity", 0),
                "sillage": raw_ratings.get("sillage", 0),
                "value": raw_ratings.get("value", 0),
                "reviewCount": raw_ratings.get("reviewCount", 0),
            }

            # Price (optional)
            raw_price = data.get("price")
            price = None
            if raw_price:
                price = {
                    "amount": raw_price.get("amount", 0),
                    "currency": raw_price.get("currency", "USD"),
                    "size": raw_price.get("size", ""),
                }

            self._fragrances.append({
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
                    "top": _resolve_notes(raw_notes.get("top", [])),
                    "middle": _resolve_notes(raw_notes.get("middle", [])),
                    "base": _resolve_notes(raw_notes.get("base", [])),
                },
                "ratings": ratings,
                "price": price,
            })

        self._loaded_at = time.time()
        print(
            f"[cache] Loaded {len(self._brands)} brands, "
            f"{len(self._notes)} notes, "
            f"{len(self._fragrances)} fragrances from Firestore"
        )


# ── Singleton accessor ───────────────────────────────────────────────
_cache: _DataCache | None = None
_cache_lock = threading.Lock()


def get_cache() -> _DataCache:
    """Return the singleton cache instance."""
    global _cache
    if _cache is None:
        with _cache_lock:
            if _cache is None:
                _cache = _DataCache()
    return _cache
