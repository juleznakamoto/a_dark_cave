#!/usr/bin/env python3
"""Chrome seam tiles. Unique h/h2/v/v2 vocabularies, not reverse/flip copies.

Madness stages stack: each one keeps the previous features and adds one more.
  0 solid hairline (CSS, no tile)
  1 empty spaces between line runs
  2 + distortion at 50% of max lateral distance, plus a few new gaps
  3 + distortion at 125% or 187.5% per run (+25% vs the old 100/150 step),
    gap debris, plus 25% more new gaps than the usual stage step
  4 + a few slightly larger gaps with 1-5 on-spine ticks (2-10px, 4-10px
    apart) sitting in those holes, plus a few new gaps
No unbroken run longer than 15% of that file's own tile length
(576px on 3840 tiles, 108px on 720 slot tiles).
Gaps between runs are 22-25px so breaks stay visible, except the stage-4
holes that grow just enough to hold a tick cluster.

Rebuild SVGs + mask CSS with no args; `--css-only` skips tiles.
"""

from __future__ import annotations

import hashlib
import math
import sys
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "client" / "src" / "assets" / "chrome"
MASK_CSS = ROOT / "chrome-mask-stages.css"

LENGTH = 3840
COMPACT_LENGTH = 720
MAX_RUN_FRAC = 0.15
MAX_GAP = 25.0
MIN_GAP = 22.0
MASK_KEYS = ("h", "h2", "v", "v2")
CENTER = 5.0
# Compact crop is y=3..7. Full-tile ticks sit farther out; slot clamps to this window.
SLOT_LAT_MIN = 3.0
SLOT_LAT_MAX = 7.0


class Rng:
    def __init__(self, seed: int) -> None:
        self.s = seed & 0xFFFFFFFF

    def u32(self) -> int:
        self.s = (self.s * 1664525 + 1013904223) & 0xFFFFFFFF
        return self.s

    def unit(self) -> float:
        return self.u32() / 4294967296.0

    def spanned(self, a: float, b: float) -> float:
        return a + (b - a) * self.unit()

    def chance(self, p: float) -> bool:
        return self.unit() < p

    def sign(self) -> float:
        return -1.0 if self.u32() & 1 else 1.0

    def pick_span(
        self,
        bands: tuple[tuple[float, float], ...],
        weights: tuple[float, ...],
    ) -> float:
        u = self.unit()
        acc = 0.0
        for (lo, hi), weight in zip(bands, weights):
            acc += weight
            if u < acc:
                return self.spanned(lo, hi)
        lo, hi = bands[-1]
        return self.spanned(lo, hi)


@dataclass
class Poly:
    pts: list[tuple[float, float]]
    cap: str = "butt"


@dataclass
class Motif:
    spine: list[list[tuple[float, float]]] = field(default_factory=list)
    chips: list[list[tuple[float, float]]] = field(default_factory=list)
    specks: list[Poly] = field(default_factory=list)
    stage4_seed: int | None = None


def fmt(n: float) -> str:
    r = round(float(n), 2)
    if abs(r - round(r)) < 1e-9:
        return str(int(round(r)))
    text = f"{r:.2f}".rstrip("0").rstrip(".")
    return text


def poly_d(pts: list[tuple[float, float]], *, horizontal: bool, compact: bool) -> str:
    bits: list[str] = []
    for i, (along, lat) in enumerate(pts):
        x, y = (along, lat) if horizontal else (lat, along)
        cmd = "M" if i == 0 else "L"
        if compact:
            bits.append(f"{cmd}{fmt(x)} {fmt(y)}")
        else:
            bits.append(f"{cmd}{fmt(x)} {fmt(y)}" if i == 0 else f"L{fmt(x)} {fmt(y)}")
    if compact:
        return "".join(bits)
    return " ".join(bits)


def clamp_lat(lat: float, compact: bool) -> float:
    if not compact:
        return lat
    return min(SLOT_LAT_MAX, max(SLOT_LAT_MIN, lat))


def crop_poly(pts: list[tuple[float, float]], end: float) -> list[tuple[float, float]] | None:
    kept: list[tuple[float, float]] = []
    prev: tuple[float, float] | None = None
    for along, lat in pts:
        if prev is None:
            if 0 <= along <= end:
                kept.append((along, lat))
            prev = (along, lat)
            continue
        a0, l0 = prev
        a1, l1 = along, lat
        prev = (along, lat)
        if a0 < end < a1:
            t = (end - a0) / (a1 - a0)
            kept.append((end, l0 + (l1 - l0) * t))
        elif a1 < end < a0:
            t = (end - a0) / (a1 - a0)
            kept.append((end, l0 + (l1 - l0) * t))
        if 0 <= along <= end:
            if not kept or kept[-1] != (along, lat):
                kept.append((along, lat))
    if len(kept) == 1:
        along, lat = kept[0]
        kept = [(along, lat), (along + 0.02, lat)]
    return kept if len(kept) >= 2 else None


def clone_motif(motif: Motif) -> Motif:
    return Motif(
        spine=[list(run) for run in motif.spine],
        chips=[list(chip) for chip in motif.chips],
        specks=[Poly(list(speck.pts), cap=speck.cap) for speck in motif.specks],
        stage4_seed=motif.stage4_seed,
    )


def _run_min(run: list[tuple[float, float]]) -> float:
    return min(pt[0] for pt in run)


def _run_max(run: list[tuple[float, float]]) -> float:
    return max(pt[0] for pt in run)


