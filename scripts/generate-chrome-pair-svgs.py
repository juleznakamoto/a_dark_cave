#!/usr/bin/env python3
"""Chrome seam tiles. Unique h/h2/v/v2 vocabularies, not reverse/flip copies.

Prefer disconnected chips, shards, and dots over ramps that stay glued to
the hairline. Rebuild SVGs + mask CSS with no args; `--css-only` skips tiles.
"""

from __future__ import annotations

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
    "h": 19,
    "v": 19,
    "h2": 4,
    "v2": 4,
    "h-slot": 6,
    "v-slot": 6,
    "h2-slot": 5,
    "v2-slot": 5,
    "h-s1": 5,
    "h-s2": 5,
    "h-s3": 5,
    "v-s1": 5,
    "v-s2": 5,
    "v-s3": 5,
    "h2-s1": 4,
    "h2-s2": 4,
    "h2-s3": 4,
    "v2-s1": 4,
    "v2-s2": 4,
    "v2-s3": 4,
    "h-slot-s1": 6,
    "h-slot-s2": 6,
    "h-slot-s3": 6,
    "v-slot-s1": 6,
    "v-slot-s2": 6,
    "v-slot-s3": 6,
    "h2-slot-s1": 5,
    "h2-slot-s2": 5,
    "h2-slot-s3": 5,
    "v2-slot-s1": 5,
    "v2-slot-s2": 5,
    "v2-slot-s3": 5,
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
    return Poly([(along, lat)], cap="round")


def shard(a0: float, a1: float, lat0: float, lat1: float | None = None) -> Poly:
    return Poly([(a0, lat0), (a1, lat1 if lat1 is not None else lat0)], cap="speck")


# Authored 720 vocabularies (h/v parsed from the pre-disconnect tiles).
H_720: dict[str, Motif] = {
    "s1": Motif(
        spine=[
            [(0, 5), (210, 5)],
            [(231, 5), (480, 5), (488, 5.7), (502, 5.65), (508, 5), (720, 5)],
        ],
        chips=[
            [(214.6, 4.12), (226.4, 4.16)],
        ],
    ),
    "s2": Motif(
        spine=[
            [(0, 5), (88, 5)],
            [(114, 5), (240, 5)],
            [(246, 5), (318, 5), (322, 6.3), (334, 6.2), (340, 5), (500, 5)],
            [(528, 5), (620, 5)],
            [(626, 5), (720, 5)],
        ],
        chips=[
            [(94.2, 3.55), (108.4, 3.68)],
            [(508.4, 3.35), (522.2, 3.48)],
        ],
    ),
    "s3": Motif(
        spine=[
            [(0, 5), (22, 5)],
            [(37, 5), (88, 5), (95, 7.4), (108, 7.3), (114, 5), (188, 5)],
            [(196, 5), (240, 5)],
            [(262, 5), (318, 5)],
            [(342, 5), (400, 5)],
            [(412, 5), (478, 5)],
            [(500, 5), (572, 5), (580, 3.3), (592, 3.4), (598, 5), (661, 5)],
            [(676, 5), (720, 5)],
        ],
        chips=[
            [(25.4, 3.15), (32.2, 3.25)],
            [(244.2, 3.05), (256.4, 3.18)],
            [(322.4, 6.75), (336.2, 6.55)],
            [(404.2, 3.4), (408.6, 3.55)],
            [(482.4, 7.05), (494.2, 7.15)],
            [(663.2, 6.35), (672.4, 6.48)],
        ],
    ),
    "extreme": Motif(
        spine=[
            [(0, 5), (22, 5)],
            [(33.5, 5), (88, 5), (95.2, 8.1), (104.5, 7.55), (107.3, 5), (131, 5)],
            [(136.95, 5), (188, 5)],
            [(193, 5), (201, 5), (206, 5)],
            [(212.2, 5), (213.8, 5), (228, 5)],
            [(232, 5), (277, 5)],
            [(296.4, 5), (318, 5)],
            [(324.2, 5), (401, 5)],
            [(451, 5), (478, 5)],
            [(490.6, 5), (511, 5)],
            [(515, 5), (572, 5), (579.4, 5)],
            [(588.2, 5), (593, 5), (661, 5), (662.45, 6.3), (666.2, 7.25), (668.7, 5), (672, 5)],
            [(708, 5), (720, 5)],
        ],
        chips=[
            [(24.7, 2.6), (29.4, 2.9)],
            [(131.85, 3.4), (135.8, 2.9)],
            [(207.4, 6.95), (211, 6.4)],
            [(280.8, 1.7), (289.6, 2.45)],
            [(319.4, 7.42), (322.1, 7.28)],
            [(406.9, 2.65), (412.6, 2.05)],
            [(481.2, 6.8), (487.5, 7.75)],
            [(580.5, 2.9), (586.2, 3.5)],
        ],
        specks=[
            shard(418.6, 421.4, 4.96, 5.08),
            dot(424.9),
            shard(429.2, 431.5, 5.06, 4.92),
            dot(435.4),
            shard(440.1, 441.2, 5, 5.04),
            dot(446.8, 5.05),
            dot(675.2),
            shard(679.6, 684, 4.9, 5.1),
            dot(689.4, 5.04),
            shard(694.8, 696.1, 5, 4.94),
            dot(701.7, 4.97),
            shard(705.2, 706.4, 5.08, 5),
            dot(513.1),
        ],
    ),
}

