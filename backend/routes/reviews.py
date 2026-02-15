"""
Review / community routes – aggregated feed, creation, upvoting.

Blueprint: ``reviews_bp``, registered at ``/api/reviews``

Endpoints:
    GET   /              – aggregated review feed (enriched with fragrance info)
    POST  /              – create a new review
    POST  /<id>/upvote   – atomically upvote a review
"""

from flask import Blueprint, jsonify, request

from services.review_service import ReviewService
from services.fragrance_service import FragranceService

reviews_bp = Blueprint("reviews", __name__)

_review_service = ReviewService()
_fragrance_service = FragranceService()


# ── GET / ────────────────────────────────────────────────────────────
@reviews_bp.route("/", methods=["GET"])
def list_reviews():
    """Return every review, each enriched with a fragrance summary.

    The Reviews page (Community Wear Reports) needs to show
    "on *Fragrance Name* by *Brand Name*" for each review, so we
    attach a lightweight ``fragrance`` object to each review dict::

        {
            "id": "...",
            "name": "Baccarat Rouge 540",
            "brand": { "name": "Maison Francis Kurkdjian" }
        }
    """
    reviews = _review_service.get_all()

    # Collect unique fragrance IDs referenced by reviews
    frag_ids = {r.get("fragranceId", "") for r in reviews if r.get("fragranceId")}

    # Batch-fetch fragrance summaries (full resolve is fine for small datasets)
    frag_map: dict[str, dict] = {}
    for fid in frag_ids:
        frag = _fragrance_service.get_by_id(fid)
        if frag:
            frag_map[fid] = frag

    # Enrich each review
    enriched: list[dict] = []
    for review in reviews:
        frag = frag_map.get(review.get("fragranceId", ""))
        fragrance_summary = None
        if frag:
            fragrance_summary = {
                "id": frag.get("id", ""),
                "name": frag.get("name", ""),
                "brand": {
                    "name": frag.get("brand", {}).get("name", ""),
                },
            }
        enriched.append({**review, "fragrance": fragrance_summary})

    return jsonify({"reviews": enriched}), 200


# ── POST / ───────────────────────────────────────────────────────────
@reviews_bp.route("/", methods=["POST"])
def create_review():
    """Create a new review.

    Expects JSON matching the ``Review`` interface (minus ``id``,
    ``upvotes``, ``createdAt`` which are set automatically)::

        {
            "fragranceId": "f1",
            "userId":      "u1",
            "userName":    "ScentConnoisseur",
            "userAvatar":  null,
            "rating": { "overall": 9, "longevity": 10, "sillage": 9, "value": 7 },
            "content":     "A masterpiece ...",
            "wearContext": { "sprays": 4, "weather": "Cool/Fall", "occasion": "Evening Out" },
            "impressions": { "opening": "...", "midDrydown": "...", "dryDown": "..." }
        }
    """
    body = request.get_json(silent=True) or {}

    # Validate required fields
    required = ("fragranceId", "userId", "userName", "rating", "content")
    missing = [f for f in required if not body.get(f)]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    # Validate rating sub-object
    rating = body.get("rating", {})
    if not isinstance(rating, dict) or "overall" not in rating:
        return jsonify({"error": "rating must include at least 'overall'"}), 400

    new_id = _review_service.create(body)
    return jsonify({"id": new_id}), 201


# ── POST /<id>/upvote ────────────────────────────────────────────────
@reviews_bp.route("/<review_id>/upvote", methods=["POST"])
def upvote_review(review_id: str):
    """Atomically increment the upvote count of a review."""
    review = _review_service.get_by_id(review_id)
    if review is None:
        return jsonify({"error": "Review not found"}), 404

    _review_service.upvote(review_id)
    return jsonify({"success": True}), 200