def _set_run_along(run: list[tuple[float, float]], *, want_min: bool, along: float) -> None:
    idx = min(range(len(run)), key=lambda i: run[i][0]) if want_min else max(
        range(len(run)), key=lambda i: run[i][0]
    )
    run[idx] = (along, run[idx][1])


# Compact 18–20px controls: only shrink holes bigger than the 15% gap cap.
COMPACT_LARGE_GAP = 26.0


def tighten_compact_spine_gaps(motif: Motif, end: float = 720.0) -> Motif:
    """Halve large on-spine holes so tiny −/+/slot/preset squares stay readable."""
    runs = [run for run in motif.spine if len(run) >= 2]
    runs.sort(key=_run_min)
    if not runs:
        return motif

    def shrink(left: list[tuple[float, float]] | None, right: list[tuple[float, float]] | None, a: float, b: float) -> None:
        gap = b - a
        if gap < COMPACT_LARGE_GAP:
            return
        remaining = gap * 0.5
        fill = gap - remaining
        if left is not None and right is not None:
            _set_run_along(left, want_min=False, along=a + fill / 2)
            _set_run_along(right, want_min=True, along=b - fill / 2)
        elif left is not None:
            _set_run_along(left, want_min=False, along=a + fill)
        elif right is not None:
            _set_run_along(right, want_min=True, along=b - fill)

    first = runs[0]
    bounds = [(_run_min(run), _run_max(run)) for run in runs]
    shrink(None, first, 0.0, bounds[0][0])
    for i in range(len(runs) - 1):
        shrink(runs[i], runs[i + 1], bounds[i][1], bounds[i + 1][0])
    last = runs[-1]
    shrink(last, None, bounds[-1][1], end)
    return motif


def emit_svg(
    motif: Motif,
    *,
    horizontal: bool,
    compact: bool,
) -> str:
    if compact:
        motif = tighten_compact_spine_gaps(clone_motif(motif))
        cropped: list[list[tuple[float, float]]] = []
        for run in motif.spine:
            clipped = crop_poly(run, COMPACT_LENGTH)
            if clipped:
                cropped.append(clipped)
        motif.spine = fill_along_gaps(cropped, COMPACT_LENGTH, short=True)
        motif.spine = enforce_max_run(motif.spine, COMPACT_LENGTH)
        motif.spine = fill_along_gaps(motif.spine, COMPACT_LENGTH, short=True)
        motif.spine = shorten_visible_runs(motif.spine, COMPACT_LENGTH, 70.0)
        chips: list[list[tuple[float, float]]] = []
        for chip in motif.chips:
            clipped = crop_poly(chip, COMPACT_LENGTH)
            if clipped:
                chips.append(clipped)
        motif.chips = chips
        specks: list[Poly] = []
        for speck in motif.specks:
            clipped = crop_poly(speck.pts, COMPACT_LENGTH)
            if clipped:
                specks.append(Poly(clipped, cap=speck.cap))
        motif.specks = specks
    else:
        motif = clone_motif(motif)
        motif.spine = fill_along_gaps(motif.spine, LENGTH)
        motif.spine = enforce_max_run(motif.spine, LENGTH)
        motif.spine = fill_along_gaps(motif.spine, LENGTH)
    end = COMPACT_LENGTH if compact else LENGTH
    if motif.stage4_seed is not None:
        add_gap_tick_clusters(
            motif,
            end,
            Rng(motif.stage4_seed ^ (0xC0FFEE if compact else 0x51A2)),
        )
    main: list[str] = []
    specks_butt: list[str] = []
    specks_round: list[str] = []

    def take(pts: list[tuple[float, float]], cap: str) -> None:
        clipped = crop_poly(pts, end) if compact or end != LENGTH else pts
        if not clipped:
            return
        clipped = [(a, clamp_lat(lat, compact)) for a, lat in clipped]
        if len(clipped) == 1:
            along, lat = clipped[0]
            clipped = [(along, lat), (along + 0.02, lat)]
        d = poly_d(clipped, horizontal=horizontal, compact=compact)
        if cap == "round":
            specks_round.append(d)
        elif cap == "speck":
            specks_butt.append(d)
        else:
            main.append(d)

    for run in motif.spine:
        take(run, "butt")
    for chip in motif.chips:
        take(chip, "butt")
    for speck in motif.specks:
        take(speck.pts, "round" if speck.cap == "round" else "speck")

    if horizontal:
        size = 'width="720" height="4" viewBox="0 3 720 4"' if compact else 'width="3840" height="10" viewBox="0 0 3840 10"'
    else:
        size = 'width="4" height="720" viewBox="3 0 4 720"' if compact else 'width="10" height="3840" viewBox="0 0 10 3840"'

    gap = "" if compact else " "
    main_d = gap.join(main)
    lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" {size}>',
        "  <path",
        '    fill="none"',
        '    stroke="#fff"',
        '    stroke-width="1"',
        '    stroke-linecap="butt"',
        '    stroke-linejoin="round"',
        f'    d="{main_d}"',
        "  />",
    ]
    for d in specks_butt:
        lines.append(
            f'  <path fill="none" stroke="#fff" stroke-width="1" stroke-linecap="butt" d="{d}"/>'
        )
    for d in specks_round:
        lines.append(
            f'  <path fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round" d="{d}"/>'
        )
    lines.append("</svg>\n")
    return "\n".join(lines)


