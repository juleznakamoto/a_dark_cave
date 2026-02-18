#!/usr/bin/env python3
"""
Create SQLite database for minimal-RAM gender prediction.
Run once before starting the service: python create_db.py

Schema: (name TEXT PK, gender TEXT NOT NULL, rank REAL NOT NULL)
- gender: 'm' or 'f'
- rank: weighted avg popularity (lower = more popular). Indexed for ORDER BY rank.

Filtering:
- Multi-word names (2+ words) are excluded.
- Names with no rank data are excluded.
- Bottom 20% of names by weighted avg_rank are excluded (top 80% kept).
- Names with ambiguous gender (40-60% male) are included; majority gender is assigned.
- Profane names are excluded (via better-profanity, same approach as leaderboard).
- Names with digits, symbols, 3+ same character in a row, or single char are excluded.

Base DB: first_names_base.db is created once from the pickle with profanity applied.
Subsequent runs use the base DB instead of reprocessing the full dataset.
Delete first_names_base.db to force a full rebuild.
"""
import gzip
import pickle
import sqlite3
from collections import defaultdict
from pathlib import Path

import names_dataset
from better_profanity import profanity

BASE_DB = Path(__file__).parent / "first_names_base.db"
OUTPUT_DB = Path(__file__).parent / "first_names.db"


def _is_valid_name(name: str) -> bool:
    """Return False if name has digits, symbols, 3+ repeated chars, or is single char."""
    if len(name) < 2:
        return False
    if any(c.isdigit() for c in name):
        return False
    if not name.isalpha():
        return False
    # No 3+ same character in a row
    run = 1
    for i in range(1, len(name)):
        if name[i] == name[i - 1]:
            run += 1
            if run >= 3:
                return False
        else:
            run = 1
    return True


def _build_base_db(data_path: Path) -> None:
    """Load pickle, apply profanity, save candidates to base DB. Run once."""
    print("Building base DB from pickle (profanity applied)...")
    with gzip.open(data_path, "rb") as f:
        full_data = pickle.load(f)

    profanity.load_censor_words()

    # Compute country weights
    country_weight: dict[str, int] = defaultdict(int)
    for info in full_data.values():
        for country, rank in info.get("rank", {}).items():
            if rank is not None:
                country_weight[country] += 1

    candidates: list[tuple[str, str, float, float]] = []
    skipped_multiword = 0
    skipped_no_data = 0
    skipped_profane = 0

    total_entries = len(full_data)
    for i, (name, info) in enumerate(full_data.items()):
        if i % 10000 == 0:
            print(f"  Processing {i:,}/{total_entries:,} ...", flush=True)

        if ' ' in name:
            skipped_multiword += 1
            continue

        gender = info.get("gender", {})
        if not gender:
            skipped_no_data += 1
            continue
        ranks = info.get("rank", {})
        if not ranks:
            skipped_no_data += 1
            continue

        if profanity.contains_profanity(name):
            skipped_profane += 1
            continue

        total_weight = 0.0
        weighted_sum = 0.0
        for country, rank in ranks.items():
            if rank is None:
                continue
            w = country_weight.get(country, 0)
            if w > 0:
                weighted_sum += rank * w
                total_weight += w

        if total_weight == 0:
            skipped_no_data += 1
            continue

        avg_rank = weighted_sum / total_weight

        m = float(gender.get("M", 0) or 0)
        f = float(gender.get("F", 0) or 0)
        total = m + f
        if total == 0:
            skipped_no_data += 1
            continue
        male_prob = m / total

        gender_char = 'm' if male_prob >= 0.5 else 'f'
        candidates.append((name, gender_char, male_prob, avg_rank))

    print(f"  Total valid: {len(candidates):,}")
    print(f"  Skipped (multi-word): {skipped_multiword:,}")
    print(f"  Skipped (no gender/rank): {skipped_no_data:,}")
    print(f"  Skipped (profane): {skipped_profane:,}")

    BASE_DB.unlink(missing_ok=True)
    conn = sqlite3.connect(str(BASE_DB))
    conn.execute("""
        CREATE TABLE candidates (
            name TEXT PRIMARY KEY,
            gender TEXT NOT NULL,
            avg_rank REAL NOT NULL
        )
    """)
    for name, gender_char, _, avg_rank in candidates:
        conn.execute(
            "INSERT INTO candidates (name, gender, avg_rank) VALUES (?, ?, ?)",
            (name, gender_char, avg_rank),
        )
    conn.commit()
    conn.close()
    print(f"Created {BASE_DB}")


