"""
Internal gender detection service.
Uses SQLite DB (name, gender) created by create_db.py - ~10-50 MB RAM.
Binds to 127.0.0.1 only - NOT exposed to the internet.
Requires X-Gender-Service-Token header - only the Node server knows this secret.
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


def _extract_first_name(full_name: str | None) -> str | None:
    """Extract first name from full name (e.g. 'Robert Markowitch' -> 'Robert')."""
    if not full_name or not full_name.strip():
        return None
    first = full_name.strip().split()[0]
    return first if first else None


def _extract_first_name_from_email(email: str | None) -> str | None:
    """Simple email parsing: take longest alpha part before @."""
    if not email or "@" not in email:
        return None
    prefix = email.split("@")[0]
    for sep in ".", "_", "-":
        if sep in prefix:
            parts = ["".join(c for c in p if c.isalpha()) for p in prefix.split(sep)]
            parts = [p for p in parts if len(p) > 1]
            if parts:
                return max(parts, key=len)
    cleaned = "".join(c for c in prefix if c.isalpha())
    return cleaned if len(cleaned) > 1 else None


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


def predict_gender(name: str | None = None, email: str | None = None) -> tuple[str | None, str | None]:
    """Returns (g, first_name) or (None, None). g is 'm' or 'f'.
    Tries name first; if no result and email exists, falls back to email."""
    db_path = get_db_path()
    if not db_path:
        raise ValueError("GENDER_DB_PATH not set and default path unavailable")
    if not db_path.exists():
        raise FileNotFoundError(
            f"Gender DB not found at {db_path}. Run: cd gender-service && python create_db.py"
        )

    first_name = _extract_first_name(name) if name else None
    if first_name:
        g = _lookup(db_path, first_name)
        if g:
            return (g, first_name.title())

    if email:
        first_name = _extract_first_name_from_email(email)
        if first_name:
            g = _lookup(db_path, first_name)
            if g:
                return (g, first_name.title())

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
    email = data.get("email")
    if (not name or not str(name).strip()) and (not email or not str(email).strip()):
        return jsonify({
            "error": "name or email required",
            "hint": "Provide at least one of {name, email} in JSON body",
        }), 400

    try:
        g, first_name = predict_gender(
            name=str(name).strip() if name else None,
            email=str(email).strip() if email else None,
        )
    except FileNotFoundError as e:
        logger.error("%s", e)
        return jsonify({
            "error": "Gender DB not found",
            "detail": str(e),
            "hint": "Run: cd gender-service && python create_db.py",
        }), 503
    except sqlite3.OperationalError as e:
        logger.error("DB schema error: %s", e)
        return jsonify({
            "error": "Gender DB schema invalid",
            "detail": str(e),
            "hint": "Regenerate DB: cd gender-service && python create_db.py",
        }), 500
    except Exception as e:
        import traceback
        logger.exception("Prediction failed: %s", e)
        return jsonify({
            "error": "Prediction failed",
            "detail": str(e),
            "type": type(e).__name__,
        }), 500

    if g is None:
        return jsonify({
            "error": "Could not predict gender",
            "hint": "Name not in database (try different name/email or add to create_db)",
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
        "hint": "Run: cd gender-service && python create_db.py" if not db_exists else None,
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