V_720: dict[str, Motif] = {
    "s1": Motif(
        spine=[
            [(0, 5), (190, 5)],
            [(220, 5), (470, 5), (478, 5.7), (494, 5.65), (500, 5), (720, 5)],
        ],
        chips=[
            [(198, 4.2), (214, 4.22)],
        ],
    ),
    "s2": Motif(
        spine=[
            [(0, 5), (88, 5)],
            [(114, 5), (240, 5)],
            [(246, 5), (318, 5), (322, 6.3), (334, 6.2), (340, 5), (500, 5)],
            [(528, 5), (620, 5)],
            [(626, 5), (720, 5)],
        ],
        chips=[
            [(94.2, 3.55), (108.4, 3.68)],
            [(508.4, 3.35), (522.2, 3.48)],
        ],
    ),
    "s3": Motif(
        spine=[
            [(0, 5), (22, 5)],
            [(37, 5), (88, 5), (95, 7.4), (108, 7.3), (114, 5), (188, 5)],
            [(196, 5), (240, 5)],
            [(262, 5), (318, 5)],
            [(342, 5), (400, 5)],
            [(412, 5), (478, 5)],
            [(500, 5), (572, 5), (580, 3.3), (592, 3.4), (598, 5), (661, 5)],
            [(676, 5), (720, 5)],
        ],
        chips=[
            [(25.4, 3.15), (32.2, 3.25)],
            [(244.2, 3.05), (256.4, 3.18)],
            [(322.4, 6.75), (336.2, 6.55)],
            [(404.2, 3.4), (408.6, 3.55)],
            [(482.4, 7.05), (494.2, 7.15)],
            [(663.2, 6.35), (672.4, 6.48)],
        ],
    ),
    "extreme": Motif(
        spine=[
            [(0, 5), (19, 5)],
            [(30.5, 5), (38, 5)],
            [(44, 5), (95, 5), (97.7, 7.4), (111.5, 8.2), (115.1, 5), (141, 5)],
            [(150.2, 5), (228, 5)],
            [(235.8, 5), (305, 5)],
            [(309, 5), (318, 5)],
            [(352, 5), (360, 5)],
            [(370.8, 5), (430, 5), (436.2, 5)],
            [(440.4, 5), (442.1, 5), (468, 5)],
            [(506, 5), (522, 5)],
            [(533.8, 5), (590, 5)],
            [(594, 5), (618, 5), (626.2, 5)],
            [(635.8, 5), (638.5, 5), (670, 5)],
            [(676.4, 5), (720, 5)],
        ],
        chips=[
            [(26.4, 2.45), (28.8, 3.15)],
            [(147.1, 2.08), (149, 2.18)],
            [(230.8, 6.75), (232.2, 7.6)],
            [(363.8, 8.2), (367.4, 7.3)],
            [(437.5, 3), (439, 2.2)],
            [(525.4, 7.85), (530.4, 6.95)],
            [(627.5, 2.35), (634, 3.4)],
            [(671.85, 6.65), (673.2, 7.5)],
        ],
        specks=[
            shard(321.2, 323.8, 4.92, 5.1),
            dot(327.4),
            dot(331.6, 5.04),
            shard(336.5, 340.2, 4.88, 5.08),
            shard(347.1, 348.4, 5, 5.06),
            dot(471.3),
            shard(476.2, 479, 4.94, 5.1),
            dot(484.8),
            shard(490.4, 494.6, 4.9, 5.06),
            dot(499.1, 5.05),
            shard(503.2, 504, 5, 5),
            dot(592.2),
        ],
    ),
}

