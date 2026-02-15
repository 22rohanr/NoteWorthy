"""
Discovery routes – brands and notes for the catalogue / explorer pages.

Blueprint: ``discovery_bp``, registered at ``/api/discovery``

Endpoints:
    GET /brands  – all brands with fragrance counts
    GET /notes   – all notes with family list (optionally filtered)
"""

from flask import Blueprint, jsonify, request

from cache import get_cache

discovery_bp = Blueprint("discovery", __name__)

# Ordered family list matching frontend's `noteFamilies` constant
NOTE_FAMILIES = ["Citrus", "Floral", "Woody", "Oriental", "Fresh", "Gourmand", "Spicy"]


# ── GET /brands ──────────────────────────────────────────────────────
@discovery_bp.route("/brands", methods=["GET"])
def list_brands():
    """Return all brands, each with a ``fragranceCount``.

    The Brands page calls ``fragranceCount(brand.id)`` to show how many
    fragrances each house has listed. We compute that server-side so
    the frontend doesn't need a second request.
    """
    cache = get_cache()
    brands = cache.brands
    all_fragrances = cache.fragrances

    # Build a quick count map: brand_id → number of fragrances
    count_map: dict[str, int] = {}
    for frag in all_fragrances:
        bid = frag.get("brand", {}).get("id", "")
        if bid:
            count_map[bid] = count_map.get(bid, 0) + 1

    # Attach the count to each brand dict
    result = []
    for brand in brands:
        result.append({
            **brand,
            "fragranceCount": count_map.get(brand.get("id", ""), 0),
        })

    return jsonify({"brands": result}), 200


# ── GET /notes ───────────────────────────────────────────────────────
@discovery_bp.route("/notes", methods=["GET"])
def list_notes():
    """Return all notes and the ordered family list.

    Query parameters:
        family – optional; filter to a single olfactory family
                 (e.g. ``?family=Woody``)

    Response::

        {
            "notes":    [ { "id": "n1", "name": "Bergamot", "family": "Citrus" }, ... ],
            "families": [ "Citrus", "Floral", "Woody", ... ]
        }
    """
    cache = get_cache()
    family_filter = request.args.get("family", "").strip()

    if family_filter:
        notes = [n for n in cache.notes if n.get("family") == family_filter]
    else:
        notes = cache.notes

    return jsonify({
        "notes": notes,
        "families": NOTE_FAMILIES,
    }), 200
