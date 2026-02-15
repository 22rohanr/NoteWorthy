"""
Application configuration loaded from environment variables.

Place a .env file in the backend/ directory with the keys below.
python-dotenv will load it automatically when config is imported.
"""

import os
from dotenv import load_dotenv

# Load .env file from the same directory as this module
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))


class Config:
    """Central configuration pulled from environment variables."""

    # Flask
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production")
    DEBUG: bool = os.getenv("FLASK_DEBUG", "false").lower() in ("1", "true", "yes")
    HOST: str = os.getenv("FLASK_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("FLASK_PORT", "5000"))

    # CORS – comma-separated list of allowed origins (default: allow all)
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*")

    # Firebase
    FIREBASE_KEY_PATH: str = os.getenv(
        "FIREBASE_KEY_PATH",
        os.path.join(os.path.dirname(__file__), "firebase-private-key.json"),
    )
