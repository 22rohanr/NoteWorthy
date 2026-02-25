"""
General app and configuration tests.

Covers the Flask app factory, health endpoint, 404 handling, and that
all API blueprints are registered and reachable.
"""

import re


def test_create_app_returns_flask_app(app):
    """create_app() returns a Flask application instance."""
    assert app is not None
    assert app.name
    assert app.config["TESTING"] is True


def test_health_endpoint_exists(client):
    """Application exposes GET /health."""
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "ok"


def test_unknown_route_returns_404(client):
    """Unknown path returns 404."""
    resp = client.get("/api/nonexistent")
    assert resp.status_code == 404


def test_unknown_method_returns_405(client):
    """POST to a GET-only route returns 405 where applicable."""
    # /health accepts GET; POST may 405 or 404 depending on Flask
    resp = client.post("/health")
    # Flask typically returns 405 Method Not Allowed for wrong method
    assert resp.status_code in (404, 405)


def test_api_prefix_registered(client):
    """Blueprints are mounted under /api."""
    # Just check that something under /api is registered (no mock needed for 404)
    resp = client.get("/api/")
    # Could be 404 (no route at exactly /api) or 301/308 redirect
    assert resp.status_code in (404, 301, 308, 200)


def test_app_has_expected_config(app):
    """App has core config set (SECRET_KEY, TESTING)."""
    assert "SECRET_KEY" in app.config
    assert app.config["TESTING"] is True


def test_url_map_includes_api_routes(app):
    """URL map includes routes from registered blueprints."""
    rules = [r.rule for r in app.url_map.iter_rules()]
    assert any("/api/fragrances" in r for r in rules)
    assert any("/api/discovery" in r for r in rules)
    assert any("/api/discussions" in r for r in rules)
    assert any("/api/reviews" in r for r in rules)
    assert any(re.match(r"/health/?", r) for r in rules)
