"""
Internal gender detection service.
Uses SQLite DB (name, gender, rank) created by create_db.py - ~10-50 MB RAM.
Binds to 127.0.0.1 only - NOT exposed to the internet.
Requires X-Gender-Service-Token header - only the Node server knows this secret.

Name source: Google account display name only (passed by Node). Email is not used.
"""
import logging
import os
import sqlite3
from pathlib import Path

from flask import Flask, request, jsonify

app = Flask(__name__)
logger = logging.getLogger(__name__)


def get_db_path() -> Path | None:
    path = os.environ.get("GENDER_DB_PATH")
    if path:
        return Path(path)
    return Path(__file__).parent / "first_names.db"


def _name_max_rank() -> float:
    return float(os.environ.get("GENDER_NAME_MAX_RANK", "10000"))


def _extract_first_name(full_name: str | None) -> str | None:
    """Extract first whitespace token (e.g. 'Robert Markowitch' -> 'Robert')."""
    if not full_name or not full_name.strip():
        return None
    first = full_name.strip().split()[0]
    return first if first else None


def _first_name_candidates(full_name: str | None) -> list[str]:
    """Ordered lookup candidates for a display name's given name.

    Prefer the full first token (including hyphens), then fall back to the
    segment before the first hyphen: 'Jian-Fong Yu' -> ['Jian-Fong', 'Jian'].
    """
    first = _extract_first_name(full_name)
    if not first:
        return []
    candidates = [first]
    if "-" in first:
        head = first.split("-", 1)[0].strip()
        if head and head.lower() != first.lower():
            candidates.append(head)
    return candidates


def _lookup_rank(db_path: Path, first_name: str) -> float | None:
    """Look up name in DB. Returns rank if found and gender valid, else None."""
    if not first_name:
        return None
    first_name = first_name.strip().title()
    try:
        conn = sqlite3.connect(str(db_path))
        row = conn.execute(
            "SELECT gender, rank FROM names WHERE name = ?", (first_name,)
        ).fetchone()
        conn.close()
        if row and row[0] in ("m", "f"):
            return float(row[1]) if row[1] is not None else float("inf")
    except sqlite3.OperationalError:
        # Old schema without rank: fall back to gender-only lookup
        try:
            conn = sqlite3.connect(str(db_path))
            row = conn.execute("SELECT gender FROM names WHERE name = ?", (first_name,)).fetchone()
            conn.close()
            if row and row[0] in ("m", "f"):
                return 0.0  # Treat as best rank when rank column missing
        except sqlite3.OperationalError:
            pass
    return None


def _lookup(db_path: Path, first_name: str) -> str | None:
    """Look up gender in DB. Returns 'm', 'f', or None."""
    if not first_name:
        return None
    first_name = first_name.strip().title()
    try:
        conn = sqlite3.connect(str(db_path))
        row = conn.execute("SELECT gender FROM names WHERE name = ?", (first_name,)).fetchone()
        conn.close()
        return row[0] if row and row[0] in ("m", "f") else None
    except sqlite3.OperationalError as e:
        logger.error("Gender DB lookup failed (wrong schema? run create_db.py): %s", e)
        raise


def _accept_match(
    db_path: Path, first_name: str, max_rank: float
) -> tuple[str | None, str | None]:
    """Return (g, first_name) when name is in DB and rank <= max_rank."""
    rank = _lookup_rank(db_path, first_name)
    if rank is None or rank > max_rank:
        return (None, None)
    g = _lookup(db_path, first_name)
    if not g:
        return (None, None)
    return (g, first_name.strip().title())


def predict_gender(name: str | None = None) -> tuple[str | None, str | None]:
    """Returns (g, first_name) or (None, None). g is 'm' or 'f'.
    Expects a Google account display name (or any explicit full/given name)."""
    db_path = get_db_path()
    if not db_path:
        raise ValueError("GENDER_DB_PATH not set and default path unavailable")
    if not db_path.exists():
        raise FileNotFoundError(
            f"Gender DB not found at {db_path}. Run: cd services/gender-service && python create_db.py"
        )

    max_rank = _name_max_rank()
    for candidate in _first_name_candidates(name):
        result = _accept_match(db_path, candidate, max_rank)
        if result[0]:
            return result

    return (None, None)


@app.before_request
def require_token():
    token = os.environ.get("GENDER_SERVICE_TOKEN")
    if not token:
        return jsonify({
            "error": "Service not configured",
            "hint": "Set GENDER_SERVICE_TOKEN in environment (must match Node server)",
        }), 503
    provided = request.headers.get("X-Gender-Service-Token")
    if provided != token:
        return jsonify({
            "error": "Unauthorized",
            "hint": "X-Gender-Service-Token must match GENDER_SERVICE_TOKEN",
        }), 401


@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(silent=True) or {}
    name = data.get("name")
    if not name or not str(name).strip():
        return jsonify({
            "error": "name required",
            "hint": "Provide {name} from Google account display name",
        }), 400

    try:
        g, first_name = predict_gender(name=str(name).strip())
    except FileNotFoundError as e:
        logger.error("%s", e)
        return jsonify({
            "error": "Gender DB not found",
            "detail": str(e),
            "hint": "Run: cd services/gender-service && python create_db.py",
        }), 503
    except sqlite3.OperationalError as e:
        logger.error("DB schema error: %s", e)
        return jsonify({
            "error": "Gender DB schema invalid",
            "detail": str(e),
            "hint": "Regenerate DB: cd services/gender-service && python create_db.py",
        }), 500
    except Exception as e:
        logger.exception("Prediction failed: %s", e)
        return jsonify({
            "error": "Prediction failed",
            "detail": str(e),
            "type": type(e).__name__,
        }), 500

    if g is None:
        return jsonify({
            "error": "Could not predict gender",
            "hint": "Name not in database (try different name or add to create_db)",
        }), 200
    return jsonify({"g": g, "fn": first_name})


@app.route("/health", methods=["GET"])
def health():
    db_path = get_db_path()
    db_exists = db_path and db_path.exists()
    return jsonify({
        "status": "ok",
        "db_exists": db_exists,
        "db_path": str(db_path) if db_path else None,
        "hint": "Run: cd services/gender-service && python create_db.py" if not db_exists else None,
    })


if __name__ == "__main__":
    db_path = get_db_path()
    if not db_path or not db_path.exists():
        print(f"Error: SQLite DB not found at {db_path}")
        print("Run: python create_db.py")
        exit(1)

    host = "127.0.0.1"
    port = int(os.environ.get("GENDER_SERVICE_PORT", "5001"))
    app.run(host=host, port=port, debug=False)
