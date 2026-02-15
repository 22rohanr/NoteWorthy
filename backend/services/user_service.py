"""
UserService – Firestore CRUD for the ``users`` collection.

Document shape (matches frontend ``User`` interface):
    {
        "username": str,
        "email":    str,
        "avatar":   str | None,
        "preferences": {
            "likedNotes":              [str],
            "avoidedNotes":            [str],
            "preferredConcentrations": [str],
        } | None,
        "collection": {
            "owned":    [str],   # fragrance IDs
            "sampled":  [str],
            "wishlist": [str],
        },
        "createdAt": str,        # ISO-8601 date string
    }

The ``id`` field is the Firestore document ID and is injected on read.
"""

from datetime import datetime, timezone

from google.cloud.firestore_v1 import ArrayRemove, ArrayUnion

from database import get_db


class UserService:
    """Encapsulates all Firestore operations for users."""

    COLLECTION = "users"
    COLLECTION_TABS = frozenset(["owned", "sampled", "wishlist"])

    def __init__(self):
        self._db = get_db()

    # ── helpers ───────────────────────────────────────────────────────
    @staticmethod
    def _default_preferences() -> dict:
        return {
            "likedNotes": [],
            "avoidedNotes": [],
            "preferredConcentrations": [],
        }

    @staticmethod
    def _default_collection() -> dict:
        return {
            "owned": [],
            "sampled": [],
            "wishlist": [],
        }

    def _doc_to_dict(self, doc) -> dict:
        """Convert a Firestore DocumentSnapshot to a frontend-shaped dict."""
        data = doc.to_dict()
        return {
            "id": doc.id,
            "username": data.get("username", ""),
            "email": data.get("email", ""),
            "avatar": data.get("avatar"),
            "preferences": data.get("preferences") or self._default_preferences(),
            "collection": data.get("collection") or self._default_collection(),
            "createdAt": data.get("createdAt", ""),
        }

    # ── Read ─────────────────────────────────────────────────────────
    def get_all(self) -> list[dict]:
        """Return every user document."""
        docs = self._db.collection(self.COLLECTION).stream()
        return [self._doc_to_dict(doc) for doc in docs]

    def get_by_id(self, user_id: str) -> dict | None:
        """Return a single user by document ID, or ``None``."""
        doc = self._db.collection(self.COLLECTION).document(user_id).get()
        if doc.exists:
            return self._doc_to_dict(doc)
        return None

    def get_by_email(self, email: str) -> dict | None:
        """Look up a user by email address."""
        docs = (
            self._db.collection(self.COLLECTION)
            .where("email", "==", email)
            .limit(1)
            .stream()
        )
        for doc in docs:
            return self._doc_to_dict(doc)
        return None

    # ── Write ────────────────────────────────────────────────────────
    def _build_doc_data(self, data: dict) -> dict:
        """Build a sanitised document dict from caller-provided data."""
        return {
            "username": data.get("username", ""),
            "email": data.get("email", ""),
            "avatar": data.get("avatar"),
            "preferences": data.get("preferences", self._default_preferences()),
            "collection": data.get("collection", self._default_collection()),
            "createdAt": data.get(
                "createdAt",
                datetime.now(timezone.utc).date().isoformat(),
            ),
        }

    def create(self, data: dict) -> str:
        """Create a new user document and return its ID.

        Required keys: ``username``, ``email``.
        Optional keys: ``avatar``, ``preferences``, ``collection``.
        ``createdAt`` is set automatically if not provided.
        """
        doc_data = self._build_doc_data(data)
        _, doc_ref = self._db.collection(self.COLLECTION).add(doc_data)
        return doc_ref.id

    def create_with_id(self, uid: str, data: dict) -> dict:
        """Create a user document with a specific ID (e.g. Firebase Auth UID).

        Uses ``document(uid).set(...)`` so the Firebase UID becomes the
        Firestore document ID.  Returns the full user dict including
        the ``id`` field.
        """
        doc_data = self._build_doc_data(data)
        self._db.collection(self.COLLECTION).document(uid).set(doc_data)
        return {"id": uid, **doc_data}

    def update(self, user_id: str, data: dict) -> None:
        """Partial-update an existing user document.

        Supports top-level fields as well as nested ``preferences`` and
        ``collection`` sub-objects.
        """
        allowed_top = {"username", "email", "avatar", "createdAt"}
        allowed_nested = {"preferences", "collection"}

        update_data: dict = {}
        for key, value in data.items():
            if key in allowed_top:
                update_data[key] = value
            elif key in allowed_nested and isinstance(value, dict):
                # Merge nested maps using dot-notation so we don't
                # overwrite sibling keys the caller didn't send.
                for sub_key, sub_val in value.items():
                    update_data[f"{key}.{sub_key}"] = sub_val

        if update_data:
            self._db.collection(self.COLLECTION).document(user_id).update(update_data)

    def delete(self, user_id: str) -> None:
        """Delete a user document."""
        self._db.collection(self.COLLECTION).document(user_id).delete()

    # ── Collection helpers ───────────────────────────────────────────
    def add_to_collection(
        self, user_id: str, tab: str, fragrance_id: str
    ) -> None:
        """Add a fragrance ID to one of the user's collection tabs.

        ``tab`` must be one of ``owned``, ``sampled``, ``wishlist``.
        Uses Firestore ``ArrayUnion`` for an atomic, idempotent append.
        """
        if tab not in self.COLLECTION_TABS:
            raise ValueError(f"Invalid collection tab: {tab!r}")
        self._db.collection(self.COLLECTION).document(user_id).update(
            {f"collection.{tab}": ArrayUnion([fragrance_id])}
        )

    def remove_from_collection(
        self, user_id: str, tab: str, fragrance_id: str
    ) -> None:
        """Remove a fragrance ID from one of the user's collection tabs.

        Uses Firestore ``ArrayRemove`` for an atomic removal.
        """
        if tab not in self.COLLECTION_TABS:
            raise ValueError(f"Invalid collection tab: {tab!r}")
        self._db.collection(self.COLLECTION).document(user_id).update(
            {f"collection.{tab}": ArrayRemove([fragrance_id])}
        )