def dot(along: float, lat: float = CENTER) -> Poly:
    # Tiny segment so a round cap paints. A lone moveto does not stroke.
    return Poly([(along, lat), (along + 0.02, lat)], cap="round")


def shard(a0: float, a1: float, lat0: float, lat1: float | None = None) -> Poly:
    return Poly([(a0, lat0), (a1, lat1 if lat1 is not None else lat0)], cap="speck")


# 100% lateral distance from the 1px hairline. Stage 2 uses half of this.
# Stage 3 picks 125% or 187.5% per run (25% above the old 100/150 step).
DISTORT_MAX = 2.8
# Unique dash rhythm per family. Three length bands so holes are not a beat.
# Longest band stops at 15% of the 3840 tile (576px). Slot files recap at 108px.
RHYTHM = {
    "h": dict(
        run_bands=((48, 95), (130, 280), (320, 576)),
        run_w=(0.28, 0.47, 0.25),
        gap_bands=((22, 23), (23, 24), (24, 25)),
        gap_w=(0.32, 0.48, 0.20),
    ),
    "h2": dict(
        run_bands=((36, 80), (100, 240), (280, 540)),
        run_w=(0.34, 0.42, 0.24),
        gap_bands=((22, 23), (23, 24), (24, 25)),
        gap_w=(0.30, 0.46, 0.24),
    ),
    "v": dict(
        run_bands=((55, 110), (150, 300), (320, 576)),
        run_w=(0.26, 0.50, 0.24),
        gap_bands=((22, 23), (23, 24), (24, 25)),
        gap_w=(0.34, 0.46, 0.20),
    ),
    "v2": dict(
        run_bands=((28, 70), (88, 220), (260, 540)),
        run_w=(0.36, 0.40, 0.24),
        gap_bands=((22, 23), (23, 24), (24, 25)),
        gap_w=(0.30, 0.48, 0.22),
    ),
}


def max_run_len(tile_len: float) -> float:
    return tile_len * MAX_RUN_FRAC


JOIN_EPS = 1.25
SPLIT_HOLE = 24.0


def coalesce_along(
    runs: list[list[tuple[float, float]]],
    join: float = JOIN_EPS,
) -> list[list[tuple[float, float]]]:
    """Merge pieces that touch so the cap measures visual length, not path cmds."""
    items: list[tuple[float, float, list[tuple[float, float]]]] = []
    for run in runs:
        if len(run) < 2:
            continue
        items.append((_run_min(run), _run_max(run), run))
    items.sort(key=lambda t: t[0])
    merged: list[tuple[float, float, list[tuple[float, float]]]] = []
    for a0, a1, run in items:
        if merged and a0 <= merged[-1][1] + join:
            pa0, pa1, prev = merged[-1]
            hi = max(pa1, a1)
            straight = (
                len(prev) == 2
                and len(run) == 2
                and abs(prev[0][1] - prev[1][1]) < 0.05
                and abs(run[0][1] - run[1][1]) < 0.05
                and abs(prev[0][1] - run[0][1]) < 0.05
            )
            if straight:
                lat = prev[0][1]
                merged[-1] = (pa0, hi, [(pa0, lat), (hi, lat)])
            else:
                merged[-1] = (pa0, hi, prev + run)
        else:
            merged.append((a0, a1, run))
    return [run for _, _, run in merged]


def enforce_max_run(
    runs: list[list[tuple[float, float]]],
    tile_len: float,
    hole: float = SPLIT_HOLE,
) -> list[list[tuple[float, float]]]:
    """Split any visual stretch longer than 15% of this file's tile length."""
    cap = max_run_len(tile_len)
    out: list[list[tuple[float, float]]] = []
    for run in coalesce_along(runs):
        a0, a1 = _run_min(run), _run_max(run)
        start = a0
        while start < a1 - 2:
            remain = a1 - start
            if remain <= cap + 1e-6:
                kept = keep_along(run, start, a1)
                if kept:
                    out.append(kept)
                break
            end = start + cap
            kept = keep_along(run, start, end)
            if kept:
                out.append(kept)
            start = end + hole
    return cap_tile_wrap(out, tile_len, cap, hole)


def cap_tile_wrap(
    runs: list[list[tuple[float, float]]],
    tile_len: float,
    cap: float,
    hole: float,
) -> list[list[tuple[float, float]]]:
    """A run at 0 plus a run at tile_len fuse across CSS mask-repeat."""
    if len(runs) < 2:
        return runs
    ordered = sorted(runs, key=_run_min)
    first, last = ordered[0], ordered[-1]
    if _run_min(first) > 0.5 or _run_max(last) < tile_len - 0.5:
        return ordered
    wrap = (_run_max(first) - 0.0) + (tile_len - _run_min(last))
    if wrap <= cap + 1e-6:
        return ordered
    # Open a visible seam hole so mask-repeat does not fuse two max runs.
    # Never bigger than MAX_GAP.
    seam = min(MAX_GAP, max(hole, MIN_GAP))
    trimmed = keep_along(first, _run_min(first) + seam, None)
    if trimmed:
        ordered[0] = trimmed
    else:
        ordered.pop(0)
    return ordered


