"""Tests for fragrance aggregate rating recalculation on review create/delete."""

from unittest.mock import patch
import json


@patch("routes.reviews._cache")
@patch("routes.reviews._fragrance_service")
@patch("routes.reviews._user_service")
@patch("routes.reviews._review_service")
def test_create_review_triggers_recalculation(
    mock_review_svc, mock_user_svc, mock_frag_svc, mock_cache, client
):
    """POST /api/reviews triggers recalculate_ratings and cache invalidation."""
    mock_user_svc.get_by_id.return_value = {"username": "Alice", "avatar": None}
    mock_review_svc.create.return_value = "new-review-id"

    resp = client.post(
        "/api/reviews",
        headers={
            "Authorization": "Bearer fake-token",
            "Content-Type": "application/json",
        },
        data=json.dumps({
            "fragranceId": "f1",
            "rating": {"overall": 9, "longevity": 8, "sillage": 7, "value": 6},
            "content": "Great scent!",
        }),
    )

    assert resp.status_code == 201
    mock_frag_svc.recalculate_ratings.assert_called_once_with("f1")
    mock_cache.invalidate.assert_called_once()


@patch("routes.reviews._cache")
@patch("routes.reviews._fragrance_service")
@patch("routes.reviews._review_service")
def test_delete_review_triggers_recalculation(
    mock_review_svc, mock_frag_svc, mock_cache, client
):
    """DELETE /api/reviews/<id> triggers recalculate_ratings and cache invalidation."""
    mock_review_svc.get_by_id.return_value = {
        "id": "r1",
        "userId": "test-uid",
        "fragranceId": "f1",
    }

    resp = client.delete(
        "/api/reviews/r1",
        headers={"Authorization": "Bearer fake-token"},
    )

    assert resp.status_code == 200
    mock_frag_svc.recalculate_ratings.assert_called_once_with("f1")
    mock_cache.invalidate.assert_called_once()


@patch("routes.reviews._cache")
@patch("routes.reviews._fragrance_service")
@patch("routes.reviews._review_service")
def test_delete_review_skips_recalc_when_no_fragrance_id(
    mock_review_svc, mock_frag_svc, mock_cache, client
):
    """DELETE /api/reviews/<id> skips recalculation if fragranceId is empty."""
    mock_review_svc.get_by_id.return_value = {
        "id": "r1",
        "userId": "test-uid",
        "fragranceId": "",
    }

    resp = client.delete(
        "/api/reviews/r1",
        headers={"Authorization": "Bearer fake-token"},
    )

    assert resp.status_code == 200
    mock_frag_svc.recalculate_ratings.assert_not_called()
    mock_cache.invalidate.assert_not_called()


@patch("routes.reviews._cache")
@patch("routes.reviews._fragrance_service")
@patch("routes.reviews._user_service")
@patch("routes.reviews._review_service")
def test_create_review_without_fragrance_id_returns_400(
    mock_review_svc, mock_user_svc, mock_frag_svc, mock_cache, client
):
    """POST /api/reviews returns 400 when fragranceId is missing."""
    mock_user_svc.get_by_id.return_value = {"username": "Alice", "avatar": None}

    resp = client.post(
        "/api/reviews",
        headers={
            "Authorization": "Bearer fake-token",
            "Content-Type": "application/json",
        },
        data=json.dumps({
            "rating": {"overall": 9},
            "content": "No fragrance!",
        }),
    )

    assert resp.status_code == 400
    mock_frag_svc.recalculate_ratings.assert_not_called()


@patch("routes.reviews._cache")
@patch("routes.reviews._fragrance_service")
@patch("routes.reviews._review_service")
def test_delete_review_forbidden_for_non_author(
    mock_review_svc, mock_frag_svc, mock_cache, client
):
    """DELETE /api/reviews/<id> returns 403 if user is not the author."""
    mock_review_svc.get_by_id.return_value = {
        "id": "r1",
        "userId": "other-uid",
        "fragranceId": "f1",
    }

    resp = client.delete(
        "/api/reviews/r1",
        headers={"Authorization": "Bearer fake-token"},
    )

    assert resp.status_code == 403
    mock_frag_svc.recalculate_ratings.assert_not_called()
