"""Rebuild client/public/fonts/noto-symbol-compat.woff2.

Noto Sans Symbols 2 (Google Fonts slices) omits several UI glyphs we already use
(feast ⟡, fog ≋, mountain ⛰, heartfire dots, some shop marks). This script
downloads OFL Noto sources and subsets those codepoints into one small face.

Keep CODEPOINTS in sync with NOTO_SYMBOL_COMPAT_CODEPOINTS in
client/src/lib/notoSansSymbols2FontFace.ts.
"""
from __future__ import annotations

import tempfile
import urllib.request
from pathlib import Path

from fontTools.merge import Merger
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "client" / "public" / "fonts" / "noto-symbol-compat.woff2"

# Must match NOTO_SYMBOL_COMPAT_CODEPOINTS.
CODEPOINTS = [
    0x2058,
    0x2059,
    0x2193,
    0x2234,
    0x224B,
    0x2629,
    0x26B5,
    0x26E4,
    0x26EF,
    0x26F0,
    0x2720,
    0x27D0,
    0x27D1,
    0x27E1,
    0x29C8,
    0x1F70B,
]

SOURCES = [
    (
        "https://github.com/google/fonts/raw/main/ofl/notosansmath/NotoSansMath-Regular.ttf",
        "NotoSansMath-Regular.ttf",
        None,
    ),
    (
        "https://github.com/google/fonts/raw/main/ofl/notosanssymbols/NotoSansSymbols%5Bwght%5D.ttf",
        "NotoSansSymbols.ttf",
        {"wght": 400},
    ),
    (
        "https://github.com/google/fonts/raw/main/ofl/notosans/NotoSans%5Bwdth%2Cwght%5D.ttf",
        "NotoSans.ttf",
        {"wght": 400, "wdth": 100},
    ),
]


def cmap_of(path: Path) -> set[int]:
    font = TTFont(str(path))
    cps: set[int] = set()
    for table in font["cmap"].tables:
        cps.update(table.cmap.keys())
    return cps


def set_family_name(font: TTFont, family: str) -> None:
    ps_name = family.replace(" ", "")
    for rec in font["name"].names:
        if rec.nameID in (1, 4, 16):
            rec.toUnicode()
            rec.string = family
        elif rec.nameID == 6:
            rec.toUnicode()
            rec.string = ps_name


def subset_needed(src: Path, dest: Path, needed: set[int]) -> set[int]:
    present = cmap_of(src) & needed
    if not present:
        return set()
    font = TTFont(str(src))
    unicodes = ",".join(f"{cp:04X}" for cp in sorted(present))
    # Import here so the module stays importable without subset extra on --help.
    from fontTools.subset import Options, Subsetter

    options = Options()
    options.layout_features = []
    options.hinting = False
    options.desubroutinize = True
    options.drop_tables += ["GSUB", "GPOS", "GDEF", "MATH"]
    subsetter = Subsetter(options=options)
    subsetter.populate(unicodes=present)
    subsetter.subset(font)
    keep = {
        "glyf",
        "loca",
        "head",
        "hhea",
        "hmtx",
        "maxp",
        "cmap",
        "name",
        "OS/2",
        "post",
    }
    for tag in list(font.keys()):
        if tag not in keep:
            del font[tag]
    font.save(str(dest))
    print(f"  {src.name}: {len(present)} glyphs ({unicodes})")
    return present


def main() -> None:
    needed = set(CODEPOINTS)
    with tempfile.TemporaryDirectory(prefix="adc-noto-compat-") as tmp_name:
        tmp = Path(tmp_name)
        slices: list[Path] = []
        covered: set[int] = set()

        for url, filename, instance in SOURCES:
            raw = tmp / filename
            print(f"Downloading {filename}...")
            urllib.request.urlretrieve(url, raw)
            if instance:
                instantiated = tmp / f"inst-{filename}"
                font = TTFont(str(raw))
                instantiateVariableFont(font, instance, inplace=True)
                font.save(str(instantiated))
                raw = instantiated
            slice_path = tmp / f"sub-{filename}"
            covered |= subset_needed(raw, slice_path, needed - covered)
            if slice_path.exists() and slice_path.stat().st_size > 0 and cmap_of(slice_path):
                slices.append(slice_path)

        missing = needed - covered
        if missing:
            raise SystemExit(
                "Source fonts still missing: "
                + ", ".join(f"U+{cp:04X}" for cp in sorted(missing))
            )

        print("Merging...")
        merged = Merger().merge([str(p) for p in slices])
        set_family_name(merged, "Noto Symbol Compat")
        OUT.parent.mkdir(parents=True, exist_ok=True)
        merged.flavor = "woff2"
        merged.save(str(OUT))

    verify = cmap_of(OUT)
    if verify != needed:
        raise SystemExit(
            f"Output cmap mismatch. extra={verify - needed} missing={needed - verify}"
        )
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes, {len(verify)} glyphs)")


if __name__ == "__main__":
    main()
