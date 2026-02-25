"""Tests for fragrance similarity routes."""

from unittest.mock import patch


def _make_frag(
    frag_id: str,
    notes_top=None,
    notes_middle=None,
    notes_base=None,
    brand_id: str = "b1",
    gender: str = "Unisex",
    concentration: str = "EDP",
):
    return {
        "id": frag_id,
        "name": f"Frag {frag_id}",
        "brand": {"id": brand_id, "name": "Brand", "country": "X"},
        "gender": gender,
        "concentration": concentration,
        "notes": {
            "top": notes_top or [],
            "middle": notes_middle or [],
            "base": notes_base or [],
        },
        "ratings": {
            "overall": 0,
            "longevity": 0,
            "sillage": 0,
            "value": 0,
            "reviewCount": 0,
        },
    }


@patch("routes.fragrances.get_cache")
def test_get_similar_fragrances_route_orders_and_filters(mock_get_cache, client):
    """GET /api/fragrances/<id>/similar returns sorted similar fragrances."""
    # Minimal import to ensure blueprint is registered
    from routes import fragrances as _  # noqa: F401

    target = _make_frag(
        "f1",
        notes_top=[{"id": "n1"}, {"id": "n2"}],
    )
    similar_high = _make_frag(
        "f2",
        notes_top=[{"id": "n1"}],
    )
    similar_low = _make_frag(
        "f3",
        notes_top=[{"id": "n2"}],
        brand_id="other-brand",
    )
    unrelated = _make_frag(
        "f4",
        notes_top=[{"id": "n99"}],
    )

    mock_get_cache.return_value.fragrances = [
        target,
        similar_low,
        similar_high,
        unrelated,
    ]

    resp = client.get("/api/fragrances/f1/similar")
    assert resp.status_code == 200
    data = resp.get_json()

    returned_ids = [f["id"] for f in data["fragrances"]]
    # Most similar first (brand match wins tie on overlapping notes)
    assert returned_ids[0] == "f2"