# Unique 720 vocabularies. Gap centers sit away from rule-h / rule-v.
H2_720: dict[str, Motif] = {
    "s1": Motif(
        spine=[
            [(0, 5), (152, 5)],
            [(176, 5), (392, 5), (402, 6.35), (414, 6.2), (422, 5), (720, 5)],
        ],
        chips=[[(158, 3.85), (170, 3.92)]],
    ),
    "s2": Motif(
        spine=[
            [(0, 5), (46, 5)],
            [(70, 5), (176, 5)],
            [(188, 5), (298, 5), (306, 6.55), (318, 6.4), (328, 5), (438, 5)],
            [(456, 5), (576, 5)],
            [(608, 5), (720, 5)],
        ],
        chips=[
            [(52, 3.55), (64, 3.62)],
            [(180, 5), (180.02, 5)],
            [(582, 3.48), (600, 3.6)],
        ],
    ),
    "s3": Motif(
        spine=[
            [(0, 5), (18, 5)],
            [(34, 5), (86, 5), (94, 7.15), (108, 6.95), (116, 5), (168, 5)],
            [(184, 5), (236, 5)],
            [(292, 5), (348, 5)],
            [(368, 5), (428, 5)],
            [(444, 5), (476, 5)],
            [(540, 5), (604, 5), (612, 3.35), (624, 3.5), (632, 5), (668, 5)],
            [(686, 5), (720, 5)],
        ],
        chips=[
            [(22, 3.4), (30, 3.52)],
            [(174, 5), (174.02, 5)],
            [(244, 3.25), (258, 3.4)],
            [(352, 6.85), (364, 6.7)],
            [(432, 3.45), (440, 3.55)],
            [(482, 6.9), (496, 7.05)],
            [(672, 6.45), (682, 6.58)],
        ],
    ),
    "extreme": Motif(
        spine=[
            [(0, 5), (44, 5)],
            [(58, 5), (96, 5), (104, 7.85), (112, 7.4), (118, 5), (130, 5)],
            [(138, 5), (142, 5)],
            [(149, 5), (200, 5)],
            [(208, 5), (236, 5)],
            [(288, 5), (316, 5)],
            [(324, 5), (350, 5)],
            [(366, 5), (430, 5), (438, 2.15), (448, 2.55), (455, 5), (478, 5)],
            [(536, 5), (578, 5)],
            [(586, 5), (605, 5)],
            [(614, 5), (648, 5)],
            [(682, 5), (694, 5)],
            [(700, 5), (720, 5)],
        ],
        chips=[
            [(47.2, 2.32), (54.6, 2.55)],
            [(132.4, 6.72), (137.8, 6.55)],
            [(202.2, 2.48), (206.6, 2.62)],
            [(318.5, 7.08), (322.4, 6.92)],
            [(353.4, 7.22), (363.1, 6.95)],
            [(580.2, 2.38), (584.6, 2.52)],
        ],
        specks=[
            shard(242.4, 246.8, 4.94, 5.12),
            dot(252.1),
            shard(258.5, 262.1, 5.08, 4.9),
            dot(268.6, 4.97),
            shard(273.2, 274.8, 5.0, 5.05),
            dot(282.4, 5.04),
            shard(486.2, 490.6, 5.1, 4.88),
            dot(498.4),
            shard(506.8, 511.4, 4.92, 5.06),
            dot(518.2, 5.03),
            shard(524.0, 526.2, 5.0, 4.96),
            dot(532.5),
            dot(145.8),
            dot(609.4),
            dot(652.2),
            shard(658.5, 664.2, 4.88, 5.12),
            dot(670.8),
            shard(675.4, 677.0, 5.1, 5.0),
            dot(696.6),
            shard(694.8, 698.4, 5.08, 4.9),
        ],
    ),
}