def fill_along_gaps(
    runs: list[list[tuple[float, float]]],
    tile_len: float,
    short: bool = False,
) -> list[list[tuple[float, float]]]:
    """Insert short hairline chunks so no along-axis hole is wider than MAX_GAP."""
    ordered = sorted((run for run in runs if len(run) >= 2), key=_run_min)
    out: list[list[tuple[float, float]]] = []
    cursor = 0.0
    cap = max_run_len(tile_len)
    leave = SPLIT_HOLE

    def emit_fill(start: float, end: float) -> None:
        hole = end - start
        if hole <= MAX_GAP + 1e-6:
            return
        x = start
        limit = end - leave
        if limit - x < 8:
            limit = start + max(8.0, hole - MAX_GAP)
        while limit - x >= 8:
            # Slot tiles sit near the 15% cap and fuse; keep those dashes shorter.
            t = (x * 0.6180339887) % 1.0
            frac = (0.28 + 0.40 * t) if short else (0.45 + 0.55 * t)
            chunk = min(cap, limit - x, cap * frac)
            if chunk < 8:
                break
            out.append([(x, CENTER), (x + chunk, CENTER)])
            x += chunk
            if limit - x < 8:
                break
            x += MIN_GAP + (MAX_GAP - MIN_GAP) * ((x * 0.3819660113) % 1.0)

    for run in ordered:
        a = _run_min(run)
        emit_fill(cursor, a)
        out.append(run)
        cursor = max(cursor, _run_max(run))
    emit_fill(cursor, tile_len)
    if len(out) >= 2:
        out.sort(key=_run_min)
        wrap_gap = _run_min(out[0]) + (tile_len - _run_max(out[-1]))
        if wrap_gap > MAX_GAP + 1e-6:
            extra = wrap_gap - MAX_GAP
            lo = _run_min(out[0])
            cover = min(lo, extra)
            if cover >= 8:
                out.insert(0, [(max(0.0, lo - cover), CENTER), (lo, CENTER)])
            elif lo >= extra and extra > 0:
                out.insert(0, [(max(0.0, lo - extra), CENTER), (lo, CENTER)])
    return ensure_min_parts(out, tile_len)


def shorten_visible_runs(
    runs: list[list[tuple[float, float]]],
    tile_len: float,
    visual_cap: float,
) -> list[list[tuple[float, float]]]:
    """15% is the hard cap. On short tiles, near-cap dashes with 22px holes
    still read as one stroke, so keep typical dashes under visual_cap."""
    cap = min(max_run_len(tile_len), visual_cap)
    out = coalesce_along(runs)
    guard = 0
    while guard < 24:
        guard += 1
        long = [run for run in out if _run_max(run) - _run_min(run) > cap + 1e-6]
        if not long:
            break
        run = max(long, key=lambda item: _run_max(item) - _run_min(item))
        a0, a1 = _run_min(run), _run_max(run)
        if a1 - a0 < MIN_GAP + 24:
            break
        mid = (a0 + a1) / 2
        left = keep_along(run, None, mid - MIN_GAP / 2)
        right = keep_along(run, mid + MIN_GAP / 2, None)
        nxt = [item for item in out if item is not run]
        if left:
            nxt.append(left)
        if right:
            nxt.append(right)
        if len(nxt) <= len(out):
            break
        out = nxt
    return ensure_min_parts(out, tile_len)


def ensure_min_parts(
    runs: list[list[tuple[float, float]]],
    tile_len: float,
) -> list[list[tuple[float, float]]]:
    """15% cap means at least 7 separate runs on that tile."""
    need = math.ceil(1.0 / MAX_RUN_FRAC)
    out = [run for run in runs if len(run) >= 2]
    guard = 0
    while len(out) < need and guard < 24:
        guard += 1
        idx = max(range(len(out)), key=lambda i: _run_max(out[i]) - _run_min(out[i]))
        run = out[idx]
        a0, a1 = _run_min(run), _run_max(run)
        if a1 - a0 < MIN_GAP + 20:
            break
        mid = (a0 + a1) / 2
        left = keep_along(run, None, mid - MIN_GAP / 2)
        right = keep_along(run, mid + MIN_GAP / 2, None)
        nxt = [item for i, item in enumerate(out) if i != idx]
        if left:
            nxt.append(left)
        if right:
            nxt.append(right)
        if len(nxt) <= len(out):
            break
        out = nxt
    return sorted(out, key=_run_min)


def gapped_spine(rng: Rng, rhythm: dict) -> Motif:
    """Stage 1: straight hairline with empty spaces. Always starts at 0."""
    cap = max_run_len(LENGTH)
    spine: list[list[tuple[float, float]]] = []
    x = 0.0
    streak_start = 0.0
    while x < LENGTH - 8:
        room = min(LENGTH - x, cap - (x - streak_start))
        if room < 8:
            gap = min(
                MAX_GAP,
                rng.pick_span(rhythm["gap_bands"], rhythm["gap_w"]),
                LENGTH - x,
            )
            if gap < 4:
                break
            x += gap
            streak_start = x
            continue
        run = min(
            rng.pick_span(rhythm["run_bands"], rhythm["run_w"]),
            room,
        )
        if run < 8:
            break
        spine.append([(x, CENTER), (x + run, CENTER)])
        x += run
        if x >= LENGTH - 8:
            break
        # Always leave a visible hole. A skipped gap paints as one longer line.
        gap = min(
            MAX_GAP,
            rng.pick_span(rhythm["gap_bands"], rhythm["gap_w"]),
            LENGTH - x,
        )
        if rng.chance(0.14):
            gap = min(gap, rng.spanned(MIN_GAP, MAX_GAP))
        if gap < MIN_GAP:
            break
        x += gap
        streak_start = x
    if spine and spine[-1][-1][0] < LENGTH - 20:
        tail = LENGTH - spine[-1][-1][0]
        if tail >= 28:
            start = spine[-1][-1][0] + min(
                MAX_GAP,
                rng.pick_span(rhythm["gap_bands"], rhythm["gap_w"]),
                tail * 0.4,
            )
            if LENGTH - start >= 12:
                end = min(LENGTH, start + cap)
                spine.append([(start, CENTER), (end, CENTER)])
    if not spine:
        spine.append([(0.0, CENTER), (min(LENGTH, cap), CENTER)])
    return Motif(spine=enforce_max_run(fill_along_gaps(spine, LENGTH), LENGTH))


