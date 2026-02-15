# Gender Detection Service (Internal Only)

Uses [gender-detector](https://github.com/juleznakamoto/gender-detector) to estimate gender from names.
**SQLite mode only** - ~10-50 MB RAM (no full dataset load).

**Security:**
- Binds to `127.0.0.1` only - never exposed to the internet
- Requires `X-Gender-Service-Token` header - only the Node server has this secret
- Not linked from any public UI

## Setup

**Automatic:** When the Node server starts with `GENDER_SERVICE_URL` and `GENDER_SERVICE_TOKEN` set, it will:
1. Install Python deps (`pip install -r requirements.txt`) if needed
2. Create the SQLite DB (`create_db.py`) if missing
3. Start the gender service

First run may take 1–2 minutes (download + DB creation).

**Manual:** `cd gender-service && pip install -r requirements.txt && python create_db.py`

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

**Automatic:** Start the Node server (`npm run dev`). The gender service starts automatically when configured.

**Manual:** Run `python app.py` in a separate terminal. Runs on `http://127.0.0.1:5001`.