# Vertical pair uses a shorter-dash rhythm, not a rotate of H2.
V2_720: dict[str, Motif] = {
    "s1": Motif(
        spine=[
            [(0, 5), (248, 5)],
            [(274, 5), (520, 5), (528, 6.4), (542, 6.28), (548, 5), (720, 5)],
        ],
        chips=[[(254, 3.78), (268, 3.88)]],
    ),
    "s2": Motif(
        spine=[
            [(0, 5), (72, 5)],
            [(98, 5), (210, 5)],
            [(218, 5), (340, 5), (348, 3.5), (360, 3.62), (368, 5), (488, 5)],
            [(516, 5), (628, 5)],
            [(640, 5), (720, 5)],
        ],
        chips=[
            [(78, 6.42), (92, 6.3)],
            [(214, 5), (214.02, 5)],
            [(494, 6.55), (510, 6.42)],
        ],
    ),
    "s3": Motif(
        spine=[
            [(0, 5), (28, 5)],
            [(44, 5), (102, 5)],
            [(118, 5), (176, 5), (184, 7.05), (196, 6.88), (204, 5), (248, 5)],
            [(268, 5), (332, 5)],
            [(348, 5), (412, 5)],
            [(428, 5), (492, 5)],
            [(548, 5), (610, 5), (618, 3.28), (630, 3.42), (638, 5), (676, 5)],
            [(694, 5), (720, 5)],
        ],
        chips=[
            [(32, 6.55), (40, 6.4)],
            [(108, 3.38), (114, 3.48)],
            [(254, 3.3), (262, 3.42)],
            [(336, 6.8), (344, 6.68)],
            [(416, 3.5), (424, 3.6)],
            [(500, 6.95), (514, 7.1)],
            [(680, 6.4), (690, 6.52)],
        ],
    ),
    "extreme": Motif(
        spine=[
            [(0, 5), (26, 5)],
            [(36, 5), (88, 5)],
            [(102, 5), (132, 5), (140, 7.62), (150, 7.18), (158, 5), (168, 5)],
            [(214, 5), (248, 5)],
            [(256, 5), (282, 5)],
            [(290, 5), (295, 5)],
            [(304, 5), (318, 5)],
            [(326, 5), (378, 5)],
            [(392, 5), (430, 5), (438, 2.28), (450, 2.62), (458, 5), (470, 5)],
            [(518, 5), (578, 5)],
            [(586, 5), (590, 5)],
            [(598, 5), (655, 5)],
            [(688, 5), (692, 5)],
            [(702, 5), (720, 5)],
        ],
        chips=[
            [(29.4, 2.42), (33.8, 2.58)],
            [(92.2, 6.88), (98.6, 6.7)],
            [(250.4, 2.55), (254.8, 2.7)],
            [(284.2, 7.15), (288.6, 6.98)],
            [(320.2, 2.42), (324.6, 2.58)],
            [(381.5, 7.28), (388.4, 7.05)],
            [(580.4, 6.82), (584.8, 6.66)],
        ],
        specks=[
            shard(174.2, 178.6, 5.08, 4.9),
            dot(184.4),
            shard(190.8, 196.2, 4.94, 5.1),
            dot(202.5, 5.02),
            shard(208.0, 210.4, 5.0, 5.06),
            shard(476.4, 480.8, 4.88, 5.12),
            dot(488.6),
            shard(496.2, 501.8, 5.06, 4.92),
            dot(508.4, 4.98),
            dot(594.2),
            dot(660.4),
            shard(666.8, 672.4, 5.12, 4.86),
            dot(678.6),
            shard(682.8, 684.6, 5.0, 5.04),
            dot(696.2),
        ],
    ),
}

WANDER = {
    "s1": dict(run=(150, 280), gap=(12, 26), ramp_p=0.07, disc_p=0.34, wide_p=0.16, amp=(0.9, 1.45)),
    "s2": dict(run=(58, 128), gap=(8, 30), ramp_p=0.10, disc_p=0.46, wide_p=0.26, amp=(1.2, 2.15)),
    "s3": dict(run=(30, 88), gap=(8, 38), ramp_p=0.12, disc_p=0.64, wide_p=0.36, amp=(1.5, 2.7)),
    "extreme": dict(run=(20, 72), gap=(6, 50), ramp_p=0.08, disc_p=0.76, wide_p=0.44, amp=(1.8, 3.25)),
}

# Keep this share of existing 720 ramps glued to the hairline; the rest break off.
KEEP_RAMP = {"s1": 0.38, "s2": 0.20, "s3": 0.12, "extreme": 0.08}
EXTRA_DISC = {"s1": 1, "s2": 2, "s3": 3, "extreme": 2}
ON_CENTER = 0.22


