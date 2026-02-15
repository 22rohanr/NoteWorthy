#!/usr/bin/env python3
"""
seed_database.py – Two-mode data-ingestion script for Firestore.

Usage (run from the backend/ directory):
    python -m scripts.seed_database --download                 # fetch all 10 brands
    python -m scripts.seed_database --download --max-calls 1   # safe test run (1 brand)
    python -m scripts.seed_database --upload                   # cache → Firestore

Mode 1 (--download):
    Calls the Fragella API once per brand in the BRANDS list, saving the
    combined raw JSON to scripts/fragella_raw_dump.json.  A hard --max-calls
    ceiling prevents accidental quota exhaustion.  Firestore is NEVER touched.

Mode 2 (--upload):
    Reads scripts/fragella_raw_dump.json (no HTTP requests), transforms each
    record to match the Firestore document shapes expected by our service
    classes, and writes everything in batched commits (≤400 ops per batch).

CRITICAL: The Fragella free tier has a strict call limit.  The --download
mode keeps a running call counter and will abort before exceeding --max-calls.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# ---------------------------------------------------------------------------
#  Path setup
# ---------------------------------------------------------------------------

# This script lives in  backend/scripts/
# The backend root is one level up.
_SCRIPT_DIR = Path(__file__).resolve().parent          # backend/scripts/
_BACKEND_ROOT = _SCRIPT_DIR.parent                     # backend/

# Ensure the backend root is on sys.path so we can import database, config, etc.
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

# Load .env from the backend root
load_dotenv(_BACKEND_ROOT / ".env")

# ---------------------------------------------------------------------------
#  Constants
# ---------------------------------------------------------------------------

# Fragella API
FRAGELLA_BASE_URL = "https://api.fragella.com/api/v1"

# Cache file lives alongside this script in the scripts/ folder
CACHE_FILE = _SCRIPT_DIR / "fragella_raw_dump.json"

# 10 popular designer / niche houses – one API call each.
# Uses 10 of the 20 free-tier calls, leaving 10 in reserve.
BRANDS = [
    "Dior",
    "Chanel",
    "Tom Ford",
    "Creed",
    "Versace",
    "YSL",
    "Le Labo",
    "Maison Francis Kurkdjian",
    "Prada",
    "Guerlain",
]

# ---------------------------------------------------------------------------
#  Field-mapping helpers
# ---------------------------------------------------------------------------

# OilType → our concentration enum
CONCENTRATION_MAP: dict[str, str] = {
    "eau de parfum": "EDP",
    "eau de toilette": "EDT",
    "extrait": "Parfum",
    "extrait de parfum": "Parfum",
    "parfum": "Parfum",
    "eau de cologne": "EDC",
    "cologne": "Cologne",
}

# Gender string → our gender enum
GENDER_MAP: dict[str, str] = {
    "women": "Feminine",
    "woman": "Feminine",
    "female": "Feminine",
    "men": "Masculine",
    "man": "Masculine",
    "male": "Masculine",
    "unisex": "Unisex",
}

# Descriptive longevity → numeric score (0-10)
LONGEVITY_MAP: dict[str, float] = {
    "poor": 2.0,
    "weak": 3.0,
    "moderate": 5.0,
    "long lasting": 8.0,
    "very long lasting": 10.0,
}

# Descriptive sillage → numeric score (0-10)
SILLAGE_MAP: dict[str, float] = {
    "intimate": 2.0,
    "soft": 3.0,
    "moderate": 5.0,
    "strong": 8.0,
    "enormous": 10.0,
}

# Price value sentiment → numeric score (0-10)
PRICE_VALUE_MAP: dict[str, float] = {
    "overpriced": 3.0,
    "okay": 5.0,
    "good_value": 8.0,
    "unknown": 5.0,
}

# ── Note-name → olfactory family mapping ─────────────────────────────
# Covers the most common fragrance notes.  Unknown notes get family=None.
NOTE_FAMILY_MAP: dict[str, str] = {
    # Citrus
    "bergamot": "Citrus", "lemon": "Citrus", "lime": "Citrus",
    "orange": "Citrus", "mandarin orange": "Citrus", "mandarin": "Citrus",
    "grapefruit": "Citrus", "yuzu": "Citrus", "bitter orange": "Citrus",
    "blood orange": "Citrus", "tangerine": "Citrus", "citron": "Citrus",
    "petitgrain": "Citrus", "neroli": "Citrus", "sicilian bergamot": "Citrus",
    # Floral
    "rose": "Floral", "jasmine": "Floral", "iris": "Floral",
    "lily": "Floral", "lily of the valley": "Floral", "tuberose": "Floral",
    "peony": "Floral", "ylang-ylang": "Floral", "ylang ylang": "Floral",
    "magnolia": "Floral", "violet": "Floral", "geranium": "Floral",
    "lavender": "Floral", "freesia": "Floral", "orchid": "Floral",
    "honeysuckle": "Floral", "orange blossom": "Floral", "mimosa": "Floral",
    "heliotrope": "Floral", "carnation": "Floral", "plumeria": "Floral",
    # Woody
    "sandalwood": "Woody", "cedar": "Woody", "cedarwood": "Woody",
    "vetiver": "Woody", "oud": "Woody", "agarwood": "Woody",
    "patchouli": "Woody", "birch": "Woody", "guaiac wood": "Woody",
    "oakmoss": "Woody", "driftwood": "Woody", "cypress": "Woody",
    "pine": "Woody", "teak": "Woody", "virginia cedar": "Woody",
    "ambroxan": "Woody", "iso e super": "Woody",
    # Oriental
    "amber": "Oriental", "musk": "Oriental", "incense": "Oriental",
    "myrrh": "Oriental", "frankincense": "Oriental", "benzoin": "Oriental",
    "opoponax": "Oriental", "labdanum": "Oriental", "leather": "Oriental",
    "tobacco": "Oriental", "castoreum": "Oriental", "civet": "Oriental",
    "white musk": "Oriental",
    # Fresh
    "mint": "Fresh", "green tea": "Fresh", "cucumber": "Fresh",
    "water": "Fresh", "sea salt": "Fresh", "ozone": "Fresh",
    "aldehyde": "Fresh", "aldehydes": "Fresh", "hedione": "Fresh",
    "galbanum": "Fresh", "bamboo": "Fresh",
    # Gourmand
    "vanilla": "Gourmand", "caramel": "Gourmand", "chocolate": "Gourmand",
    "coffee": "Gourmand", "cocoa": "Gourmand", "honey": "Gourmand",
    "praline": "Gourmand", "tonka bean": "Gourmand", "almond": "Gourmand",
    "hazelnut": "Gourmand", "coconut": "Gourmand", "rum": "Gourmand",
    # Spicy
    "pepper": "Spicy", "black pepper": "Spicy", "pink pepper": "Spicy",
    "cinnamon": "Spicy", "saffron": "Spicy", "cardamom": "Spicy",
    "clove": "Spicy", "nutmeg": "Spicy", "ginger": "Spicy",
    "cumin": "Spicy", "coriander": "Spicy", "elemi": "Spicy",
    "star anise": "Spicy",
}


def classify_note_family(note_name: str) -> str | None:
    """Return the olfactory family for a note name, or None if unknown."""
    return NOTE_FAMILY_MAP.get(note_name.lower().strip())


def map_concentration(oil_type: str) -> str:
    """Map a Fragella OilType string to our concentration enum."""
    return CONCENTRATION_MAP.get(oil_type.lower().strip(), "EDP")


def map_gender(gender: str) -> str:
    """Map a Fragella Gender string to our gender enum."""
    return GENDER_MAP.get(gender.lower().strip(), "Unisex")


def map_longevity(value: str) -> float:
    """Map a descriptive longevity string to a 0-10 numeric score."""
    return LONGEVITY_MAP.get(value.lower().strip(), 5.0)


def map_sillage(value: str) -> float:
    """Map a descriptive sillage string to a 0-10 numeric score."""
    return SILLAGE_MAP.get(value.lower().strip(), 5.0)


def map_price_value(value: str) -> float:
    """Map a price-value sentiment string to a 0-10 numeric score."""
    return PRICE_VALUE_MAP.get(value.lower().strip(), 5.0)


def build_image_url(raw_url: str) -> str:
    """Swap .jpg → .webp for transparent background (per Fragella docs)."""
    if raw_url.endswith(".jpg"):
        return raw_url[:-4] + ".webp"
    return raw_url


def parse_year(year_str: str) -> int:
    """Safely parse a year string to int; returns 0 on failure."""
    try:
        return int(year_str)
    except (ValueError, TypeError):
        return 0


def parse_price(price_str: str) -> float:
    """Safely parse a price string to float; returns 0.0 on failure."""
    try:
        return float(price_str)
    except (ValueError, TypeError):
        return 0.0


def build_description(accords: list[str]) -> str:
    """Auto-generate a short description from the Main Accords list."""
    if not accords:
        return "A unique and captivating fragrance."
    # Take up to the first 4 accords for a readable sentence
    top = accords[:4]
    if len(top) == 1:
        return f"A {top[0]} fragrance."
    body = ", ".join(top[:-1]) + f" and {top[-1]}"
    return f"A fragrance with {body} accords."


# ======================================================================
#  MODE 1: DOWNLOAD
# ======================================================================

def run_download(max_calls: int) -> None:
    """Fetch fragrances from the Fragella API and save to local cache.

    Makes one GET /brands/:name?limit=50 call per brand, up to
    *max_calls* total.  Results are deduplicated by fragrance Name
    and saved to CACHE_FILE as a JSON array.
    """
    import requests  # imported here so --upload mode never loads it

    api_key = os.getenv("FRAGELLA_API_KEY", "")
    if not api_key:
        print("ERROR: FRAGELLA_API_KEY not found in .env file.")
        sys.exit(1)

    headers = {"x-api-key": api_key}
    call_count = 0
    all_results: list[dict] = []
    seen_names: set[str] = set()  # for deduplication

    print(f"=== DOWNLOAD MODE (max {max_calls} API calls) ===\n")

    for brand in BRANDS:
        # ── Safety: hard ceiling on API calls ────────────────────────
        if call_count >= max_calls:
            print(f"\n>> Reached --max-calls limit ({max_calls}). Stopping.")
            break

        url = f"{FRAGELLA_BASE_URL}/brands/{brand}?limit=50"
        print(f"[{call_count + 1}/{max_calls}] GET {url}")

        try:
            resp = requests.get(url, headers=headers, timeout=30)
            call_count += 1  # count it regardless of status
        except requests.RequestException as exc:
            print(f"  !! Network error: {exc}")
            call_count += 1
            continue

        print(f"  Status: {resp.status_code}")

        if resp.status_code == 404:
            print(f"  Brand '{brand}' not found — skipping.")
            continue
        if resp.status_code == 429:
            print("  !! Rate limit exceeded. Stopping immediately.")
            break
        if resp.status_code != 200:
            print(f"  !! Unexpected status {resp.status_code} — skipping.")
            continue

        # Parse response (should be a JSON array of fragrance objects)
        try:
            data = resp.json()
        except json.JSONDecodeError:
            print("  !! Failed to parse JSON — skipping.")
            continue

        if not isinstance(data, list):
            data = [data]

        # Deduplicate by fragrance Name
        new_count = 0
        for item in data:
            name = item.get("Name", "")
            if name and name not in seen_names:
                seen_names.add(name)
                all_results.append(item)
                new_count += 1

        print(f"  Received {len(data)} items, {new_count} new (after dedup)")

    # ── Save to cache file ───────────────────────────────────────────
    CACHE_FILE.write_text(json.dumps(all_results, indent=2, ensure_ascii=False))

    print(f"\n=== DOWNLOAD COMPLETE ===")
    print(f"API calls made  : {call_count}")
    print(f"Total fragrances: {len(all_results)} (deduplicated)")
    print(f"Saved to         : {CACHE_FILE}")


# ======================================================================
#  MODE 2: UPLOAD
# ======================================================================

def run_upload() -> None:
    """Load cached JSON and write brands, notes, and fragrances to Firestore.

    Uses batched writes (≤400 operations per batch) to stay safely under
    the Firestore limit of 500 operations per commit.
    """
    # ── Load cache ───────────────────────────────────────────────────
    if not CACHE_FILE.exists():
        print(f"ERROR: Cache file not found at {CACHE_FILE}")
        print("Run  python -m scripts.seed_database --download  first.")
        sys.exit(1)

    raw = json.loads(CACHE_FILE.read_text())
    if not isinstance(raw, list):
        print("ERROR: Expected a JSON array in cache file.")
        sys.exit(1)

    print(f"=== UPLOAD MODE ===")
    print(f"Loaded {len(raw)} fragrance records from cache.\n")

    # ── Connect to Firestore ─────────────────────────────────────────
    from database import get_db
    db = get_db()

    # ==================================================================
    #  PHASE A: Create Brand documents
    # ==================================================================
    print("Phase A: Creating brand documents...")

    # Extract unique brands from the raw data
    unique_brands: dict[str, dict] = {}  # brand_name → {name, country}
    for item in raw:
        brand_name = item.get("Brand", "").strip()
        if brand_name and brand_name not in unique_brands:
            unique_brands[brand_name] = {
                "name": brand_name,
                "country": item.get("Country", "").strip() or "Unknown",
                "foundedYear": None,  # not available from the API
            }

    brand_id_map: dict[str, str] = {}  # brand_name → Firestore doc ID
    _batch_create(db, "brands", list(unique_brands.values()), brand_id_map, key_field="name")

    print(f"  Created {len(brand_id_map)} brands.\n")

    # ==================================================================
    #  PHASE B: Create Note documents
    # ==================================================================
    print("Phase B: Creating note documents...")

    # Extract every unique note name from Top / Middle / Base across
    # all fragrances.
    unique_notes: dict[str, dict] = {}  # note_name → {name, family}
    for item in raw:
        notes_obj = item.get("Notes", {})
        for layer in ("Top", "Middle", "Base"):
            for note in notes_obj.get(layer, []):
                note_name = note.get("name", "").strip()
                if note_name and note_name not in unique_notes:
                    unique_notes[note_name] = {
                        "name": note_name,
                        "family": classify_note_family(note_name),
                    }

    note_id_map: dict[str, str] = {}  # note_name → Firestore doc ID
    _batch_create(db, "notes", list(unique_notes.values()), note_id_map, key_field="name")

    print(f"  Created {len(note_id_map)} notes.\n")

    # ==================================================================
    #  PHASE C: Create Fragrance documents
    # ==================================================================
    print("Phase C: Creating fragrance documents...")

    fragrance_docs: list[dict] = []
    for item in raw:
        frag_doc = _transform_fragrance(item, brand_id_map, note_id_map)
        if frag_doc:
            fragrance_docs.append(frag_doc)

    # We don't need a name→id map for fragrances, so pass a throwaway dict
    _frag_ids: dict[str, str] = {}
    _batch_create(db, "fragrances", fragrance_docs, _frag_ids, key_field="name")

    print(f"  Created {len(fragrance_docs)} fragrances.\n")

    # ── Summary ──────────────────────────────────────────────────────
    print("=== UPLOAD COMPLETE ===")
    print(f"  Brands     : {len(brand_id_map)}")
    print(f"  Notes      : {len(note_id_map)}")
    print(f"  Fragrances : {len(fragrance_docs)}")


# ---------------------------------------------------------------------------
#  Batched-write helper
# ---------------------------------------------------------------------------

BATCH_LIMIT = 400  # stay safely under Firestore's 500-op limit


def _batch_create(
    db,
    collection_name: str,
    documents: list[dict],
    id_map: dict[str, str],
    key_field: str,
) -> None:
    """Write *documents* to a Firestore collection in batched commits.

    After each document is written, ``id_map[doc[key_field]]`` is set
    to the auto-generated Firestore document ID so later phases can
    reference it.

    Documents are chunked into groups of BATCH_LIMIT to stay under
    Firestore's 500-operation-per-commit ceiling.
    """
    for i in range(0, len(documents), BATCH_LIMIT):
        chunk = documents[i : i + BATCH_LIMIT]
        batch = db.batch()

        for doc_data in chunk:
            doc_ref = db.collection(collection_name).document()
            batch.set(doc_ref, doc_data)
            # Record the generated ID for cross-referencing
            key = doc_data.get(key_field, "")
            if key:
                id_map[key] = doc_ref.id

        batch.commit()
        print(f"    Committed batch: {len(chunk)} docs to '{collection_name}'")


# ---------------------------------------------------------------------------
#  Fragrance transformation
# ---------------------------------------------------------------------------

def _transform_fragrance(
    item: dict,
    brand_id_map: dict[str, str],
    note_id_map: dict[str, str],
) -> dict | None:
    """Transform a single Fragella API object into our Firestore shape.

    Returns None if the item has no name (skip junk records).
    """
    name = item.get("Name", "").strip()
    if not name:
        return None

    # ── Brand → brandId ──────────────────────────────────────────────
    brand_name = item.get("Brand", "").strip()
    brand_id = brand_id_map.get(brand_name, "")

    # ── Notes → arrays of note IDs ──────────────────────────────────
    notes_obj = item.get("Notes", {})
    top_ids = _resolve_note_ids(notes_obj.get("Top", []), note_id_map)
    mid_ids = _resolve_note_ids(notes_obj.get("Middle", []), note_id_map)
    base_ids = _resolve_note_ids(notes_obj.get("Base", []), note_id_map)

    # ── Ratings ──────────────────────────────────────────────────────
    # API rating is on a 1-5 scale (string); multiply by 2 for 0-10
    raw_rating = parse_price(item.get("rating", "0"))  # reuse float parser
    overall = round(min(raw_rating * 2, 10.0), 1)

    longevity = map_longevity(item.get("Longevity", ""))
    sillage = map_sillage(item.get("Sillage", ""))
    value = map_price_value(item.get("Price Value", ""))

    # ── Price (optional) ─────────────────────────────────────────────
    raw_price = parse_price(item.get("Price", ""))
    price = None
    if raw_price > 0:
        price = {
            "amount": raw_price,
            "currency": "USD",
            "size": "100ml",  # not provided by API
        }

    # ── Description (auto-generated) ─────────────────────────────────
    accords = item.get("Main Accords", [])
    description = build_description(accords)

    # ── Image URL (.jpg → .webp) ─────────────────────────────────────
    image_url = build_image_url(item.get("Image URL", ""))

    return {
        "name": name,
        "brandId": brand_id,
        "releaseYear": parse_year(item.get("Year", "")),
        "concentration": map_concentration(item.get("OilType", "")),
        "gender": map_gender(item.get("Gender", "")),
        "description": description,
        "perfumer": None,  # not available from the API
        "imageUrl": image_url,
        "notes": {
            "top": top_ids,
            "middle": mid_ids,
            "base": base_ids,
        },
        "ratings": {
            "overall": overall,
            "longevity": longevity,
            "sillage": sillage,
            "value": value,
            "reviewCount": 0,  # not available from the API
        },
        "price": price,
    }


def _resolve_note_ids(notes_list: list, note_id_map: dict[str, str]) -> list[str]:
    """Convert a list of {name, imageUrl} note dicts to Firestore note IDs."""
    ids: list[str] = []
    for note in notes_list:
        note_name = note.get("name", "").strip() if isinstance(note, dict) else ""
        note_id = note_id_map.get(note_name, "")
        if note_id:
            ids.append(note_id)
    return ids


# ======================================================================
#  CLI
# ======================================================================

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed the Firestore database from the Fragella API.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples (run from backend/):\n"
            "  python -m scripts.seed_database --download                # fetch all 10 brands\n"
            "  python -m scripts.seed_database --download --max-calls 1  # test with 1 brand\n"
            "  python -m scripts.seed_database --upload                  # cache → Firestore\n"
        ),
    )

    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--download",
        action="store_true",
        help="Fetch data from Fragella API and save to local cache.",
    )
    group.add_argument(
        "--upload",
        action="store_true",
        help="Upload cached data to Firestore (no API calls).",
    )

    parser.add_argument(
        "--max-calls",
        type=int,
        default=10,
        help="Maximum number of API calls in download mode (default: 10).",
    )

    args = parser.parse_args()

    if args.download:
        run_download(max_calls=args.max_calls)
    else:
        run_upload()


if __name__ == "__main__":
    main()