def spine_gaps(spine: list[list[tuple[float, float]]]) -> list[tuple[float, float]]:
    runs = sorted((run for run in spine if len(run) >= 2), key=_run_min)
    gaps: list[tuple[float, float]] = []
    cursor = 0.0
    for run in runs:
        a, b = _run_min(run), _run_max(run)
        if a - cursor >= 8:
            gaps.append((cursor, a))
        cursor = max(cursor, b)
    if LENGTH - cursor >= 8:
        gaps.append((cursor, float(LENGTH)))
    return gaps


def _along_in(along: float, lo: float | None, hi: float | None) -> bool:
    if lo is not None and along < lo - 1e-9:
        return False
    if hi is not None and along > hi + 1e-9:
        return False
    return True


def keep_along(
    pts: list[tuple[float, float]], lo: float | None, hi: float | None
) -> list[tuple[float, float]] | None:
    """Keep the polyline where lo <= along <= hi. None bound is open."""
    if not pts:
        return None
    kept: list[tuple[float, float]] = []
    prev: tuple[float, float] | None = None
    for along, lat in pts:
        if prev is None:
            if _along_in(along, lo, hi):
                kept.append((along, lat))
            prev = (along, lat)
            continue
        a0, l0 = prev
        a1, l1 = along, lat
        prev = (along, lat)
        for edge in (lo, hi):
            if edge is None:
                continue
            if (a0 < edge < a1) or (a1 < edge < a0):
                t = (edge - a0) / (a1 - a0)
                pt = (edge, l0 + (l1 - l0) * t)
                if _along_in(edge, lo, hi) and (not kept or kept[-1] != pt):
                    kept.append(pt)
        if _along_in(along, lo, hi) and (not kept or kept[-1] != (along, lat)):
            kept.append((along, lat))
    if len(kept) == 1:
        along, lat = kept[0]
        kept = [(along, lat), (along + 0.02, lat)]
    return kept if len(kept) >= 2 else None


def punch_runs(
    runs: list[list[tuple[float, float]]], holes: list[tuple[float, float]]
) -> list[list[tuple[float, float]]]:
    """Cut along-axis holes out of existing runs. Previous gaps stay."""
    out = [list(run) for run in runs if len(run) >= 2]
    for h0, h1 in holes:
        nxt: list[list[tuple[float, float]]] = []
        for run in out:
            left = keep_along(run, None, h0)
            right = keep_along(run, h1, None)
            if left:
                nxt.append(left)
            if right:
                nxt.append(right)
        out = nxt
    return out


def _holes_overlap(h0: float, h1: float, used: list[tuple[float, float]]) -> bool:
    for u0, u1 in used:
        if not (h1 < u0 or h0 > u1):
            return True
    return False


GAPS_PER_STAGE = 4
# Stage 2→3 is a bigger step: +25% holes and +25% warp vs the usual stage add.
GAPS_STAGE_3 = max(1, round(GAPS_PER_STAGE * 1.25))
STAGE3_DISTORT_MUL = 1.25


def plan_extra_gaps(
    runs: list[list[tuple[float, float]]],
    rng: Rng,
    *,
    count: int,
    used: list[tuple[float, float]],
) -> list[tuple[float, float]]:
    """A few new holes in leftover long runs, not on top of existing gaps."""
    candidates = [
        (_run_min(run), _run_max(run))
        for run in runs
        if _run_max(run) - _run_min(run) >= 88
    ]
    holes: list[tuple[float, float]] = []

    def try_cut(a0: float, a1: float) -> tuple[float, float] | None:
        span = a1 - a0
        hole = rng.pick_span(((22, 23), (23, 24), (24, 25)), (0.34, 0.46, 0.20))
        pad = MIN_GAP
        if span < hole + pad * 2:
            return None
        t = rng.spanned(0.22, 0.78)
        mid = a0 + span * t
        h0, h1 = mid - hole / 2, mid + hole / 2
        if h0 < a0 + pad:
            h0 = a0 + pad
            h1 = h0 + hole
        if h1 > a1 - pad:
            h1 = a1 - pad
            h0 = h1 - hole
        if h1 - h0 < 8 or _holes_overlap(h0, h1, used + holes):
            return None
        return (h0, h1)

    # One cut in the compact/slot window when a long run lives there.
    early = [(a0, a1) for a0, a1 in candidates if a0 < 720 and a1 - max(a0, 0) >= 88]
    if early and count > 0:
        a0, a1 = early[int(rng.unit() * len(early))]
        cut = try_cut(a0, a1)
        if cut:
            holes.append(cut)

    order = list(range(len(candidates)))
    for i in range(len(order) - 1, 0, -1):
        j = int(rng.unit() * (i + 1))
        order[i], order[j] = order[j], order[i]
    for idx in order:
        if len(holes) >= count:
            break
        cut = try_cut(*candidates[idx])
        if cut:
            holes.append(cut)
    return holes