def disconnect_run(
    run: list[tuple[float, float]],
    rng: Rng,
    keep_p: float,
) -> tuple[list[list[tuple[float, float]]], list[list[tuple[float, float]]]]:
    groups: list[tuple[bool, list[tuple[float, float]]]] = []
    for pt in run:
        on = abs(pt[1] - CENTER) <= ON_CENTER
        if not groups or groups[-1][0] != on:
            groups.append((on, [pt]))
        else:
            groups[-1][1].append(pt)

    spines: list[list[tuple[float, float]]] = []
    chips: list[list[tuple[float, float]]] = []
    buf: list[tuple[float, float]] = []

    def flush() -> None:
        if len(buf) >= 2:
            spines.append([(a, CENTER) if abs(lat - CENTER) <= ON_CENTER else (a, lat) for a, lat in buf])
        buf.clear()

    for is_on, pts in groups:
        if is_on:
            buf.extend((a, CENTER) for a, _ in pts)
            continue
        if rng.chance(keep_p):
            buf.extend(pts)
            continue
        flush()
        if len(pts) == 1:
            along, lat = pts[0]
            chips.append([(along, lat), (along + 4.2, lat + rng.spanned(-0.12, 0.12))])
        else:
            chips.append(pts)
    flush()
    return spines, chips


def disconnect_motif(base: Motif, stage: str, rng: Rng) -> Motif:
    keep_p = KEEP_RAMP[stage]
    spine: list[list[tuple[float, float]]] = []
    chips = [list(chip) for chip in base.chips]
    for run in base.spine:
        more_spine, more_chips = disconnect_run(run, rng, keep_p)
        spine.extend(more_spine)
        chips.extend(more_chips)
    return Motif(spine=spine, chips=chips, specks=list(base.specks))


def extra_disconnected(motif: Motif, stage: str, rng: Rng) -> Motif:
    n = EXTRA_DISC[stage]
    amp = WANDER[stage]["amp"]
    covered: list[tuple[float, float]] = []
    for run in motif.spine:
        if len(run) >= 2:
            covered.append((run[0][0], run[-1][0]))
    covered.sort()
    gaps: list[tuple[float, float]] = []
    cursor = 0.0
    for a, b in covered:
        if a - cursor >= 10:
            gaps.append((cursor, a))
        cursor = max(cursor, b)
    if 720 - cursor >= 10:
        gaps.append((cursor, 720.0))
    rng_gaps = list(gaps)
    for i in range(len(rng_gaps) - 1, 0, -1):
        j = rng.u32() % (i + 1)
        rng_gaps[i], rng_gaps[j] = rng_gaps[j], rng_gaps[i]
    added = 0
    for g0, g1 in rng_gaps:
        if added >= n:
            break
        span = g1 - g0
        if span < 8:
            continue
        occupied = False
        for chip in motif.chips:
            mid = (chip[0][0] + chip[-1][0]) / 2
            if g0 <= mid <= g1:
                occupied = True
                break
        if occupied:
            continue
        if rng.chance(0.55):
            a = g0 + rng.spanned(1.2, span * 0.45)
            b = min(g1 - 1.0, a + rng.spanned(3.5, min(12.0, span - 2.5)))
            lat = CENTER + rng.sign() * rng.spanned(*amp)
            motif.chips.append([(a, lat), (b, lat + rng.spanned(-0.2, 0.2))])
        else:
            motif.specks.append(
                dot(g0 + span * rng.spanned(0.3, 0.7), CENTER + rng.spanned(-0.08, 0.08))
            )
        added += 1
    return motif


def prepare_720(base: Motif, stage: str, rng: Rng) -> Motif:
    return extra_disconnected(disconnect_motif(base, stage, rng), stage, rng)


