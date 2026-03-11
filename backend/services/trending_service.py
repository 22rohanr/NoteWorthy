"""
TrendingService – zero-read aggregation of trending notes and brands.

Queries only the ``reviews`` collection (for recent reviews), then
cross-references fragrance IDs against the in-memory cache to tally
which notes and brands are appearing most often.  Total additional
Firestore reads: **1** (the reviews query).
"""

from collections import Counter

from database import get_db
from cache import get_cache


class TrendingService:
    """Aggregates trending notes and brands from recent reviews."""

    COLLECTION = "reviews"

    def __init__(self):
        self._db = get_db()

    def get_trending(self, limit: int = 50, top_n: int = 5) -> dict:
        """Return the top trending notes and brands.

        1. Fetch the *limit* most recent reviews (1 Firestore read).
        2. Look up each review's ``fragranceId`` in the in-memory cache.
        3. Tally brand names and note names across top/middle/base.
        4. Return the *top_n* of each.
        """
        docs = (
            self._db.collection(self.COLLECTION)
            .order_by("createdAt", direction="DESCENDING")
            .limit(limit)
            .stream()
        )

        fragrance_ids: list[str] = []
        for doc in docs:
            fid = doc.to_dict().get("fragranceId")
            if fid:
                fragrance_ids.append(fid)

        cache = get_cache()
        frag_map = cache.fragrance_map

        brand_counter: Counter[str] = Counter()
        note_counter: Counter[tuple[str, str | None]] = Counter()

        for fid in fragrance_ids:
            frag = frag_map.get(fid)
            if not frag:
                continue

            brand_name = frag.get("brand", {}).get("name", "")
            if brand_name:
                brand_counter[brand_name] += 1

            notes_obj = frag.get("notes", {})
            for tier in ("top", "middle", "base"):
                for note in notes_obj.get(tier, []):
                    name = note.get("name", "")
                    if name:
                        note_counter[(name, note.get("family"))] += 1

        trending_notes = [
            {"name": name, "family": family, "count": count}
            for (name, family), count in note_counter.most_common(top_n)
        ]

        trending_brands = [
            {"name": name, "count": count}
            for name, count in brand_counter.most_common(top_n)
        ]

        return {"notes": trending_notes, "brands": trending_brands}
