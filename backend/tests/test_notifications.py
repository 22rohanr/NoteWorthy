"""Tests for notification endpoints at /api/notifications."""

from unittest.mock import patch, MagicMock
import json


@patch("routes.notifications._notification_service")
def test_list_notifications_requires_auth(mock_svc, client):
    """GET /api/notifications/ returns 401 without auth."""
    resp = client.get("/api/notifications/")
    assert resp.status_code == 401


@patch("routes.notifications._notification_service")
def test_list_notifications_returns_list(mock_svc, client):
    """GET /api/notifications/ returns notifications for the user."""
    mock_svc.get_for_user.return_value = [
        {
            "id": "n1",
            "recipientId": "test-uid",
            "actorId": "other-uid",
            "type": "follow",
            "referenceId": None,
            "message": "Alice started following you",
            "read": False,
            "createdAt": "2026-04-15T10:00:00+00:00",
        },
    ]

    resp = client.get(
        "/api/notifications/",
        headers={"Authorization": "Bearer fake-token"},
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert len(data["notifications"]) == 1
    assert data["notifications"][0]["type"] == "follow"


@patch("routes.notifications._notification_service")
def test_unread_count(mock_svc, client):
    """GET /api/notifications/unread-count returns the count."""
    mock_svc.count_unread.return_value = 3

    resp = client.get(
        "/api/notifications/unread-count",
        headers={"Authorization": "Bearer fake-token"},
    )
    assert resp.status_code == 200
    assert resp.get_json()["count"] == 3


@patch("routes.notifications._notification_service")
def test_mark_read(mock_svc, client):
    """POST /api/notifications/<id>/read marks notification as read."""
    resp = client.post(
        "/api/notifications/n1/read",
        headers={"Authorization": "Bearer fake-token"},
    )
    assert resp.status_code == 200
    mock_svc.mark_read.assert_called_once_with("n1")


@patch("routes.notifications._notification_service")
def test_mark_all_read(mock_svc, client):
    """POST /api/notifications/read-all marks all as read."""
    mock_svc.mark_all_read.return_value = 5

    resp = client.post(
        "/api/notifications/read-all",
        headers={"Authorization": "Bearer fake-token"},
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["updated"] == 5
    mock_svc.mark_all_read.assert_called_once_with("test-uid")


@patch("routes.notifications._notification_service")
def test_delete_notification(mock_svc, client):
    """DELETE /api/notifications/<id> deletes the notification."""
    resp = client.delete(
        "/api/notifications/n1",
        headers={"Authorization": "Bearer fake-token"},
    )
    assert resp.status_code == 200
    mock_svc.delete.assert_called_once_with("n1")


@patch("routes.notifications._notification_service")
def test_unread_count_requires_auth(mock_svc, client):
    """GET /api/notifications/unread-count returns 401 without auth."""
    resp = client.get("/api/notifications/unread-count")
    assert resp.status_code == 401
