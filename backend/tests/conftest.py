"""
Shared fixtures for backend tests.

Mocks Firestore so tests never hit a real database.
"""

import sys
import types
from unittest.mock import MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# Stub out firebase-related imports before any application code is imported.
# This prevents the real database.py / firebase_admin from trying to
# initialise credentials at import time.
# ---------------------------------------------------------------------------

def _patch_firebase_modules():
    """Insert lightweight stubs for firebase_admin and google.cloud.firestore_v1."""
    fa = types.ModuleType("firebase_admin")
    fa.initialize_app = MagicMock()
    fa._apps = {"[DEFAULT]": True}

    fa_auth = types.ModuleType("firebase_admin.auth")
    fa_auth.verify_id_token = MagicMock(return_value={"uid": "test-uid", "email": "test@example.com"})
    fa_auth.InvalidIdTokenError = type("InvalidIdTokenError", (Exception,), {})
    fa_auth.ExpiredIdTokenError = type("ExpiredIdTokenError", (Exception,), {})
    fa_auth.RevokedIdTokenError = type("RevokedIdTokenError", (Exception,), {})

    fa_cred = types.ModuleType("firebase_admin.credentials")
    fa_cred.Certificate = MagicMock()

    fa_firestore = types.ModuleType("firebase_admin.firestore")
    fa_firestore.client = MagicMock()

    sys.modules["firebase_admin"] = fa
    sys.modules["firebase_admin.auth"] = fa_auth
    sys.modules["firebase_admin.credentials"] = fa_cred
    sys.modules["firebase_admin.firestore"] = fa_firestore

    # Stub google.cloud.firestore_v1 used for ArrayUnion/ArrayRemove/Increment
    google_mod = types.ModuleType("google")
    cloud_mod = types.ModuleType("google.cloud")
    firestore_v1 = types.ModuleType("google.cloud.firestore_v1")

    firestore_v1.ArrayRemove = MagicMock()
    firestore_v1.ArrayUnion = MagicMock()
    firestore_v1.Increment = MagicMock()

    sys.modules.setdefault("google", google_mod)
    sys.modules.setdefault("google.cloud", cloud_mod)
    sys.modules["google.cloud.firestore_v1"] = firestore_v1


_patch_firebase_modules()


@pytest.fixture()
def mock_db():
    """Provide a MagicMock that replaces the Firestore client everywhere."""
    db = MagicMock()
    with patch("database.get_db", return_value=db), \
         patch("database.db", db):
        yield db


@pytest.fixture()
def app(mock_db):
    """Create a Flask test app with mocked Firestore."""
    from app import create_app
    application = create_app()
    application.config["TESTING"] = True
    return application


@pytest.fixture()
def client(app):
    """Flask test client."""
    return app.test_client()


def make_doc_snapshot(doc_id: str, data: dict, exists: bool = True):
    """Build a fake Firestore DocumentSnapshot."""
    doc = MagicMock()
    doc.id = doc_id
    doc.exists = exists
    doc.to_dict.return_value = data
    return doc
