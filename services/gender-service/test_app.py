#!/usr/bin/env python3
"""Unit tests for gender-service rank caps."""
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
            ],
        )
        self._env = os.environ.copy()
        os.environ["GENDER_DB_PATH"] = str(self.db_path)
        os.environ["GENDER_EMAIL_MAX_RANK"] = "5000"
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

    def test_email_accepts_up_to_email_max_rank(self):
        g, fn = app.predict_gender(email="popular@example.com")
        self.assertEqual((g, fn), ("m", "Popular"))

    def test_email_rejects_above_email_max_rank(self):
        g, fn = app.predict_gender(email="mid.user@example.com")
        self.assertEqual((g, fn), (None, None))

    def test_falls_back_to_email_when_name_rank_too_high(self):
        g, fn = app.predict_gender(name="Obscure", email="popular@example.com")
        self.assertEqual((g, fn), ("m", "Popular"))


if __name__ == "__main__":
    unittest.main()
