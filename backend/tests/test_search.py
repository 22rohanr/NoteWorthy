"""Tests for the unified search endpoint GET /api/search."""

from unittest.mock import patch, MagicMock


def _cache_with_data():
    cache = MagicMock()
    cache.fragrances = [
        {
            "id": "f1",
            "name": "Aventus",
            "brand": {"id": "b1", "name": "Creed", "country": "France"},
            "description": "Smoky pineapple",
            "ratings": {"overall": 9.2},
        },
        {
            "id": "f2",
            "name": "Sauvage",
            "brand": {"id": "b2", "name": "Dior", "country": "France"},
            "description": "Fresh and spicy",
            "ratings": {"overall": 8.5},
        },
    ]
    cache.brands = [
        {"id": "b1", "name": "Creed", "country": "France"},
        {"id": "b2", "name": "Dior", "country": "France"},
    ]
    cache.notes = [
        {"id": "n1", "name": "Bergamot", "family": "Citrus"},
        {"id": "n2", "name": "Pineapple", "family": "Fruity"},
    ]
    return cache


@patch("routes.search._discussion_service")
@patch("routes.search.get_cache")
def test_search_requires_q_param(mock_cache, mock_disc, client):
    resp = client.get("/api/search")
    assert resp.status_code == 400
    assert "q" in resp.get_json()["error"].lower()


@patch("routes.search._discussion_service")
@patch("routes.search.get_cache")
def test_search_returns_categorized_results(mock_cache, mock_disc, client):
    mock_cache.return_value = _cache_with_data()
    mock_disc.get_all.return_value = [
        {"id": "d1", "title": "Aventus batch talk", "body": "Great scent", "category": "General"},
    ]

    resp = client.get("/api/search?q=aventus")
    assert resp.status_code == 200
    data = resp.get_json()

    assert data["query"] == "aventus"
    assert data["fragranceCount"] >= 1
    assert data["fragrances"][0]["name"] == "Aventus"
    assert "brandCount" in data
    assert "noteCount" in data
    assert data["discussionCount"] == 1


@patch("routes.search._discussion_service")
@patch("routes.search.get_cache")
def test_search_matches_brand_name(mock_cache, mock_disc, client):
    mock_cache.return_value = _cache_with_data()
    mock_disc.get_all.return_value = []

    resp = client.get("/api/search?q=creed")
    data = resp.get_json()

    assert data["brandCount"] >= 1
    assert any(b["name"] == "Creed" for b in data["brands"])
    assert data["fragranceCount"] >= 1


@patch("routes.search._discussion_service")
@patch("routes.search.get_cache")
def test_search_matches_note_name(mock_cache, mock_disc, client):
    mock_cache.return_value = _cache_with_data()
    mock_disc.get_all.return_value = []

    resp = client.get("/api/search?q=bergamot")
    data = resp.get_json()

    assert data["noteCount"] >= 1
    assert data["notes"][0]["name"] == "Bergamot"


@patch("routes.search._discussion_service")
@patch("routes.search.get_cache")
def test_search_no_results(mock_cache, mock_disc, client):
    mock_cache.return_value = _cache_with_data()
    mock_disc.get_all.return_value = []

    resp = client.get("/api/search?q=zzzznonexistent")
    data = resp.get_json()

    assert data["fragranceCount"] == 0
    assert data["brandCount"] == 0
    assert data["noteCount"] == 0
    assert data["discussionCount"] == 0


@patch("routes.search._discussion_service")
@patch("routes.search.get_cache")
def test_search_respects_limit_param(mock_cache, mock_disc, client):
    mock_cache.return_value = _cache_with_data()
    mock_disc.get_all.return_value = []

    resp = client.get("/api/search?q=france&limit=1")
    data = resp.get_json()

    assert len(data["brands"]) <= 1
    assert data["brandCount"] == 2
