"""Tests for DiscussionService – Firestore CRUD layer."""

from unittest.mock import MagicMock, patch

import pytest

from tests.conftest import make_doc_snapshot


@pytest.fixture()
def service(mock_db):
    from services.discussion_service import DiscussionService
    svc = DiscussionService.__new__(DiscussionService)
    svc._db = mock_db
    return svc


SAMPLE_DISCUSSION = {
    "title": "Best summer scent?",
    "body": "Looking for something fresh",
    "category": "Recommendation",
    "authorId": "u1",
    "authorName": "Alice",
    "authorAvatar": None,
    "commentCount": 2,
    "createdAt": "2026-01-15T10:00:00+00:00",
}


class TestDocToDict:
    def test_converts_full_document(self, service):
        doc = make_doc_snapshot("d1", SAMPLE_DISCUSSION)
        result = service._doc_to_dict(doc)
        assert result["id"] == "d1"
        assert result["title"] == "Best summer scent?"
        assert result["category"] == "Recommendation"
        assert result["commentCount"] == 2

    def test_defaults_for_missing_fields(self, service):
        doc = make_doc_snapshot("d2", {})
        result = service._doc_to_dict(doc)
        assert result["title"] == ""
        assert result["body"] == ""
        assert result["category"] == "General"
        assert result["commentCount"] == 0
        assert result["authorAvatar"] is None


class TestReplyToDict:
    def test_converts_reply(self, service):
        data = {
            "body": "Great choice!",
            "authorId": "u2",
            "authorName": "Bob",
            "authorAvatar": "avatar.png",
            "createdAt": "2026-01-15T12:00:00+00:00",
        }
        doc = make_doc_snapshot("r1", data)
        result = service._reply_to_dict(doc)
        assert result["id"] == "r1"
        assert result["body"] == "Great choice!"
        assert result["authorAvatar"] == "avatar.png"

    def test_defaults_for_missing_reply_fields(self, service):
        doc = make_doc_snapshot("r2", {})
        result = service._reply_to_dict(doc)
        assert result["body"] == ""
        assert result["authorName"] == ""
        assert result["authorAvatar"] is None


class TestGetAll:
    def test_returns_list_of_discussions(self, service, mock_db):
        docs = [
            make_doc_snapshot("d1", {**SAMPLE_DISCUSSION, "title": "First"}),
            make_doc_snapshot("d2", {**SAMPLE_DISCUSSION, "title": "Second"}),
        ]
        mock_db.collection.return_value.order_by.return_value.stream.return_value = docs
        result = service.get_all()
        assert len(result) == 2
        assert result[0]["title"] == "First"
        assert result[1]["title"] == "Second"

    def test_returns_empty_list(self, service, mock_db):
        mock_db.collection.return_value.order_by.return_value.stream.return_value = []
        assert service.get_all() == []


class TestGetById:
    def test_found(self, service, mock_db):
        doc = make_doc_snapshot("d1", SAMPLE_DISCUSSION)
        mock_db.collection.return_value.document.return_value.get.return_value = doc
        result = service.get_by_id("d1")
        assert result is not None
        assert result["id"] == "d1"

    def test_not_found(self, service, mock_db):
        doc = make_doc_snapshot("d1", {}, exists=False)
        mock_db.collection.return_value.document.return_value.get.return_value = doc
        assert service.get_by_id("d1") is None


class TestGetReplies:
    def test_returns_replies(self, service, mock_db):
        reply_docs = [
            make_doc_snapshot("r1", {"body": "Reply 1", "authorId": "u1", "authorName": "A", "createdAt": "2026-01-15"}),
            make_doc_snapshot("r2", {"body": "Reply 2", "authorId": "u2", "authorName": "B", "createdAt": "2026-01-16"}),
        ]
        (mock_db.collection.return_value
         .document.return_value
         .collection.return_value
         .order_by.return_value
         .stream.return_value) = reply_docs

        result = service.get_replies("d1")
        assert len(result) == 2
        assert result[0]["body"] == "Reply 1"

    def test_returns_empty_when_no_replies(self, service, mock_db):
        (mock_db.collection.return_value
         .document.return_value
         .collection.return_value
         .order_by.return_value
         .stream.return_value) = []

        assert service.get_replies("d1") == []


class TestCreate:
    def test_creates_and_returns_discussion(self, service, mock_db):
        doc_ref = MagicMock()
        doc_ref.id = "new-id"
        mock_db.collection.return_value.add.return_value = (None, doc_ref)

        result = service.create({
            "title": "New thread",
            "body": "Body text",
            "category": "News",
            "authorId": "u1",
            "authorName": "Alice",
        })

        assert result["id"] == "new-id"
        assert result["title"] == "New thread"
        assert result["category"] == "News"
        assert result["commentCount"] == 0
        assert result["createdAt"]  # should be set automatically

    def test_defaults_category_to_general(self, service, mock_db):
        doc_ref = MagicMock()
        doc_ref.id = "x"
        mock_db.collection.return_value.add.return_value = (None, doc_ref)

        result = service.create({
            "title": "T",
            "authorId": "u1",
            "authorName": "A",
        })
        assert result["category"] == "General"


class TestAddReply:
    def test_adds_reply_and_increments_count(self, service, mock_db):
        doc_ref = MagicMock()
        doc_ref.id = "reply-id"
        (mock_db.collection.return_value
         .document.return_value
         .collection.return_value
         .add.return_value) = (None, doc_ref)

        result = service.add_reply("d1", {
            "body": "Nice!",
            "authorId": "u2",
            "authorName": "Bob",
        })

        assert result["id"] == "reply-id"
        assert result["body"] == "Nice!"

        # Verify increment was called on the parent
        mock_db.collection.return_value.document.return_value.update.assert_called()


class TestDelete:
    def test_calls_delete_on_document(self, service, mock_db):
        service.delete("d1")
        mock_db.collection.return_value.document.return_value.delete.assert_called_once()