def wander(base: Motif, stage: str, rng: Rng) -> Motif:
    cfg = WANDER[stage]
    out = Motif(
        spine=[list(run) for run in base.spine],
        chips=[list(chip) for chip in base.chips],
        specks=list(base.specks),
    )
    x = 720.0
    join = min(rng.spanned(22, 52), LENGTH - x - 24)
    out.spine.append([(x, CENTER), (x + join, CENTER)])
    x += join
    while x < LENGTH - 12:
        gap = min(cfg["gap"][0] + rng.unit() * (cfg["gap"][1] - cfg["gap"][0]), LENGTH - 8 - x)
        wide = rng.chance(cfg["wide_p"]) and gap > 22
        if wide:
            fill_wide_gap(out, x, x + gap, rng, stage)
        elif rng.chance(cfg["disc_p"]):
            chip_a = x + rng.spanned(1.5, max(2.0, gap * 0.25))
            chip_b = min(x + gap - 1.2, chip_a + rng.spanned(4.0, min(14.0, gap - 2.5)))
            if chip_b > chip_a + 2:
                lat = CENTER + rng.sign() * rng.spanned(*cfg["amp"])
                out.chips.append([(chip_a, lat), (chip_b, lat + rng.spanned(-0.25, 0.25))])
        elif gap > 8 and rng.chance(0.72):
            if rng.chance(0.4) and gap > 12:
                a = x + gap * rng.spanned(0.25, 0.55)
                b = min(x + gap - 1.0, a + rng.spanned(2.4, 6.5))
                lat0 = CENTER + rng.spanned(-0.12, 0.12)
                out.specks.append(shard(a, b, lat0, lat0 + rng.spanned(-0.16, 0.16)))
            else:
                out.specks.append(dot(x + gap * rng.spanned(0.35, 0.7), CENTER + rng.spanned(-0.08, 0.08)))
        x += gap
        if x >= LENGTH - 10:
            break
        run = min(rng.spanned(*cfg["run"]), LENGTH - x)
        a0 = x
        a1 = x + run
        if run >= 22 and rng.chance(cfg["ramp_p"]):
            amp = rng.sign() * rng.spanned(*cfg["amp"])
            mid0 = a0 + run * rng.spanned(0.22, 0.38)
            mid1 = a0 + run * rng.spanned(0.55, 0.72)
            peak = a0 + run * rng.spanned(0.4, 0.52)
            out.spine.append(
                [
                    (a0, CENTER),
                    (mid0, CENTER),
                    (peak, CENTER + amp),
                    (mid1, CENTER + amp * rng.spanned(0.55, 0.85)),
                    (a1, CENTER),
                ]
            )
        else:
            out.spine.append([(a0, CENTER), (a1, CENTER)])
        x = a1
    if x < LENGTH:
        out.spine.append([(x, CENTER), (LENGTH, CENTER)])
    return out


def fill_wide_gap(out: Motif, a0: float, a1: float, rng: Rng, stage: str) -> None:
    span = a1 - a0
    n = 3 if stage == "s1" else 4 if stage == "s2" else 5 if stage == "s3" else 6
    cursor = a0 + rng.spanned(2.0, 5.0)
    for i in range(n):
        if cursor >= a1 - 3:
            break
        if rng.chance(0.38):
            out.specks.append(dot(cursor, CENTER + rng.spanned(-0.08, 0.08)))
            cursor += rng.spanned(4.5, 9.0)
        else:
            b = min(a1 - 1.0, cursor + rng.spanned(2.2, 6.5))
            lat0 = CENTER + rng.spanned(-0.14, 0.14)
            out.specks.append(shard(cursor, b, lat0, lat0 + rng.spanned(-0.18, 0.18)))
            cursor = b + rng.spanned(3.5, 8.0)
        cursor += span * 0.02 * i


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
    authored = {
        "h": H_720,
        "v": V_720,
        "h2": H2_720,
        "v2": V2_720,
    }
    seeds = {"h": 0x51A2C0D, "h2": 0xA5C3E91, "v": 0x7B10E33, "v2": 0x3D17B4F}
    step = {"h": 13, "h2": 17, "v": 19, "v2": 29}
    built: dict[str, dict[str, Motif]] = {}
    for key, motifs in authored.items():
        built[key] = {}
        for i, (stage, motif) in enumerate(motifs.items()):
            rng = Rng(seeds[key] + i * step[key])
            prepared = prepare_720(motif, stage, rng)
            built[key][stage] = wander(prepared, stage, rng)

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
    assert "M0 5 L22 5" in h_open
    assert "M0 5 L22 5" not in h2_open
    assert "M5 0 L5 19" in v_open
    assert "M5 0 L5 19" not in v2_open
    assert "M3840 5 L3818 5" not in h2_open
    assert "M5 3840 L5 3821" not in v2_open
    print("unique vs h/v (not reverse copies)")


if __name__ == "__main__":
    if "--css-only" in sys.argv:
        emit_mask_css()
    else:
        main()
