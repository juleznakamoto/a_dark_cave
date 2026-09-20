#!/usr/bin/env python3
"""Chrome seam tiles. Unique h/h2/v/v2 vocabularies, not reverse/flip copies.

Madness stages stack: each one keeps the previous features and adds one more.
  0 solid hairline (CSS, no tile)
  1 empty spaces between line runs
  2 + distortion at 50% of max lateral distance
  3 + distortion at 100%, plus a few points and short lines in the gaps
  4 + a few points at 50% distance next to the line runs

Rebuild SVGs + mask CSS with no args; `--css-only` skips tiles.
"""

from __future__ import annotations

import math
import sys
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "client" / "src" / "assets" / "chrome"
MASK_CSS = ROOT / "chrome-mask-stages.css"

LENGTH = 3840
MASK_KEYS = ("h", "h2", "v", "v2")
# Stage 4 = unsuffixed extreme tiles. Cache tokens stay per-family so a
# unique h2/v2 rebuild does not bust unchanged h/v.
MASK_CACHE = {
    "h": 22,
    "v": 22,
    "h2": 7,
    "v2": 7,
    "h-slot": 9,
    "v-slot": 9,
    "h2-slot": 8,
    "v2-slot": 8,
    "h-s1": 8,
    "h-s2": 8,
    "h-s3": 8,
    "v-s1": 8,
    "v-s2": 8,
    "v-s3": 8,
    "h2-s1": 7,
    "h2-s2": 7,
    "h2-s3": 7,
    "v2-s1": 7,
    "v2-s2": 7,
    "v2-s3": 7,
    "h-slot-s1": 9,
    "h-slot-s2": 9,
    "h-slot-s3": 9,
    "v-slot-s1": 9,
    "v-slot-s2": 9,
    "v-slot-s3": 9,
    "h2-slot-s1": 8,
    "h2-slot-s2": 8,
    "h2-slot-s3": 8,
    "v2-slot-s1": 8,
    "v2-slot-s2": 8,
    "v2-slot-s3": 8,
}
CENTER = 5.0
SLOT_LAT_MIN = 3.6
SLOT_LAT_MAX = 6.4


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


@dataclass
class Poly:
    pts: list[tuple[float, float]]
    cap: str = "butt"


@dataclass
class Motif:
    spine: list[list[tuple[float, float]]] = field(default_factory=list)
    chips: list[list[tuple[float, float]]] = field(default_factory=list)
    specks: list[Poly] = field(default_factory=list)


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


# Compact 18–20px controls: holes bigger than this eat a whole edge.
COMPACT_LARGE_GAP = 14.0


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
    end = 720 if compact else LENGTH
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
DISTORT_MAX = 2.8

# Unique dash rhythm per family so header/footer/columns are not copies.
RHYTHM = {
    "h": dict(run=(80, 170), gap=(24, 44)),
    "h2": dict(run=(50, 130), gap=(26, 48)),
    "v": dict(run=(90, 190), gap=(22, 42)),
    "v2": dict(run=(36, 110), gap=(24, 46)),
}


def gapped_spine(rng: Rng, *, run_range: tuple[float, float], gap_range: tuple[float, float]) -> Motif:
    """Stage 1: straight hairline with empty spaces. Always starts at 0."""
    spine: list[list[tuple[float, float]]] = []
    x = 0.0
    while x < LENGTH - 8:
        run = min(rng.spanned(*run_range), LENGTH - x)
        if run < 8:
            break
        spine.append([(x, CENTER), (x + run, CENTER)])
        x += run
        if x >= LENGTH - 8:
            break
        gap = min(rng.spanned(*gap_range), LENGTH - x)
        if gap < 4:
            break
        x += gap
    if spine and spine[-1][-1][0] < LENGTH - 20:
        tail = LENGTH - spine[-1][-1][0]
        if tail >= 28:
            start = spine[-1][-1][0] + min(rng.spanned(*gap_range), tail * 0.4)
            if LENGTH - start >= 12:
                spine.append([(start, CENTER), (LENGTH, CENTER)])
    if not spine:
        spine.append([(0.0, CENTER), (LENGTH, CENTER)])
    return Motif(spine=spine)


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


def plan_run_warp(run: list[tuple[float, float]], rng: Rng) -> list[tuple[float, float]]:
    """(along, unit offset -1..1). Endpoints stay on the hairline."""
    a0, a1 = run[0][0], run[-1][0]
    span = a1 - a0
    if span < 28:
        return [(a0, 0.0), (a1, 0.0)]
    n_mid = 1 if span < 70 else 2 if span < 140 else 3
    sign = rng.sign()
    pts: list[tuple[float, float]] = [(a0, 0.0)]
    for i in range(1, n_mid + 1):
        t = i / (n_mid + 1)
        along = a0 + span * (t + rng.spanned(-0.04, 0.04))
        along = min(a1 - 6.0, max(a0 + 6.0, along))
        env = math.sin(math.pi * t)
        unit = sign * env * rng.spanned(0.55, 1.0)
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
    scale: float,
    links: list[list[bool]],
) -> list[list[tuple[float, float]]]:
    amp = DISTORT_MAX * scale
    out: list[list[tuple[float, float]]] = []
    for warp, keep in zip(warps, links):
        pts = [(along, CENTER + unit * amp) for along, unit in warp]
        out.extend(split_warped_run(pts, keep))
    return out


