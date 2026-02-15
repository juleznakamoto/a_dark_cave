# Gender Detection Service (Internal Only)

Uses [gender-detector](https://github.com/juleznakamoto/gender-detector) to estimate gender from names.
**SQLite mode only** - ~10-50 MB RAM (no full dataset load).

**Security:**
- Binds to `127.0.0.1` only - never exposed to the internet
- Requires `X-Gender-Service-Token` header - only the Node server has this secret
- Not linked from any public UI

## Setup

```bash
cd gender-service
python -m venv venv
venv\Scripts\activate   # Windows
# or: source venv/bin/activate  # Unix
pip install -r requirements.txt
python create_db.py     # Create SQLite DB (run once)
```

Set environment variables (match `GENDER_SERVICE_TOKEN` in your main app's `.env`):

```bash
set GENDER_SERVICE_TOKEN=your-secret-token
```

**Main app `.env`** (server) - add these for the Node server to call the Python service:

```
GENDER_SERVICE_URL=http://127.0.0.1:5001
GENDER_SERVICE_TOKEN=your-secret-token
```

## Run

```bash
python app.py
```

Runs on `http://127.0.0.1:5001`. The Node server calls this internally when needed.
