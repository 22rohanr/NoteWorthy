"""
Firebase / Firestore connection manager.

Initializes the firebase_admin SDK exactly once using the service-account
JSON key file and exposes a thread-safe singleton Firestore client for the
rest of the application.

Usage:
    from database import db          # Firestore client (lazy-initialized)
    from database import get_db      # or call the function explicitly

    users_ref = db.collection("users")
"""

import os
import threading

import firebase_admin
from firebase_admin import credentials, firestore

from config import Config


class _FirestoreManager:
    """Thread-safe singleton that holds the Firestore client."""

    _instance: "_FirestoreManager | None" = None
    _lock: threading.Lock = threading.Lock()
    _db = None  # google.cloud.firestore.Client

    def __new__(cls) -> "_FirestoreManager":
        if cls._instance is None:
            with cls._lock:
                # Double-checked locking
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialize()
        return cls._instance

    # ------------------------------------------------------------------ #
    #  Private helpers
    # ------------------------------------------------------------------ #
    def _initialize(self) -> None:
        """Initialize the Firebase Admin SDK and Firestore client."""
        key_path = Config.FIREBASE_KEY_PATH

        if not os.path.isfile(key_path):
            raise FileNotFoundError(
                f"Firebase service-account key not found at: {key_path}\n"
                "Make sure firebase-private-key.json is in the backend/ folder "
                "or set FIREBASE_KEY_PATH in your .env file."
            )

        # Only initialize if no default app exists yet
        if not firebase_admin._apps:
            cred = credentials.Certificate(key_path)
            firebase_admin.initialize_app(cred)

        self._db = firestore.client()

    # ------------------------------------------------------------------ #
    #  Public API
    # ------------------------------------------------------------------ #
    @property
    def client(self):
        """Return the Firestore client instance."""
        return self._db


def get_db():
    """Return the singleton Firestore client."""
    return _FirestoreManager().client


# Convenience alias – importable as `from database import db`
db = get_db()