def plan_run_warp(run: list[tuple[float, float]], rng: Rng) -> list[tuple[float, float]]:
    """(along, unit offset -1..1). Endpoints stay on the hairline."""
    a0, a1 = run[0][0], run[-1][0]
    span = a1 - a0
    if span < 36 or rng.chance(0.16):
        return [(a0, 0.0), (a1, 0.0)]
    n_mid = 2 if span >= 280 and rng.chance(0.4) else 1
    sign = rng.sign()
    pts: list[tuple[float, float]] = [(a0, 0.0)]
    for i in range(1, n_mid + 1):
        t = rng.spanned(0.22, 0.78) if n_mid == 1 else (i / (n_mid + 1) + rng.spanned(-0.12, 0.12))
        t = min(0.82, max(0.18, t))
        along = a0 + span * t
        along = min(a1 - 6.0, max(a0 + 6.0, along))
        env = math.sin(math.pi * t)
        unit = sign * max(0.35, env) * rng.spanned(0.45, 1.0)
        pts.append((along, unit))
        if n_mid > 1:
            sign = -sign
    pts.append((a1, 0.0))
    return pts


# Distortion joints stay one polyline only this often. The rest split.
WARP_CONNECT_CHANCE = 0.10


def plan_warp_links(
    warps: list[list[tuple[float, float]]], rng: Rng
) -> list[list[bool]]:
    return [
        [rng.chance(WARP_CONNECT_CHANCE) for _ in range(max(0, len(warp) - 1))]
        for warp in warps
    ]


def split_warped_run(
    pts: list[tuple[float, float]], keep: list[bool]
) -> list[list[tuple[float, float]]]:
    """Break offset joints so warped pieces usually float apart."""
    if len(pts) < 2:
        return []
    runs: list[list[tuple[float, float]]] = []
    current: list[tuple[float, float]] = [pts[0]]
    for i in range(len(pts) - 1):
        a0, l0 = pts[i]
        a1, l1 = pts[i + 1]
        span = a1 - a0
        lat_change = abs(l1 - l0) >= 0.08
        connected = (not lat_change) or (i < len(keep) and keep[i])
        if connected:
            current.append(pts[i + 1])
            continue
        gap = min(3.2, max(1.6, span * 0.12))
        if span <= gap * 2 + 4:
            if len(current) >= 2:
                runs.append(current)
            current = [pts[i + 1]]
            continue
        mid = (a0 + a1) / 2.0
        current.append((mid - gap / 2.0, l0))
        if len(current) >= 2:
            runs.append(current)
        current = [(mid + gap / 2.0, l1), pts[i + 1]]
    if len(current) >= 2:
        runs.append(current)
    return runs if runs else [pts]


def apply_warp(
    warps: list[list[tuple[float, float]]],
    links: list[list[bool]],
    scales: list[float],
) -> list[list[tuple[float, float]]]:
    out: list[list[tuple[float, float]]] = []
    for warp, keep, scale in zip(warps, links, scales):
        amp = DISTORT_MAX * scale
        pts = [
            (along, min(9.3, max(0.7, CENTER + unit * amp)))
            for along, unit in warp
        ]
        out.extend(split_warped_run(pts, keep))
    return out


def add_gap_debris(motif: Motif, gaps: list[tuple[float, float]], rng: Rng) -> None:
    """Stage 3: a few points and short lines sitting in the original empty spaces."""
    eligible = [(g0, g1) for g0, g1 in gaps if g1 - g0 >= 16]
    n_line = 0
    n_dot = 0
    for i, (g0, g1) in enumerate(eligible):
        span = g1 - g0
        force_line = n_line == 0
        force_dot = n_line > 0 and n_dot == 0
        if not force_line and not force_dot and (i > 8 or not rng.chance(0.22)):
            continue
        want_line = force_line or (not force_dot and n_line < 5 and rng.chance(0.55))
        if want_line:
            length = rng.spanned(3.5, min(9.0, span * 0.28))
            mid = g0 + span * rng.spanned(0.38, 0.62)
            a = mid - length / 2
            b = mid + length / 2
            if a > g0 + 4 and b < g1 - 4:
                lat = CENTER + rng.spanned(-0.55, 0.55)
                motif.specks.append(shard(a, b, lat, lat + rng.spanned(-0.2, 0.2)))
                n_line += 1
                continue
        along = g0 + span * rng.spanned(0.32, 0.68)
        if along > g0 + 3 and along < g1 - 3:
            motif.specks.append(dot(along, CENTER + rng.spanned(-0.7, 0.7)))
            n_dot += 1


def lat_on_run(run: list[tuple[float, float]], along: float) -> float:
    """Lateral value at `along`, independent of whether the segment is stored forward or back."""
    for i in range(len(run) - 1):
        a0, l0 = run[i]
        a1, l1 = run[i + 1]
        if a0 <= a1:
            lo, hi, lat_lo, lat_hi = a0, a1, l0, l1
        else:
            lo, hi, lat_lo, lat_hi = a1, a0, l1, l0
        if along < lo - 1e-6 or along > hi + 1e-6:
            continue
        span = hi - lo
        if span < 1e-9:
            return lat_lo
        t = (along - lo) / span
        return lat_lo + (lat_hi - lat_lo) * t
    return run[0][1]


MIN_RUN_AFTER_TRIM = 16.0


