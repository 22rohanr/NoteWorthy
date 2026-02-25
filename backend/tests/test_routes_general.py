"""
General route behavior tests.

Covers query parameters, filtering, sorting, 404s, and response shapes
across fragrances, discovery, and discussions. Uses mocked cache/services.
"""

from unittest.mock import patch


def _minimal_fragrance(frag_id: str, name: str = None, brand_id: str = "b1"):
    return {
        "id": frag_id,
        "name": name or f"Frag {frag_id}",
        "brand": {"id": brand_id, "name": "Brand", "country": "X"},
        "releaseYear": 2020,
        "concentration": "EDP",
        "gender": "Unisex",
        "description": "",
        "imageUrl": "",
        "notes": {"top": [], "middle": [], "base": []},
        "ratings": {"overall": 8, "longevity": 7, "sillage": 7, "value": 7, "reviewCount": 0},
        "price": None,
    }


# ── Fragrances: query params and sort ───────────────────────────────────

@patch("routes.fragrances.get_cache")
def test_fragrances_list_accepts_sort_param(mock_get_cache, client):
    """GET /api/fragrances?sort=rating returns 200."""
    mock_get_cache.return_value.fragrances = [
        _minimal_fragrance("f1"),
        _minimal_fragrance("f2"),
    ]

    resp = client.get("/api/fragrances?sort=rating")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "fragrances" in data
    assert len(data["fragrances"]) == 2


@patch("routes.fragrances.get_cache")
def test_fragrances_list_accepts_search_param(mock_get_cache, client):
    """GET /api/fragrances?search=... filters by name/brand."""
    mock_get_cache.return_value.fragrances = [
        _minimal_fragrance("f1", "Aventus"),
        _minimal_fragrance("f2", "Another"),
    ]

    resp = client.get("/api/fragrances?search=Aventus")
    assert resp.status_code == 200
    data = resp.get_json()
    assert len(data["fragrances"]) == 1
    assert data["fragrances"][0]["name"] == "Aventus"


@patch("routes.fragrances.get_cache")
def test_fragrance_reviews_returns_200_when_fragrance_exists(mock_get_cache, client):
    """GET /api/fragrances/<id>/reviews returns 200 when fragrance exists."""
    mock_get_cache.return_value.fragrances = [_minimal_fragrance("f1")]

    with patch("routes.fragrances._review_service") as mock_review:
        mock_review.get_by_fragrance.return_value = []

        resp = client.get("/api/fragrances/f1/reviews")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "reviews" in data
        assert data["reviews"] == []


@patch("routes.fragrances.get_cache")
def test_fragrance_reviews_returns_404_when_fragrance_missing(mock_get_cache, client):
    """GET /api/fragrances/<id>/reviews returns 404 when fragrance not in cache."""
    mock_get_cache.return_value.fragrances = []

    resp = client.get("/api/fragrances/missing/reviews")
    assert resp.status_code == 404
    assert "error" in resp.get_json()


# ── Discovery: family filter ───────────────────────────────────────────

@patch("routes.discovery.get_cache")
def test_discovery_notes_filter_by_family(mock_get_cache, client):
    """GET /api/discovery/notes?family=Woody returns only notes in that family."""
    cache = mock_get_cache.return_value
    cache.notes = [
        {"id": "n1", "name": "Bergamot", "family": "Citrus"},
        {"id": "n2", "name": "Cedar", "family": "Woody"},
    ]

    resp = client.get("/api/discovery/notes?family=Woody")
    assert resp.status_code == 200
    data = resp.get_json()
    assert len(data["notes"]) == 1
    assert data["notes"][0]["family"] == "Woody"


# ── Discussions: category filter ───────────────────────────────────────

@patch("routes.discussions._discussion_service")
def test_discussions_filter_by_category(mock_disc_svc, client):
    """GET /api/discussions?category=News returns only that category."""
    mock_disc_svc.get_all.return_value = [
        {"id": "d1", "title": "T1", "category": "Recommendation"},
        {"id": "d2", "title": "T2", "category": "News"},
    ]

    resp = client.get("/api/discussions?category=News")
    assert resp.status_code == 200
    data = resp.get_json()
    assert len(data["discussions"]) == 1
    assert data["discussions"][0]["category"] == "News"


@patch("routes.discussions._discussion_service")
def test_discussions_ignores_invalid_category(mock_disc_svc, client):
    """GET /api/discussions?category=Invalid returns all (filter ignored)."""
    mock_disc_svc.get_all.return_value = [
        {"id": "d1", "title": "T1", "category": "General"},
    ]

    resp = client.get("/api/discussions?category=InvalidCategory")
    assert resp.status_code == 200
    data = resp.get_json()
    assert len(data["discussions"]) == 1


# ── Response shape sanity ──────────────────────────────────────────────

@patch("routes.fragrances.get_cache")
def test_fragrance_detail_response_has_required_fields(mock_get_cache, client):
    """GET /api/fragrances/<id> response includes id, name, brand, notes, ratings."""
    mock_get_cache.return_value.fragrances = [_minimal_fragrance("f1")]

    resp = client.get("/api/fragrances/f1")
    assert resp.status_code == 200
    frag = resp.get_json()["fragrance"]
    assert "id" in frag
    assert "name" in frag
    assert "brand" in frag
    assert "notes" in frag
    assert "ratings" in frag
    assert frag["notes"]["top"] is not None
    assert frag["ratings"]["overall"] is not None
