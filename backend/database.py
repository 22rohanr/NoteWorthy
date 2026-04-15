"""
Firebase / Firestore connection manager.

Initializes the firebase_admin SDK exactly once and exposes a thread-safe
singleton Firestore client for the rest of the application.
"""

from __future__ import annotations

import json
import os
import threading

# Must be set before any gRPC import to avoid DNS resolution hangs
# in serverless environments (Vercel, AWS Lambda, etc.).
os.environ.setdefault("GRPC_DNS_RESOLVER", "native")

import firebase_admin
from firebase_admin import credentials, firestore

from config import Config


class _FirestoreManager:
    """Thread-safe singleton that holds the Firestore client."""

    _instance: "_FirestoreManager | None" = None
    _lock: threading.Lock = threading.Lock()
    _db = None

    def __new__(cls) -> "_FirestoreManager":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialize()
        return cls._instance

    def _initialize(self) -> None:
        """Initialize the Firebase Admin SDK and Firestore client."""

        firebase_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")

        if not firebase_admin._apps:
            if firebase_json:
                cred = credentials.Certificate(json.loads(firebase_json))
                firebase_admin.initialize_app(cred)
            else:
                key_path = Config.FIREBASE_KEY_PATH

                if not os.path.isfile(key_path):
                    raise FileNotFoundError(
                        f"Firebase service-account key not found at: {key_path}\n"
                        "Set FIREBASE_SERVICE_ACCOUNT_JSON in Vercel or "
                        "set FIREBASE_KEY_PATH locally."
                    )

                cred = credentials.Certificate(key_path)
                firebase_admin.initialize_app(cred)

        self._db = firestore.client()

    @property
    def client(self):
        """Return the Firestore client instance."""
        return self._db


def get_db():
    """Return the singleton Firestore client."""
    return _FirestoreManager().client