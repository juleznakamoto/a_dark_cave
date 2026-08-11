from pathlib import Path

p = Path("ARCHITECTURE.md")
t = p.read_text(encoding="utf-8")
old = "trader = balance scale"
new = "trader = treasure chest"
if old not in t:
    raise SystemExit("blurb not found")
p.write_text(t.replace(old, new, 1), encoding="utf-8")
print("ok")
