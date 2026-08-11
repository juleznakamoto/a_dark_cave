from pathlib import Path

p = Path("ARCHITECTURE.md")
t = p.read_text(encoding="utf-8")
old = (
    "GameUiIcon.tsx` (CSS-mask white SVG icons from `public/icons/` "
    "for profile/settings/footer/tab menus; trader = balance scale)"
)
new = (
    "GameUiIcon.tsx` (CSS-mask white icons from `public/icons/` "
    "for profile/settings/footer/tab menus; discover/playlight = directional pad; "
    "trader = balance scale)"
)
if old not in t:
    i = t.find("GameUiIcon")
    raise SystemExit(repr(t[i : i + 180]))
p.write_text(t.replace(old, new, 1), encoding="utf-8")
print("ok")
