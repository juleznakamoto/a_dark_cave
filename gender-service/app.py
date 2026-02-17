"""
Internal gender detection service using gender-detector (names-dataset).
SQLite mode only - ~10-50 MB RAM (no full dataset load).
Binds to 127.0.0.1 only - NOT exposed to the internet.
Requires X-Gender-Service-Token header - only the Node server knows this secret.
"""
import os
from pathlib import Path

from flask import Flask, request, jsonify

app = Flask(__name__)


def get_db_path() -> Path | None:
    path = os.environ.get("GENDER_DB_PATH")
    if path:
        return Path(path)
    return Path(__file__).parent / "first_names.db"


def predict_gender(name: str | None = None, email: str | None = None) -> tuple[str | None, str | None]:
    """Returns (g, first_name) or (None, None). g is 'm' or 'f'. Uses SQLite only.
    Tries name first; if no result and email exists, falls back to email."""
    db_path = get_db_path()
    if not db_path or not db_path.exists():
        return (None, None)

    from names_dataset.gender_predictor import predict_gender as _predict

    result = _predict(name=name, email=email, db_path=db_path)
    if result is None and name and email:
        result = _predict(name=None, email=email, db_path=db_path)
    if not result:
        return (None, None)
    gender = result.get("gender")
    first_name = result.get("first_name")
    g = "m" if gender == "Male" else "f" if gender == "Female" else None
    return (g, first_name)


@app.before_request
def require_token():
    token = os.environ.get("GENDER_SERVICE_TOKEN")
    if not token:
        return jsonify({"error": "Service not configured"}), 503
    provided = request.headers.get("X-Gender-Service-Token")
    if provided != token:
        return jsonify({"error": "Unauthorized"}), 401


@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(silent=True) or {}
    name = data.get("name")
    email = data.get("email")
    if (not name or not str(name).strip()) and (not email or not str(email).strip()):
        return jsonify({"error": "name or email required"}), 400

    try:
        g, first_name = predict_gender(
            name=str(name).strip() if name else None,
            email=str(email).strip() if email else None,
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Prediction failed", "detail": str(e)}), 500

    if g is None:
        return jsonify({"error": "Could not predict gender"}), 200
    return jsonify({"g": g, "fn": first_name})


@app.route("/health", methods=["GET"])
def health():
    db_path = get_db_path()
    return jsonify({
        "status": "ok",
        "db_exists": db_path.exists() if db_path else False,
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
