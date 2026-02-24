"""Tests for discussion route endpoints."""

import json
from unittest.mock import patch, MagicMock

import pytest


SAMPLE_DISCUSSION = {
    "id": "d1",
    "title": "Best summer scent?",
    "body": "Looking for something fresh",
    "category": "Recommendation",
    "authorId": "test-uid",
    "authorName": "TestUser",
    "authorAvatar": None,
    "commentCount": 0,
    "createdAt": "2026-01-15T10:00:00+00:00",
}

SAMPLE_USER = {
    "id": "test-uid",
    "username": "TestUser",
    "email": "test@example.com",
    "avatar": None,
}

SAMPLE_REPLY = {
    "id": "r1",
    "body": "Try Acqua di Gio!",
    "authorId": "test-uid",
    "authorName": "TestUser",
    "authorAvatar": None,
    "createdAt": "2026-01-15T12:00:00+00:00",
}


def _auth_header():
    return {"Authorization": "Bearer fake-token", "Content-Type": "application/json"}


# ── GET /api/discussions ─────────────────────────────────────────────

class TestListDiscussions:
    @patch("routes.discussions._discussion_service")
    def test_returns_all_discussions(self, mock_svc, client):
        mock_svc.get_all.return_value = [SAMPLE_DISCUSSION]
        resp = client.get("/api/discussions")
        assert resp.status_code == 200
        data = resp.get_json()
        assert len(data["discussions"]) == 1
        assert data["discussions"][0]["title"] == "Best summer scent?"

    @patch("routes.discussions._discussion_service")
    def test_returns_empty_list(self, mock_svc, client):
        mock_svc.get_all.return_value = []
        resp = client.get("/api/discussions")
        assert resp.status_code == 200
        assert resp.get_json()["discussions"] == []

    @patch("routes.discussions._discussion_service")
    def test_filters_by_category(self, mock_svc, client):
        mock_svc.get_all.return_value = [
            {**SAMPLE_DISCUSSION, "category": "Recommendation"},
            {**SAMPLE_DISCUSSION, "id": "d2", "category": "News"},
        ]
        resp = client.get("/api/discussions?category=News")
        data = resp.get_json()
        assert len(data["discussions"]) == 1
        assert data["discussions"][0]["category"] == "News"

    @patch("routes.discussions._discussion_service")
    def test_ignores_invalid_category_filter(self, mock_svc, client):
        mock_svc.get_all.return_value = [SAMPLE_DISCUSSION]
        resp = client.get("/api/discussions?category=InvalidCat")
        data = resp.get_json()
        assert len(data["discussions"]) == 1


# ── POST /api/discussions ────────────────────────────────────────────

class TestCreateDiscussion:
    @patch("routes.discussions._user_service")
    @patch("routes.discussions._discussion_service")
    def test_creates_discussion(self, mock_disc_svc, mock_user_svc, client):
        mock_user_svc.get_by_id.return_value = SAMPLE_USER
        mock_disc_svc.create.return_value = SAMPLE_DISCUSSION

        resp = client.post(
            "/api/discussions",
            headers=_auth_header(),
            data=json.dumps({"title": "Best summer scent?", "body": "Fresh", "category": "Recommendation"}),
        )
        assert resp.status_code == 201
        assert resp.get_json()["discussion"]["title"] == "Best summer scent?"

    def test_requires_auth(self, client):
        resp = client.post(
            "/api/discussions",
            headers={"Content-Type": "application/json"},
            data=json.dumps({"title": "Test"}),
        )
        assert resp.status_code == 401

    @patch("routes.discussions._user_service")
    def test_requires_title(self, mock_user_svc, client):
        mock_user_svc.get_by_id.return_value = SAMPLE_USER
        resp = client.post(
            "/api/discussions",
            headers=_auth_header(),
            data=json.dumps({"title": "", "category": "General"}),
        )
        assert resp.status_code == 400
        assert "title" in resp.get_json()["error"]

    @patch("routes.discussions._user_service")
    def test_rejects_invalid_category(self, mock_user_svc, client):
        mock_user_svc.get_by_id.return_value = SAMPLE_USER
        resp = client.post(
            "/api/discussions",
            headers=_auth_header(),
            data=json.dumps({"title": "T", "category": "BadCategory"}),
        )
        assert resp.status_code == 400
        assert "category" in resp.get_json()["error"]

    @patch("routes.discussions._user_service")
    def test_user_not_found(self, mock_user_svc, client):
        mock_user_svc.get_by_id.return_value = None
        resp = client.post(
            "/api/discussions",
            headers=_auth_header(),
            data=json.dumps({"title": "T"}),
        )
        assert resp.status_code == 404