def _cluster_need(n: int, lens: list[float], holes: list[float], pad_lo: float, pad_hi: float) -> float:
    return pad_lo + sum(lens[:n]) + sum(holes[: max(0, n - 1)]) + pad_hi


def add_gap_tick_clusters(motif: Motif, tile_len: float, rng: Rng) -> None:
    """Widen some 22-25px holes and drop 1-5 on-spine ticks into them."""
    runs = coalesce_along([run for run in motif.spine if len(run) >= 2])
    runs.sort(key=_run_min)
    if len(runs) < 2:
        return
    compact = tile_len <= COMPACT_LENGTH + 1e-6
    max_groups = 4 if compact else 8
    chance = 0.45 if compact else 0.3
    ticks: list[list[tuple[float, float]]] = []
    last_pick = -99
    groups = 0
    for i in range(len(runs) - 1):
        if groups >= max_groups:
            break
        if i - last_pick <= 1:
            continue
        g0, g1 = _run_max(runs[i]), _run_min(runs[i + 1])
        have = g1 - g0
        if have < MIN_GAP - 1:
            continue
        if groups > 0 and not rng.chance(chance):
            continue
        n = int(rng.spanned(1.0, 5.999))
        lens = [rng.spanned(2.0, 10.0) for _ in range(n)]
        holes = [rng.spanned(4.0, 10.0) for _ in range(max(0, n - 1))]
        pad_lo = rng.spanned(4.0, 8.0)
        pad_hi = rng.spanned(4.0, 8.0)
        left_span = _run_max(runs[i]) - _run_min(runs[i])
        right_span = _run_max(runs[i + 1]) - _run_min(runs[i + 1])
        room = max(0.0, left_span - MIN_RUN_AFTER_TRIM) + max(
            0.0, right_span - MIN_RUN_AFTER_TRIM
        )
        while n > 1 and _cluster_need(n, lens, holes, pad_lo, pad_hi) > have + room + 1e-6:
            n -= 1
        need = _cluster_need(n, lens, holes, pad_lo, pad_hi)
        extra = max(0.0, need - have)
        take_l = min(extra / 2, max(0.0, left_span - MIN_RUN_AFTER_TRIM))
        take_r = min(extra - take_l, max(0.0, right_span - MIN_RUN_AFTER_TRIM))
        take_l = min(extra - take_r, max(0.0, left_span - MIN_RUN_AFTER_TRIM))
        if take_l + take_r + have < need - 0.5:
            continue
        new_g0 = g0 - take_l
        new_g1 = g1 + take_r
        trimmed_l = keep_along(runs[i], None, new_g0)
        trimmed_r = keep_along(runs[i + 1], new_g1, None)
        if not trimmed_l or not trimmed_r:
            continue
        runs[i] = trimmed_l
        runs[i + 1] = trimmed_r
        lat0 = lat_on_run(trimmed_l, _run_max(trimmed_l))
        lat1 = lat_on_run(trimmed_r, _run_min(trimmed_r))
        cursor = new_g0 + pad_lo
        span = max(1e-6, new_g1 - new_g0)
        for k, tick_len in enumerate(lens[:n]):
            mid = cursor + tick_len / 2
            t = (mid - new_g0) / span
            lat = lat0 + (lat1 - lat0) * t
            ticks.append([(cursor, lat), (cursor + tick_len, lat)])
            cursor += tick_len
            if k < n - 1:
                cursor += holes[k]
        last_pick = i
        groups += 1
    motif.spine = sorted(runs + ticks, key=_run_min)


def build_family_stages(key: str, seed: int) -> dict[str, Motif]:
    rhythm = RHYTHM[key]
    gapped = gapped_spine(Rng(seed), rhythm)
    gaps = spine_gaps(gapped.spine)
    warp_rng = Rng(seed ^ 0xA5C3E91)
    warps = [plan_run_warp(run, warp_rng) for run in gapped.spine]
    links = plan_warp_links(warps, Rng(seed ^ 0x2F4A91C))
    scale_rng = Rng(seed ^ 0x15D15D)

    used = list(gaps)
    extra2 = plan_extra_gaps(
        gapped.spine, Rng(seed ^ 0x11C0FFEE), count=GAPS_PER_STAGE, used=used
    )
    used = used + extra2
    extra3 = plan_extra_gaps(
        punch_runs(gapped.spine, extra2),
        Rng(seed ^ 0x22BADF00),
        count=GAPS_STAGE_3,
        used=used,
    )
    used = used + extra3
    extra4 = plan_extra_gaps(
        punch_runs(gapped.spine, extra2 + extra3),
        Rng(seed ^ 0x33DECADE),
        count=GAPS_PER_STAGE,
        used=used,
    )

    s1 = clone_motif(gapped)
    s1.spine = enforce_max_run(s1.spine, LENGTH)
    s2_scales = [0.5 for _ in warps]
    s3_scales = [
        (1.5 if scale_rng.chance(0.5) else 1.0) * STAGE3_DISTORT_MUL for _ in warps
    ]
    s2 = Motif(
        spine=enforce_max_run(
            punch_runs(apply_warp(warps, links, s2_scales), extra2), LENGTH
        )
    )
    s3 = Motif(
        spine=enforce_max_run(
            punch_runs(apply_warp(warps, links, s3_scales), extra2 + extra3), LENGTH
        )
    )
    add_gap_debris(s3, gaps, Rng(seed ^ 0x51A2C0D))
    s4 = clone_motif(s3)
    s4.spine = enforce_max_run(punch_runs(s4.spine, extra4), LENGTH)
    s4.stage4_seed = seed ^ 0x7B10E33
    return {"s1": s1, "s2": s2, "s3": s3, "s4": s4}


