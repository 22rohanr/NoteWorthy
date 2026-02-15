"""
Service classes package.

Re-exports every service for convenient imports::

    from services import UserService, BrandService, FragranceService
"""

from services.brand_service import BrandService
from services.fragrance_service import FragranceService
from services.note_service import NoteService
from services.review_service import ReviewService
from services.user_service import UserService

__all__ = [
    "BrandService",
    "FragranceService",
    "NoteService",
    "ReviewService",
    "UserService",
]
