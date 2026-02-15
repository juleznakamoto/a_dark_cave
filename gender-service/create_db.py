#!/usr/bin/env python3
"""
Create SQLite database for minimal-RAM gender prediction (~10-50 MB).
Run once before starting the service: python create_db.py
"""
import gzip
import pickle
import sqlite3
from pathlib import Path

import names_dataset


def main():
    pkg_path = Path(names_dataset.__file__).parent
    data_path = pkg_path / "v3" / "first_names.pkl.gz"
    if not data_path.exists():
        print(f"Error: {data_path} not found. Is names-dataset installed from the gender-detector repo?")
        return 1

    output = Path(__file__).parent / "first_names.db"
    print("Loading dataset...")
    with gzip.open(data_path, "rb") as f:
        full_data = pickle.load(f)

    output.unlink(missing_ok=True)
    conn = sqlite3.connect(str(output))
    conn.execute("""
        CREATE TABLE names (
            name TEXT PRIMARY KEY,
            male_prob REAL NOT NULL,
            female_prob REAL NOT NULL,
            countries TEXT NOT NULL
        )
    """)
    conn.execute("CREATE INDEX idx_names_name ON names(name)")

    inserted = 0
    for name, info in full_data.items():
        gender = info.get("gender", {})
        if not gender:
            continue
        m = float(gender.get("M", 0) or 0)
        f_val = float(gender.get("F", 0) or 0)
        countries = list(info.get("country", {}).keys())
        if not countries:
            continue
        countries_str = ",".join(sorted(countries))
        conn.execute(
            "INSERT INTO names (name, male_prob, female_prob, countries) VALUES (?, ?, ?, ?)",
            (name, m, f_val, countries_str),
        )
        inserted += 1

    conn.commit()
    conn.close()
    size_mb = output.stat().st_size / (1024 * 1024)
    print(f"Created {output} ({size_mb:.1f} MB, {inserted} names)")
    return 0


if __name__ == "__main__":
    exit(main())
