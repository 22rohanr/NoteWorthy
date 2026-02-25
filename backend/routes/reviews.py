"""
Review / community routes – aggregated feed, creation, upvoting.

Blueprint: ``reviews_bp``, registered at ``/api/reviews``

Endpoints:
    GET   /              – aggregated review feed (enriched with fragrance info)
    POST  /              – create a new review (authenticated)
    POST  /<id>/upvote   – atomically upvote a review
"""

from __future__ import annotations

from flask import Blueprint, jsonify, request
from firebase_admin import auth as firebase_auth

from services.review_service import ReviewService
from services.fragrance_service import FragranceService
from services.user_service import UserService

reviews_bp = Blueprint("reviews", __name__)

_review_service = ReviewService()
_fragrance_service = FragranceService()
_user_service = UserService()


# ── helpers ──────────────────────────────────────────────────────────

def _get_uid_from_token() -> tuple[str | None, tuple | None]:
    """Extract and verify the Firebase UID from the Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None, (jsonify({"error": "Authorization header required"}), 401)

    id_token = auth_header.split("Bearer ", 1)[1]
    try:
        decoded = firebase_auth.verify_id_token(id_token)
    except Exception:
        return None, (jsonify({"error": "Invalid or expired token"}), 401)

    return decoded.get("uid", ""), None


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

    # Sort by upvotes descending (most popular first)
    enriched.sort(key=lambda r: r.get("upvotes", 0), reverse=True)

    return jsonify({"reviews": enriched}), 200


# ── POST / ───────────────────────────────────────────────────────────
@reviews_bp.route("/", methods=["POST"])
def create_review():
    """Create a new review (authenticated).

    Requires a valid Firebase ID token in the Authorization header.
    The ``userId`` and ``userName`` are extracted from the token /
    user profile — the request body only needs::

        {
            "fragranceId": "f1",
            "rating": { "overall": 9, "longevity": 10, "sillage": 9, "value": 7 },
            "content":     "A masterpiece ...",
            "wearContext": { "sprays": 4, "weather": "Cool/Fall", "occasion": "Evening Out" }
        }
    """
    uid, error = _get_uid_from_token()
    if error:
        return error

    # Look up user profile for the username
    user = _user_service.get_by_id(uid)
    if user is None:
        return jsonify({"error": "User profile not found"}), 404

    body = request.get_json(silent=True) or {}

    # Validate required fields
    required = ("fragranceId", "rating", "content")
    missing = [f for f in required if not body.get(f)]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    # Validate rating sub-object
    rating = body.get("rating", {})
    if not isinstance(rating, dict) or "overall" not in rating:
        return jsonify({"error": "rating must include at least 'overall'"}), 400

    # Build review data with authenticated user info
    review_data = {
        **body,
        "userId": uid,
        "userName": user.get("username", ""),
        "userAvatar": user.get("avatar"),
    }

    new_id = _review_service.create(review_data)
    return jsonify({"id": new_id}), 201


# ── GET /mine ────────────────────────────────────────────────────────
@reviews_bp.route("/mine", methods=["GET"])
def my_reviews():
    """Return all reviews written by the authenticated user."""
    uid, error = _get_uid_from_token()
    if error:
        return error

    reviews = _review_service.get_by_user(uid)

    # Enrich with fragrance summaries
    frag_ids = {r.get("fragranceId", "") for r in reviews if r.get("fragranceId")}
    frag_map: dict[str, dict] = {}
    for fid in frag_ids:
        frag = _fragrance_service.get_by_id(fid)
        if frag:
            frag_map[fid] = frag

    enriched: list[dict] = []
    for review in reviews:
        frag = frag_map.get(review.get("fragranceId", ""))
        fragrance_summary = None
        if frag:
            fragrance_summary = {
                "id": frag.get("id", ""),
                "name": frag.get("name", ""),
                "brand": {"name": frag.get("brand", {}).get("name", "")},
            }
        enriched.append({**review, "fragrance": fragrance_summary})

    enriched.sort(key=lambda r: r.get("createdAt", ""), reverse=True)
    return jsonify({"reviews": enriched}), 200


# ── DELETE /<id> ─────────────────────────────────────────────────────
@reviews_bp.route("/<review_id>", methods=["DELETE"])
def delete_review(review_id: str):
    """Delete a review (only the author can delete)."""
    uid, error = _get_uid_from_token()
    if error:
        return error

    review = _review_service.get_by_id(review_id)
    if review is None:
        return jsonify({"error": "Review not found"}), 404

    if review.get("userId") != uid:
        return jsonify({"error": "You can only delete your own reviews"}), 403

    _review_service.delete(review_id)
    return jsonify({"success": True}), 200


# ── POST /<id>/upvote ────────────────────────────────────────────────
@reviews_bp.route("/<review_id>/upvote", methods=["POST"])
def upvote_review(review_id: str):
    """Atomically increment the upvote count of a review."""
    review = _review_service.get_by_id(review_id)
    if review is None:
        return jsonify({"error": "Review not found"}), 404

    _review_service.upvote(review_id)
    return jsonify({"success": True}), 200