def lat_at(run: list[tuple[float, float]], along: float) -> float:
    if along <= run[0][0]:
        return run[0][1]
    for i in range(1, len(run)):
        a0, l0 = run[i - 1]
        a1, l1 = run[i]
        if along <= a1:
            if a1 == a0:
                return l1
            t = (along - a0) / (a1 - a0)
            return l0 + (l1 - l0) * t
    return run[-1][1]


def add_gap_debris(motif: Motif, gaps: list[tuple[float, float]], rng: Rng) -> None:
    """Stage 3: a few points and short lines sitting in the empty spaces."""
    eligible = [(g0, g1) for g0, g1 in gaps if g1 - g0 >= 12]
    for i, (g0, g1) in enumerate(eligible):
        span = g1 - g0
        # First two wide gaps always get debris so a short viewport still shows it.
        if i >= 2 and not rng.chance(0.38):
            continue
        use_line = i == 0 if i < 2 else rng.chance(0.55)
        if use_line:
            half = rng.spanned(2.4, min(8.0, span * 0.32))
            mid = g0 + span * rng.spanned(0.35, 0.65)
            a = max(g0 + 1.2, mid - half)
            b = min(g1 - 1.2, mid + half)
            if b > a + 2.2:
                lat = CENTER + rng.spanned(-0.25, 0.25)
                motif.specks.append(shard(a, b, lat, lat + rng.spanned(-0.15, 0.15)))
                continue
        motif.specks.append(
            dot(g0 + span * rng.spanned(0.28, 0.72), CENTER + rng.spanned(-0.3, 0.3))
        )


def add_side_points(motif: Motif, runs: list[list[tuple[float, float]]], rng: Rng) -> None:
    """Stage 4: a few points at 50% distance next to the warped line runs."""
    amp = DISTORT_MAX * 0.5
    placed = 0
    for run in runs:
        a0, a1 = run[0][0], run[-1][0]
        span = a1 - a0
        if span < 22:
            continue
        if placed >= 2 and not rng.chance(0.4):
            continue
        along = a0 + span * rng.spanned(0.18, 0.82)
        motif.specks.append(dot(along, lat_at(run, along) + rng.sign() * amp))
        placed += 1
        if span > 90 and rng.chance(0.28):
            along2 = a0 + span * rng.spanned(0.18, 0.82)
            motif.specks.append(dot(along2, lat_at(run, along2) + rng.sign() * amp))


def build_family_stages(key: str, seed: int) -> dict[str, Motif]:
    rhythm = RHYTHM[key]
    gapped = gapped_spine(
        Rng(seed),
        run_range=rhythm["run"],
        gap_range=rhythm["gap"],
    )
    gaps = spine_gaps(gapped.spine)
    warp_rng = Rng(seed ^ 0xA5C3E91)
    warps = [plan_run_warp(run, warp_rng) for run in gapped.spine]
    links = plan_warp_links(warps, Rng(seed ^ 0x2F4A91C))

    s1 = clone_motif(gapped)
    s2 = Motif(spine=apply_warp(warps, 0.5, links))
    s3 = Motif(spine=apply_warp(warps, 1.0, links))
    add_gap_debris(s3, gaps, Rng(seed ^ 0x51A2C0D))
    s4 = clone_motif(s3)
    add_side_points(s4, s4.spine, Rng(seed ^ 0x7B10E33))
    return {"s1": s1, "s2": s2, "s3": s3, "extreme": s4}


def mask_stem(key: str, stage: int, compact: bool) -> str:
    slot = "-slot" if compact else ""
    suffix = "" if stage == 4 else f"-s{stage}"
    return f"{key}{slot}{suffix}"


def mask_url(stem: str) -> str:
    return f'url("./rule-{stem}.svg?v={MASK_CACHE[stem]}")'


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
    for stage in (1, 2, 3):
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
    "extreme": "",
    "s1": "-s1",
    "s2": "-s2",
    "s3": "-s3",
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
    h_open = (ROOT / "rule-h.svg").read_text(encoding="utf-8")
    h2_open = (ROOT / "rule-h2.svg").read_text(encoding="utf-8")
    v_open = (ROOT / "rule-v.svg").read_text(encoding="utf-8")
    v2_open = (ROOT / "rule-v2.svg").read_text(encoding="utf-8")
    assert "M0 5" in h_open
    assert "M0 5" in h2_open
    assert h_open != h2_open
    assert v_open != v2_open
    assert "M5 0" in v_open
    assert "M5 0" in v2_open
    print("unique vs h/v (not reverse copies)")


if __name__ == "__main__":
    if "--css-only" in sys.argv:
        emit_mask_css()
    else:
        main()
