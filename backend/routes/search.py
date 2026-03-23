"""
Unified search across fragrances, brands, notes, and discussions.

Blueprint: ``search_bp``, registered at ``/api/search``

Endpoints:
    GET /  – search all entity types with ``?q=`` query param
"""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from cache import get_cache
from services.discussion_service import DiscussionService

search_bp = Blueprint("search", __name__)

_discussion_service = DiscussionService()

RESULTS_PER_CATEGORY = 6


@search_bp.route("/", methods=["GET"])
def unified_search():
    """Return matching results across fragrances, brands, notes, and discussions.

    Query parameters:
        q     – search term (required, minimum 1 character)
        limit – max results per category (default 6)
    """
    query = request.args.get("q", "").strip().lower()
    if not query:
        return jsonify({"error": "q parameter is required"}), 400

    limit = int(request.args.get("limit", RESULTS_PER_CATEGORY))
    cache = get_cache()

    # -- Fragrances (name or brand name) --
    matched_fragrances = [
        f for f in cache.fragrances
        if query in f.get("name", "").lower()
        or query in f.get("brand", {}).get("name", "").lower()
        or query in f.get("description", "").lower()
    ]
    matched_fragrances.sort(
        key=lambda f: f.get("ratings", {}).get("overall", 0), reverse=True
    )

    # -- Brands (name or country) --
    matched_brands = [
        b for b in cache.brands
        if query in b.get("name", "").lower()
        or query in b.get("country", "").lower()
    ]

    # -- Notes (name or family) --
    matched_notes = [
        n for n in cache.notes
        if query in n.get("name", "").lower()
        or query in (n.get("family") or "").lower()
    ]

    # -- Discussions (title or body) --
    all_discussions = _discussion_service.get_all()
    matched_discussions = [
        d for d in all_discussions
        if query in d.get("title", "").lower()
        or query in d.get("body", "").lower()
    ]

    return jsonify({
        "query": query,
        "fragrances": matched_fragrances[:limit],
        "fragranceCount": len(matched_fragrances),
        "brands": matched_brands[:limit],
        "brandCount": len(matched_brands),
        "notes": matched_notes[:limit],
        "noteCount": len(matched_notes),
        "discussions": matched_discussions[:limit],
        "discussionCount": len(matched_discussions),
    }), 200