def mask_stem(key: str, stage: int, compact: bool) -> str:
    slot = "-slot" if compact else ""
    suffix = f"-s{stage}"
    return f"{key}{slot}{suffix}"


def svg_cache_token(stem: str) -> str:
    data = (ROOT / f"rule-{stem}.svg").read_bytes()
    return hashlib.md5(data).hexdigest()[:8]


def mask_url(stem: str) -> str:
    return f'url("./rule-{stem}.svg?v={svg_cache_token(stem)}")'


def mask_decls(stage: int, compact: bool, *, prev: bool) -> str:
    suffix = "-prev" if prev else ""
    lines = [
        f"  --adc-chrome-mask-{key}{suffix}: {mask_url(mask_stem(key, stage, compact))};"
        for key in MASK_KEYS
    ]
    return "\n".join(lines)


def emit_mask_css() -> None:
    """One table → all stage / prev / compact mask URLs. Do not copy-paste in index.css."""
    chunks = [
        "/* Generated by scripts/generate-chrome-pair-svgs.py. Mask URL SSOT. */",
        "",
        ".game-chrome-rule {",
        mask_decls(4, False, prev=False),
        "}",
        "",
        ".game-chrome-rule--compact {",
        mask_decls(4, True, prev=False),
        "}",
        "",
    ]
    for stage in (1, 2, 3, 4):
        chunks.extend(
            [
                f'[data-adc-chrome-stage="{stage}"] .game-chrome-rule {{',
                mask_decls(stage, False, prev=False),
                "}",
                "",
                f'[data-adc-chrome-stage="{stage}"] .game-chrome-rule--compact {{',
                mask_decls(stage, True, prev=False),
                "}",
                "",
            ]
        )
    for stage in (1, 2, 3, 4):
        chunks.extend(
            [
                f'[data-adc-chrome-prev-stage="{stage}"] .game-chrome-rule {{',
                mask_decls(stage, False, prev=True),
                "}",
                "",
                f'[data-adc-chrome-prev-stage="{stage}"] .game-chrome-rule--compact {{',
                mask_decls(stage, True, prev=True),
                "}",
                "",
            ]
        )
    chunks.append(
        "/* Nested /dev/animations columns beat document-level stage selectors. */"
    )
    chunks.append("")
    for stage in (1, 2, 3, 4):
        chunks.extend(
            [
                f'.adc-chrome-stage-preview[data-adc-chrome-stage="{stage}"] .game-chrome-rule {{',
                mask_decls(stage, False, prev=False),
                mask_decls(stage, False, prev=True),
                "}",
                "",
                f'.adc-chrome-stage-preview[data-adc-chrome-stage="{stage}"] .game-chrome-rule--compact {{',
                mask_decls(stage, True, prev=False),
                mask_decls(stage, True, prev=True),
                "}",
                "",
            ]
        )
    MASK_CSS.write_text("\n".join(chunks).rstrip() + "\n", encoding="utf-8", newline="\n")
    print(f"wrote {MASK_CSS.relative_to(MASK_CSS.parents[3])}")


def write(name: str, body: str) -> None:
    path = ROOT / name
    path.write_text(body, encoding="utf-8", newline="\n")
    print(f"wrote {path.relative_to(ROOT.parent.parent.parent)}")


STAGE_FILES = {
    "s1": "-s1",
    "s2": "-s2",
    "s3": "-s3",
    "s4": "-s4",
}


def main() -> None:
    seeds = {"h": 0x51A2C0D, "h2": 0xA5C3E91, "v": 0x7B10E33, "v2": 0x3D17B4F}
    built: dict[str, dict[str, Motif]] = {}
    for key, seed in seeds.items():
        built[key] = build_family_stages(key, seed)

    for key, stages in built.items():
        horizontal = key in ("h", "h2")
        for stage, suffix in STAGE_FILES.items():
            write(
                f"rule-{key}{suffix}.svg",
                emit_svg(stages[stage], horizontal=horizontal, compact=False),
            )
            write(
                f"rule-{key}-slot{suffix}.svg",
                emit_svg(stages[stage], horizontal=horizontal, compact=True),
            )

    emit_mask_css()
    for stale in (
        "rule-h.svg",
        "rule-h2.svg",
        "rule-v.svg",
        "rule-v2.svg",
        "rule-h-slot.svg",
        "rule-h2-slot.svg",
        "rule-v-slot.svg",
        "rule-v2-slot.svg",
    ):
        path = ROOT / stale
        if path.exists():
            path.unlink()
            print(f"removed {path.relative_to(ROOT.parent.parent.parent)}")
    h_open = (ROOT / "rule-h-s4.svg").read_text(encoding="utf-8")
    h2_open = (ROOT / "rule-h2-s4.svg").read_text(encoding="utf-8")
    v_open = (ROOT / "rule-v-s4.svg").read_text(encoding="utf-8")
    v2_open = (ROOT / "rule-v2-s4.svg").read_text(encoding="utf-8")
    assert "M0 5" in h_open
    assert h_open != h2_open
    assert v_open != v2_open
    assert "M5 " in v_open
    assert "M5 " in v2_open
    print("unique vs h/v (not reverse copies)")


if __name__ == "__main__":
    if "--css-only" in sys.argv:
        emit_mask_css()
    else:
        main()
