#!/usr/bin/env python3
"""Unit tests for gender-service name rank caps (Google display name only)."""
import os
import sqlite3
import tempfile
import unittest
from pathlib import Path

import app


def _make_db(path: Path, rows: list[tuple[str, str, float]]) -> None:
    conn = sqlite3.connect(str(path))
    conn.execute(
        "CREATE TABLE names (name TEXT PRIMARY KEY, gender TEXT NOT NULL, rank REAL NOT NULL)"
    )
    for name, gender, rank in rows:
        conn.execute(
            "INSERT INTO names (name, gender, rank) VALUES (?, ?, ?)",
            (name, gender, rank),
        )
    conn.commit()
    conn.close()


class PredictGenderRankCapsTest(unittest.TestCase):
    def setUp(self):
        self._tmpdir = tempfile.TemporaryDirectory()
        self.db_path = Path(self._tmpdir.name) / "names.db"
        _make_db(
            self.db_path,
            [
                ("Popular", "m", 100.0),
                ("Mid", "f", 7000.0),
                ("Obscure", "m", 11000.0),
                ("Robert", "m", 50.0),
                ("Jian-Fong", "m", 8000.0),
                ("Jian", "m", 900.0),
                ("Mary-Jane", "f", 5000.0),
                ("Anne", "f", 200.0),
            ],
        )
        self._env = os.environ.copy()
        os.environ["GENDER_DB_PATH"] = str(self.db_path)
        os.environ["GENDER_NAME_MAX_RANK"] = "10000"

    def tearDown(self):
        os.environ.clear()
        os.environ.update(self._env)
        self._tmpdir.cleanup()

    def test_name_accepts_up_to_name_max_rank(self):
        g, fn = app.predict_gender(name="Mid")
        self.assertEqual((g, fn), ("f", "Mid"))

    def test_name_rejects_above_name_max_rank(self):
        g, fn = app.predict_gender(name="Obscure")
        self.assertEqual((g, fn), (None, None))

    def test_full_name_uses_first_token(self):
        g, fn = app.predict_gender(name="Robert Markowitch")
        self.assertEqual((g, fn), ("m", "Robert"))

    def test_missing_name_returns_none(self):
        g, fn = app.predict_gender(name=None)
        self.assertEqual((g, fn), (None, None))

    def test_email_kwarg_removed(self):
        # Email must not be accepted as a fallback path.
        with self.assertRaises(TypeError):
            app.predict_gender(name="Obscure", email="popular@example.com")  # type: ignore[call-arg]

    def test_hyphenated_prefers_full_token(self):
        g, fn = app.predict_gender(name="Jian-Fong Yu")
        self.assertEqual((g, fn), ("m", "Jian-Fong"))

    def test_hyphenated_falls_back_to_head(self):
        # Compound not in DB; head segment is.
        g, fn = app.predict_gender(name="Anne-Sophie Dupont")
        self.assertEqual((g, fn), ("f", "Anne"))

    def test_hyphenated_full_token_alone(self):
        g, fn = app.predict_gender(name="Mary-Jane")
        self.assertEqual((g, fn), ("f", "Mary-Jane"))

    def test_first_name_candidates_order(self):
        self.assertEqual(
            app._first_name_candidates("Jian-Fong Yu"),
            ["Jian-Fong", "Jian"],
        )
        self.assertEqual(app._first_name_candidates("Robert Markowitch"), ["Robert"])


if __name__ == "__main__":
    unittest.main()