def _load_candidates_from_base() -> list[tuple[str, str, float, float]]:
    """Load candidates from base DB. Returns (name, gender_char, male_prob, avg_rank)."""
    conn = sqlite3.connect(str(BASE_DB))
    rows = conn.execute("SELECT name, gender, avg_rank FROM candidates").fetchall()
    conn.close()
    # male_prob not stored in base; use 0 for compatibility
    return [(r[0], r[1], 0.0, r[2]) for r in rows]


def main():
    pkg_path = Path(names_dataset.__file__).parent
    data_path = pkg_path / "v3" / "first_names.pkl.gz"
    if not data_path.exists():
        print(f"Error: {data_path} not found. Is names-dataset installed from the gender-detector repo?")
        return 1

    # Use base DB if it exists; otherwise build it from pickle
    if not BASE_DB.exists():
        _build_base_db(data_path)
    else:
        print(f"Using existing base DB: {BASE_DB}")

    print("Loading candidates from base DB...")
    candidates = _load_candidates_from_base()

    # Apply name validation (no digits, symbols, 3+ repeated chars, single char)
    validated: list[tuple[str, str, float, float]] = []
    skipped_invalid = 0
    for item in candidates:
        if _is_valid_name(item[0]):
            validated.append(item)
        else:
            skipped_invalid += 1

    print(f"  After validation: {len(validated):,} (skipped {skipped_invalid:,})")

    # Sort by avg_rank and cut bottom 20% (keep top 80%)
    validated.sort(key=lambda x: x[3])
    cutoff_idx = int(len(validated) * 0.80)
    kept = validated[:cutoff_idx]
    filtered_rank = validated[cutoff_idx:]

    print(f"  Keeping top 80%: {len(kept):,}")
    print(f"  Filtered (bottom 20% rank): {len(filtered_rank):,}")

    # Write final DB
    OUTPUT_DB.unlink(missing_ok=True)
    conn = sqlite3.connect(str(OUTPUT_DB))
    conn.execute("""
        CREATE TABLE names (
            name TEXT PRIMARY KEY,
            gender TEXT NOT NULL,
            rank REAL NOT NULL
        )
    """)

    for name, gender_char, _, avg_rank in kept:
        conn.execute(
            "INSERT INTO names (name, gender, rank) VALUES (?, ?, ?)",
            (name, gender_char, avg_rank),
        )

    conn.execute("CREATE INDEX idx_names_rank ON names(rank)")
    conn.commit()
    conn.close()

    size_mb = OUTPUT_DB.stat().st_size / (1024 * 1024)
    male_count = sum(1 for _, g, _, _ in kept if g == 'm')
    female_count = len(kept) - male_count
    print(f"\nCreated {OUTPUT_DB} ({size_mb:.1f} MB, {len(kept):,} names)")
    print(f"  Male: {male_count:,}  Female: {female_count:,}")

    # Spot checks
    print(f"\nSpot checks:")
    conn = sqlite3.connect(str(OUTPUT_DB))
    for n in ["John", "Maria", "Anna", "Philippe", "Fabian", "Bauer", "Smith", "Mueller", "Schmidt", "Kim", "Alex"]:
        row = conn.execute("SELECT gender FROM names WHERE name = ?", (n,)).fetchone()
        if row:
            print(f"  {n:12s}  {row[0]}")
        else:
            print(f"  {n:12s}  FILTERED OUT")
    conn.close()

    return 0


if __name__ == "__main__":
    exit(main())
