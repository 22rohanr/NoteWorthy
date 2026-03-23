"""Tests for review upvote toggle with duplicate prevention."""

from unittest.mock import patch


@patch("routes.reviews._review_service")
def test_upvote_requires_auth(mock_svc, client):
    """POST /api/reviews/<id>/upvote returns 401 without auth."""
    resp = client.post("/api/reviews/r1/upvote")
    assert resp.status_code == 401


@patch("routes.reviews._review_service")
def test_upvote_returns_404_for_missing_review(mock_svc, client):
    """POST /api/reviews/<id>/upvote returns 404 when review doesn't exist."""
    mock_svc.get_by_id.return_value = None

    resp = client.post(
        "/api/reviews/missing/upvote",
        headers={"Authorization": "Bearer fake-token"},
    )
    assert resp.status_code == 404


@patch("routes.reviews._review_service")
def test_upvote_toggle_adds_upvote(mock_svc, client):
    """Upvoting a review the first time returns upvoted=True."""
    mock_svc.get_by_id.return_value = {
        "id": "r1",
        "upvotes": 0,
        "upvotedBy": [],
        "userId": "other-user",
    }
    mock_svc.toggle_upvote.return_value = True

    resp = client.post(
        "/api/reviews/r1/upvote",
        headers={"Authorization": "Bearer fake-token"},
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["upvoted"] is True
    mock_svc.toggle_upvote.assert_called_once_with("r1", "test-uid")


@patch("routes.reviews._review_service")
def test_upvote_toggle_removes_upvote(mock_svc, client):
    """Upvoting a review you already upvoted returns upvoted=False."""
    mock_svc.get_by_id.return_value = {
        "id": "r1",
        "upvotes": 1,
        "upvotedBy": ["test-uid"],
        "userId": "other-user",
    }
    mock_svc.toggle_upvote.return_value = False

    resp = client.post(
        "/api/reviews/r1/upvote",
        headers={"Authorization": "Bearer fake-token"},
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["upvoted"] is False
    mock_svc.toggle_upvote.assert_called_once_with("r1", "test-uid")


@patch("routes.reviews._review_service")
def test_upvote_second_call_toggles(mock_svc, client):
    """Two upvote calls toggle the state."""
    mock_svc.get_by_id.return_value = {"id": "r1", "upvotes": 0, "upvotedBy": [], "userId": "x"}
    mock_svc.toggle_upvote.side_effect = [True, False]

    headers = {"Authorization": "Bearer fake-token"}

    resp1 = client.post("/api/reviews/r1/upvote", headers=headers)
    assert resp1.get_json()["upvoted"] is True

    resp2 = client.post("/api/reviews/r1/upvote", headers=headers)
    assert resp2.get_json()["upvoted"] is False

    assert mock_svc.toggle_upvote.call_count == 2
