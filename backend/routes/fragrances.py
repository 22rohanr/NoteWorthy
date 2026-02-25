"""
Fragrance routes – list, detail, and per-fragrance reviews.

Blueprint: ``fragrances_bp``, registered at ``/api/fragrances``

Endpoints:
    GET  /                 – list all (with filter & sort query params)
    GET  /<id>             – single fragrance detail
    GET  /<id>/reviews     – reviews for a specific fragrance
"""

from flask import Blueprint, jsonify, request

from cache import get_cache
from services.review_service import ReviewService

fragrances_bp = Blueprint("fragrances", __name__)

_review_service = ReviewService()


# ── helpers ──────────────────────────────────────────────────────────
def _apply_filters(fragrances: list[dict], args: dict) -> list[dict]:
    """Filter a list of resolved fragrance dicts using query params."""
    result = fragrances

    # search – case-insensitive substring on name or brand.name
    search = args.get("search", "").strip().lower()
    if search:
        result = [
            f for f in result
            if search in f.get("name", "").lower()
            or search in f.get("brand", {}).get("name", "").lower()
        ]

    # brand – exact match on brand.id
    brand_id = args.get("brand", "").strip()
    if brand_id:
        result = [
            f for f in result
            if f.get("brand", {}).get("id") == brand_id
        ]

    # concentration – exact match
    concentration = args.get("concentration", "").strip()
    if concentration:
        result = [
            f for f in result
            if f.get("concentration", "") == concentration
        ]

    # gender – exact match
    gender = args.get("gender", "").strip()
    if gender:
        result = [
            f for f in result
            if f.get("gender", "") == gender
        ]

    # notes – comma-separated note IDs; include if ANY match
    notes_param = args.get("notes", "").strip()
    if notes_param:
        note_ids = {nid.strip() for nid in notes_param.split(",") if nid.strip()}
        if note_ids:
            def _has_note(frag: dict) -> bool:
                notes_obj = frag.get("notes", {})
                all_notes = (
                    notes_obj.get("top", [])
                    + notes_obj.get("middle", [])
                    + notes_obj.get("base", [])
                )
                return any(n.get("id") in note_ids for n in all_notes)

            result = [f for f in result if _has_note(f)]

    return result


def _apply_sort(fragrances: list[dict], sort_key: str) -> list[dict]:
    """Sort a list of resolved fragrance dicts."""
    if sort_key == "reviews":
        return sorted(
            fragrances,
            key=lambda f: f.get("ratings", {}).get("reviewCount", 0),
            reverse=True,
        )
    if sort_key == "price-low":
        return sorted(
            fragrances,
            key=lambda f: (f.get("price") or {}).get("amount", 0),
        )
    if sort_key == "price-high":
        return sorted(
            fragrances,
            key=lambda f: (f.get("price") or {}).get("amount", 0),
            reverse=True,
        )
    if sort_key == "newest":
        return sorted(
            fragrances,
            key=lambda f: f.get("releaseYear", 0),
            reverse=True,
        )
    # default: sort by rating descending
    return sorted(
        fragrances,
        key=lambda f: f.get("ratings", {}).get("overall", 0),
        reverse=True,
    )


def _note_ids_for(frag: dict) -> set[str]:
    """Return a set of all note IDs used in a fragrance."""
    notes_obj = frag.get("notes", {})
    all_notes = (
        notes_obj.get("top", [])
        + notes_obj.get("middle", [])
        + notes_obj.get("base", [])
    )
    return {n.get("id") for n in all_notes if n.get("id")}


def _similarity_score(target: dict, other: dict) -> float:
    """Compute a simple similarity score between two fragrances.

    Heavily weights overlapping notes, with small bonuses for matching
    brand, gender, and concentration.
    """
    if target.get("id") == other.get("id"):
        return 0.0

    target_notes = _note_ids_for(target)
    other_notes = _note_ids_for(other)

    if not target_notes or not other_notes:
        note_score = 0.0
    else:
        intersection = target_notes & other_notes
        union = target_notes | other_notes
        note_score = len(intersection) / len(union) if union else 0.0

    brand_score = 0.15 if target.get("brand", {}).get("id") == other.get("brand", {}).get("id") else 0.0
    gender_score = 0.1 if target.get("gender") == other.get("gender") else 0.0
    concentration_score = 0.05 if target.get("concentration") == other.get("concentration") else 0.0

    # Overall score: notes dominate, metadata provides gentle nudges
    return 2 * note_score + brand_score + gender_score + concentration_score


# ── GET / ────────────────────────────────────────────────────────────
@fragrances_bp.route("/", methods=["GET"])
def list_fragrances():
    """Return all fragrances, optionally filtered and sorted.

    Query parameters:
        search        – substring match on name / brand name
        brand         – exact brand ID
        concentration – exact concentration string
        gender        – exact gender string
        notes         – comma-separated note IDs (OR match)
        sort          – rating | reviews | price-low | price-high | newest
    """
    cache = get_cache()
    all_fragrances = cache.fragrances

    filtered = _apply_filters(all_fragrances, request.args)

    sort_key = request.args.get("sort", "rating").strip()
    sorted_list = _apply_sort(filtered, sort_key)

    return jsonify({"fragrances": sorted_list}), 200


# ── GET /<id> ────────────────────────────────────────────────────────
@fragrances_bp.route("/<fragrance_id>", methods=["GET"])
def get_fragrance(fragrance_id: str):
    """Return a single fragrance with resolved brand and notes."""
    cache = get_cache()
    fragrance = next(
        (f for f in cache.fragrances if f["id"] == fragrance_id),
        None,
    )
    if fragrance is None:
        return jsonify({"error": "Fragrance not found"}), 404

    return jsonify({"fragrance": fragrance}), 200


# ── GET /<id>/reviews ────────────────────────────────────────────────
@fragrances_bp.route("/<fragrance_id>/reviews", methods=["GET"])
def get_fragrance_reviews(fragrance_id: str):
    """Return all reviews for a given fragrance."""
    cache = get_cache()
    fragrance = next(
        (f for f in cache.fragrances if f["id"] == fragrance_id),
        None,
    )
    if fragrance is None:
        return jsonify({"error": "Fragrance not found"}), 404

    reviews = _review_service.get_by_fragrance(fragrance_id)
    return jsonify({"reviews": reviews}), 200


# ── GET /<id>/similar ────────────────────────────────────────────────
@fragrances_bp.route("/<fragrance_id>/similar", methods=["GET"])
def get_similar_fragrances(fragrance_id: str):
    """Return a list of fragrances similar to the given fragrance.

    Similarity is based primarily on overlapping notes, with small
    bonuses for matching brand, gender, and concentration.
    """
    cache = get_cache()
    all_fragrances = cache.fragrances

    target = next((f for f in all_fragrances if f["id"] == fragrance_id), None)
    if target is None:
        return jsonify({"error": "Fragrance not found"}), 404

    scored = [
        (other, _similarity_score(target, other))
        for other in all_fragrances
        if other["id"] != fragrance_id
    ]

    # Filter out completely unrelated entries and sort by score
    scored = [(f, s) for (f, s) in scored if s > 0.0]
    scored.sort(key=lambda pair: pair[1], reverse=True)

    # Limit to top N to keep the UI focused
    top_n = int(request.args.get("limit", 6))
    similar = [f for (f, _) in scored[: max(top_n, 0)]]

    return jsonify({"fragrances": similar}), 200