# ── GET /api/discussions/<id> ────────────────────────────────────────

class TestGetDiscussion:
    @patch("routes.discussions._discussion_service")
    def test_returns_discussion_with_replies(self, mock_svc, client):
        mock_svc.get_by_id.return_value = SAMPLE_DISCUSSION
        mock_svc.get_replies.return_value = [SAMPLE_REPLY]

        resp = client.get("/api/discussions/d1")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["discussion"]["id"] == "d1"
        assert len(data["replies"]) == 1

    @patch("routes.discussions._discussion_service")
    def test_returns_404_when_not_found(self, mock_svc, client):
        mock_svc.get_by_id.return_value = None
        resp = client.get("/api/discussions/missing")
        assert resp.status_code == 404


# ── POST /api/discussions/<id>/replies ───────────────────────────────

class TestAddReply:
    @patch("routes.discussions._discussion_service")
    @patch("routes.discussions._user_service")
    def test_adds_reply(self, mock_user_svc, mock_disc_svc, client):
        mock_user_svc.get_by_id.return_value = SAMPLE_USER
        mock_disc_svc.get_by_id.return_value = SAMPLE_DISCUSSION
        mock_disc_svc.add_reply.return_value = SAMPLE_REPLY

        resp = client.post(
            "/api/discussions/d1/replies",
            headers=_auth_header(),
            data=json.dumps({"body": "Try Acqua di Gio!"}),
        )
        assert resp.status_code == 201
        assert resp.get_json()["reply"]["body"] == "Try Acqua di Gio!"

    def test_requires_auth(self, client):
        resp = client.post(
            "/api/discussions/d1/replies",
            headers={"Content-Type": "application/json"},
            data=json.dumps({"body": "test"}),
        )
        assert resp.status_code == 401

    @patch("routes.discussions._discussion_service")
    @patch("routes.discussions._user_service")
    def test_requires_body(self, mock_user_svc, mock_disc_svc, client):
        mock_user_svc.get_by_id.return_value = SAMPLE_USER
        mock_disc_svc.get_by_id.return_value = SAMPLE_DISCUSSION

        resp = client.post(
            "/api/discussions/d1/replies",
            headers=_auth_header(),
            data=json.dumps({"body": ""}),
        )
        assert resp.status_code == 400

    @patch("routes.discussions._discussion_service")
    @patch("routes.discussions._user_service")
    def test_discussion_not_found(self, mock_user_svc, mock_disc_svc, client):
        mock_user_svc.get_by_id.return_value = SAMPLE_USER
        mock_disc_svc.get_by_id.return_value = None

        resp = client.post(
            "/api/discussions/missing/replies",
            headers=_auth_header(),
            data=json.dumps({"body": "test"}),
        )
        assert resp.status_code == 404


# ── DELETE /api/discussions/<id> ─────────────────────────────────────

class TestDeleteDiscussion:
    @patch("routes.discussions._discussion_service")
    def test_deletes_own_discussion(self, mock_svc, client):
        mock_svc.get_by_id.return_value = {**SAMPLE_DISCUSSION, "authorId": "test-uid"}
        resp = client.delete("/api/discussions/d1", headers=_auth_header())
        assert resp.status_code == 200
        mock_svc.delete.assert_called_once_with("d1")

    @patch("routes.discussions._discussion_service")
    def test_cannot_delete_others_discussion(self, mock_svc, client):
        mock_svc.get_by_id.return_value = {**SAMPLE_DISCUSSION, "authorId": "other-uid"}
        resp = client.delete("/api/discussions/d1", headers=_auth_header())
        assert resp.status_code == 403

    @patch("routes.discussions._discussion_service")
    def test_not_found(self, mock_svc, client):
        mock_svc.get_by_id.return_value = None
        resp = client.delete("/api/discussions/missing", headers=_auth_header())
        assert resp.status_code == 404

    def test_requires_auth(self, client):
        resp = client.delete("/api/discussions/d1")
        assert resp.status_code == 401
