"""Tests for profile endpoints GET /api/auth/profile/<id> and PATCH /api/auth/profile."""

from unittest.mock import patch
import json


_MOCK_USER = {
    "id": "test-uid",
    "username": "Alice",
    "email": "alice@example.com",
    "avatar": None,
    "bio": "Fragrance lover",
    "preferences": {
        "favoriteNotes": ["Bergamot"],
        "avoidedNotes": [],
        "favoriteConcentrations": [],
        "favoriteOccasions": ["Date Night"],
    },
    "collection": {"owned": ["f1"], "sampled": [], "wishlist": ["f2", "f3"]},
    "createdAt": "2025-01-15",
    "joinDate": "2025-01-15",
}


def _user_copy():
    """Return a fresh copy of the mock user so pop() in the route doesn't leak."""
    import copy
    return copy.deepcopy(_MOCK_USER)


@patch("routes.auth._discussion_service")
@patch("routes.auth._review_service")
@patch("routes.auth._fragrance_service")
@patch("routes.auth._user_service")
def test_get_profile_returns_user_and_activity(
    mock_user_svc, mock_frag_svc, mock_review_svc, mock_disc_svc, client
):
    """GET /api/auth/profile/<id> returns user + reviews + discussions."""
    mock_user_svc.get_by_id.return_value = _user_copy()
    mock_review_svc.get_by_user.return_value = [
        {"id": "r1", "fragranceId": "f1", "createdAt": "2025-06-01", "rating": {"overall": 8}},
    ]
    mock_frag_svc.get_by_id.return_value = {
        "id": "f1",
        "name": "Aventus",
        "brand": {"name": "Creed"},
    }
    mock_disc_svc.get_by_user.return_value = [
        {"id": "d1", "title": "Best summer?", "category": "Recommendation", "commentCount": 3, "createdAt": "2025-07-01"},
    ]

    resp = client.get("/api/auth/profile/test-uid")
    assert resp.status_code == 200
    data = resp.get_json()

    assert data["user"]["username"] == "Alice"
    assert data["reviewCount"] == 1
    assert data["discussionCount"] == 1
    assert data["reviews"][0]["fragrance"]["name"] == "Aventus"


@patch("routes.auth._discussion_service")
@patch("routes.auth._review_service")
@patch("routes.auth._fragrance_service")
@patch("routes.auth._user_service")
def test_get_profile_hides_email_for_non_owner(
    mock_user_svc, mock_frag_svc, mock_review_svc, mock_disc_svc, client
):
    """Email is hidden when the requester is not the profile owner."""
    other_user = {**_user_copy(), "id": "other-uid"}
    mock_user_svc.get_by_id.return_value = other_user
    mock_review_svc.get_by_user.return_value = []
    mock_disc_svc.get_by_user.return_value = []

    resp = client.get("/api/auth/profile/other-uid")
    data = resp.get_json()

    assert "email" not in data["user"]


@patch("routes.auth._discussion_service")
@patch("routes.auth._review_service")
@patch("routes.auth._fragrance_service")
@patch("routes.auth._user_service")
def test_get_profile_shows_email_for_owner(
    mock_user_svc, mock_frag_svc, mock_review_svc, mock_disc_svc, client
):
    """Email is included when the requester owns the profile."""
    mock_user_svc.get_by_id.return_value = _user_copy()
    mock_review_svc.get_by_user.return_value = []
    mock_disc_svc.get_by_user.return_value = []

    resp = client.get(
        "/api/auth/profile/test-uid",
        headers={"Authorization": "Bearer fake-token"},
    )
    data = resp.get_json()

    assert data["user"]["email"] == "alice@example.com"


@patch("routes.auth._user_service")
def test_get_profile_returns_404_for_unknown_user(mock_user_svc, client):
    """GET /api/auth/profile/<id> returns 404 when user doesn't exist."""
    mock_user_svc.get_by_id.return_value = None

    resp = client.get("/api/auth/profile/nonexistent")
    assert resp.status_code == 404


@patch("routes.auth._user_service")
def test_patch_profile_requires_auth(mock_user_svc, client):
    """PATCH /api/auth/profile returns 401 without auth."""
    resp = client.patch(
        "/api/auth/profile",
        content_type="application/json",
        data=json.dumps({"bio": "new bio"}),
    )
    assert resp.status_code == 401


@patch("routes.auth._user_service")
def test_patch_profile_updates_fields(mock_user_svc, client):
    """PATCH /api/auth/profile updates and returns the user."""
    mock_user_svc.get_by_id.return_value = _user_copy()
    updated = {**_user_copy(), "bio": "Updated bio", "username": "NewAlice"}
    mock_user_svc.get_by_id.side_effect = [_user_copy(), updated]

    resp = client.patch(
        "/api/auth/profile",
        headers={
            "Authorization": "Bearer fake-token",
            "Content-Type": "application/json",
        },
        data=json.dumps({"bio": "Updated bio", "username": "NewAlice"}),
    )

    assert resp.status_code == 200
    mock_user_svc.update.assert_called_once()
    call_args = mock_user_svc.update.call_args
    assert call_args[0][0] == "test-uid"
    assert call_args[0][1]["bio"] == "Updated bio"
    assert call_args[0][1]["username"] == "NewAlice"


@patch("routes.auth._user_service")
def test_patch_profile_rejects_empty_body(mock_user_svc, client):
    """PATCH /api/auth/profile returns 400 with no valid fields."""
    mock_user_svc.get_by_id.return_value = _user_copy()

    resp = client.patch(
        "/api/auth/profile",
        headers={
            "Authorization": "Bearer fake-token",
            "Content-Type": "application/json",
        },
        data=json.dumps({"email": "hack@evil.com"}),
    )

    assert resp.status_code == 400
    mock_user_svc.update.assert_not_called()


@patch("routes.auth._user_service")
def test_patch_profile_updates_preferences(mock_user_svc, client):
    """PATCH /api/auth/profile can update nested preferences."""
    mock_user_svc.get_by_id.return_value = _user_copy()

    resp = client.patch(
        "/api/auth/profile",
        headers={
            "Authorization": "Bearer fake-token",
            "Content-Type": "application/json",
        },
        data=json.dumps({
            "preferences": {
                "favoriteNotes": ["Rose", "Oud"],
                "favoriteOccasions": ["Evening Out"],
            },
        }),
    )

    assert resp.status_code == 200
    call_args = mock_user_svc.update.call_args[0][1]
    assert "preferences" in call_args
    assert call_args["preferences"]["favoriteNotes"] == ["Rose", "Oud"]
