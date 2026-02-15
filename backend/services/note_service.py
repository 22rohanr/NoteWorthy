"""
NoteService – Firestore CRUD for the ``notes`` collection.

Document shape (matches frontend ``Note`` interface):
    {
        "name":   str,
        "family": str | None,   # one of Citrus | Floral | Woody | Oriental
                                #        Fresh  | Gourmand | Spicy
    }

The ``id`` field is the Firestore document ID and is injected on read.
"""

from database import get_db


class NoteService:
    """Encapsulates all Firestore operations for fragrance notes."""

    COLLECTION = "notes"

    VALID_FAMILIES = frozenset(
        ["Citrus", "Floral", "Woody", "Oriental", "Fresh", "Gourmand", "Spicy"]
    )

    def __init__(self):
        self._db = get_db()

    # ── helpers ───────────────────────────────────────────────────────
    def _doc_to_dict(self, doc) -> dict:
        """Convert a Firestore DocumentSnapshot to a frontend-shaped dict."""
        data = doc.to_dict()
        return {
            "id": doc.id,
            "name": data.get("name", ""),
            "family": data.get("family"),
        }

    # ── Read ─────────────────────────────────────────────────────────
    def get_all(self) -> list[dict]:
        """Return every note document."""
        docs = self._db.collection(self.COLLECTION).stream()
        return [self._doc_to_dict(doc) for doc in docs]

    def get_by_id(self, note_id: str) -> dict | None:
        """Return a single note by document ID, or ``None``."""
        doc = self._db.collection(self.COLLECTION).document(note_id).get()
        if doc.exists:
            return self._doc_to_dict(doc)
        return None

    def get_by_family(self, family: str) -> list[dict]:
        """Return all notes belonging to a given olfactory family.

        Supports the Ingredient Explorer page which groups notes by family.
        """
        docs = (
            self._db.collection(self.COLLECTION)
            .where("family", "==", family)
            .stream()
        )
        return [self._doc_to_dict(doc) for doc in docs]

    def get_many(self, note_ids: list[str]) -> dict[str, dict]:
        """Batch-fetch multiple notes by ID.

        Returns a mapping of ``{note_id: note_dict}`` for efficient
        resolution inside FragranceService.  Missing IDs are silently
        skipped.
        """
        if not note_ids:
            return {}

        result: dict[str, dict] = {}
        # Firestore ``in`` queries support up to 30 items per call.
        for i in range(0, len(note_ids), 30):
            batch_ids = note_ids[i : i + 30]
            docs = (
                self._db.collection(self.COLLECTION)
                .where("__name__", "in", batch_ids)
                .stream()
            )
            for doc in docs:
                result[doc.id] = self._doc_to_dict(doc)
        return result

    # ── Write ────────────────────────────────────────────────────────
    def create(self, data: dict) -> str:
        """Create a new note document and return its ID.

        Accepts a dict with keys: ``name``, ``family`` (optional).
        """
        doc_data = {
            "name": data["name"],
            "family": data.get("family"),
        }
        _, doc_ref = self._db.collection(self.COLLECTION).add(doc_data)
        return doc_ref.id

    def update(self, note_id: str, data: dict) -> None:
        """Partial-update an existing note document."""
        allowed = {"name", "family"}
        update_data = {k: v for k, v in data.items() if k in allowed}
        if update_data:
            self._db.collection(self.COLLECTION).document(note_id).update(update_data)

    def delete(self, note_id: str) -> None:
        """Delete a note document."""
        self._db.collection(self.COLLECTION).document(note_id).delete()
