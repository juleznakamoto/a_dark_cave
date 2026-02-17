#!/usr/bin/env python3
"""
Create SQLite database for minimal-RAM gender prediction.
Run once before starting the service: python create_db.py

Schema: (name TEXT PK, gender TEXT NOT NULL)
- gender: 'm' or 'f'

Filtering:
- Multi-word names (2+ words) are excluded.
- Names with no rank data are excluded.
- Bottom 15% of names by weighted avg_rank are excluded.
- Names with ambiguous gender (40-60% male) are excluded.
- Profane names are excluded (via better-profanity, same approach as leaderboard).
"""
import gzip
import pickle
import sqlite3
from collections import defaultdict
from pathlib import Path

import names_dataset
from better_profanity import profanity


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

    # Init profanity filter
    profanity.load_censor_words()

    # Compute country weights = number of ranked entries per country
    print("Computing country weights...")
    country_weight: dict[str, int] = defaultdict(int)
    for info in full_data.values():
        for country, rank in info.get("rank", {}).items():
            if rank is not None:
                country_weight[country] += 1

    # First pass: compute avg_rank + gender for every valid name
    print("Computing weighted average ranks...")
    # (name, gender_char, male_prob, avg_rank)
    candidates: list[tuple[str, str, float, float]] = []
    skipped_multiword = 0
    skipped_no_data = 0
    skipped_ambiguous = 0
    skipped_profane = 0

    total_entries = len(full_data)
    for i, (name, info) in enumerate(full_data.items()):
        if i % 10000 == 0:
            print(f"  Processing {i:,}/{total_entries:,} ...", flush=True)

        # Skip multi-word entries (2+ words)
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

        # Profanity check
        if profanity.contains_profanity(name):
            skipped_profane += 1
            continue

        # Weighted average rank
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

        # Gender probability
        m = float(gender.get("M", 0) or 0)
        f = float(gender.get("F", 0) or 0)
        total = m + f
        if total == 0:
            skipped_no_data += 1
            continue
        male_prob = m / total

        # Skip ambiguous names (40-60% male)
        if 0.4 <= male_prob <= 0.6:
            skipped_ambiguous += 1
            continue

        gender_char = 'm' if male_prob > 0.6 else 'f'
        candidates.append((name, gender_char, male_prob, avg_rank))

    # Sort by avg_rank and cut bottom 15%
    candidates.sort(key=lambda x: x[3])
    cutoff_idx = int(len(candidates) * 0.85)
    kept = candidates[:cutoff_idx]
    filtered_rank = candidates[cutoff_idx:]

    print(f"  Total valid: {len(candidates):,}")
    print(f"  Keeping top 85%: {len(kept):,}")
    print(f"  Filtered (bottom 15% rank): {len(filtered_rank):,}")
    print(f"  Skipped (multi-word): {skipped_multiword:,}")
    print(f"  Skipped (no gender/rank): {skipped_no_data:,}")
    print(f"  Skipped (ambiguous 40-60%): {skipped_ambiguous:,}")
    print(f"  Skipped (profane): {skipped_profane:,}")

    # Write DB
    output.unlink(missing_ok=True)
    conn = sqlite3.connect(str(output))
    conn.execute("""
        CREATE TABLE names (
            name TEXT PRIMARY KEY,
            gender TEXT NOT NULL
        )
    """)

    for name, gender_char, _, _ in kept:
        conn.execute(
            "INSERT INTO names (name, gender) VALUES (?, ?)",
            (name, gender_char),
        )

    conn.execute("CREATE INDEX idx_names_name ON names(name)")
    conn.commit()
    conn.close()

    size_mb = output.stat().st_size / (1024 * 1024)
    male_count = sum(1 for _, g, _, _ in kept if g == 'm')
    female_count = len(kept) - male_count
    print(f"\nCreated {output} ({size_mb:.1f} MB, {len(kept):,} names)")
    print(f"  Male: {male_count:,}  Female: {female_count:,}")

    # Spot checks
    print(f"\nSpot checks:")
    conn = sqlite3.connect(str(output))
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
