"""
Smoke tests for the main API surface.

Hits health and the primary read-only endpoints (fragrances, discovery,
reviews, discussions) to ensure the app and routes respond with expected
status and response shape. Uses mocked cache and services; no Firestore.
"""

from unittest.mock import patch


# ── Shared mock data ───────────────────────────────────────────────────

def _minimal_fragrance(frag_id: str, brand_id: str = "b1"):
    return {
        "id": frag_id,
        "name": f"Frag {frag_id}",
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


def _minimal_brand(brand_id: str = "b1"):
    return {"id": brand_id, "name": "Brand", "country": "X", "foundedYear": None}


def _minimal_note(note_id: str = "n1"):
    return {"id": note_id, "name": "Bergamot", "family": "Citrus"}


# ── Health ─────────────────────────────────────────────────────────────

def test_health_returns_ok(client):
    """GET /health returns 200 and status ok."""
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data == {"status": "ok"}


# ── Fragrances (cache-based) ───────────────────────────────────────────

@patch("routes.fragrances.get_cache")
def test_fragrances_list_returns_200_and_list(mock_get_cache, client):
    """GET /api/fragrances returns 200 and a fragrances array."""
    cache = mock_get_cache.return_value
    cache.fragrances = [_minimal_fragrance("f1"), _minimal_fragrance("f2")]

    resp = client.get("/api/fragrances")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "fragrances" in data
    assert len(data["fragrances"]) == 2
    assert data["fragrances"][0]["id"] == "f1"


@patch("routes.fragrances.get_cache")
def test_fragrance_detail_returns_200_when_found(mock_get_cache, client):
    """GET /api/fragrances/<id> returns 200 and fragrance when id exists."""
    cache = mock_get_cache.return_value
    cache.fragrances = [_minimal_fragrance("f1")]

    resp = client.get("/api/fragrances/f1")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["fragrance"]["id"] == "f1"
    assert "brand" in data["fragrance"]
    assert "notes" in data["fragrance"]


@patch("routes.fragrances.get_cache")
def test_fragrance_detail_returns_404_when_missing(mock_get_cache, client):
    """GET /api/fragrances/<id> returns 404 when id not in cache."""
    mock_get_cache.return_value.fragrances = []

    resp = client.get("/api/fragrances/nonexistent")
    assert resp.status_code == 404
    assert "error" in resp.get_json()


@patch("routes.fragrances.get_cache")
def test_fragrance_similar_returns_200(mock_get_cache, client):
    """GET /api/fragrances/<id>/similar returns 200 and fragrances array."""
    cache = mock_get_cache.return_value
    cache.fragrances = [_minimal_fragrance("f1"), _minimal_fragrance("f2")]

    resp = client.get("/api/fragrances/f1/similar")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "fragrances" in data
    assert isinstance(data["fragrances"], list)


# ── Discovery (cache-based) ─────────────────────────────────────────────

@patch("routes.discovery.get_cache")
def test_discovery_brands_returns_200_and_list(mock_get_cache, client):
    """GET /api/discovery/brands returns 200 and brands with fragranceCount."""
    cache = mock_get_cache.return_value
    cache.brands = [_minimal_brand("b1")]
    cache.fragrances = [_minimal_fragrance("f1", "b1")]

    resp = client.get("/api/discovery/brands")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "brands" in data
    assert len(data["brands"]) == 1
    assert data["brands"][0]["fragranceCount"] == 1


@patch("routes.discovery.get_cache")
def test_discovery_notes_returns_200_and_notes_families(mock_get_cache, client):
    """GET /api/discovery/notes returns 200, notes array, and families."""
    cache = mock_get_cache.return_value
    cache.notes = [_minimal_note("n1")]

    resp = client.get("/api/discovery/notes")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "notes" in data
    assert "families" in data
    assert isinstance(data["families"], list)
    assert "Citrus" in data["families"]


# ── Reviews (service-based) ───────────────────────────────────────────

@patch("routes.reviews._fragrance_service")
@patch("routes.reviews._review_service")
def test_reviews_list_returns_200_and_list(mock_review_svc, mock_frag_svc, client):
    """GET /api/reviews returns 200 and reviews array."""
    mock_review_svc.get_all.return_value = [
        {"id": "r1", "fragranceId": "f1", "userId": "u1", "content": "Great", "upvotes": 0},
    ]
    mock_frag_svc.get_by_id.return_value = {"id": "f1", "name": "Frag", "brand": {"name": "X"}}

    resp = client.get("/api/reviews")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "reviews" in data
    assert len(data["reviews"]) == 1
    assert data["reviews"][0].get("fragrance") is not None


# ── Discussions (service-based) ─────────────────────────────────────────

@patch("routes.discussions._discussion_service")
def test_discussions_list_returns_200_and_list(mock_disc_svc, client):
    """GET /api/discussions returns 200 and discussions array."""
    mock_disc_svc.get_all.return_value = [
        {"id": "d1", "title": "Best summer scent?", "category": "Recommendation"},
    ]

    resp = client.get("/api/discussions")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "discussions" in data
    assert len(data["discussions"]) == 1
