from pathlib import Path

p = Path("ARCHITECTURE.md")
t = p.read_text(encoding="utf-8")
old = "trader = treasure chest"
new = "trader = coin stack"
if old not in t:
    # tolerate earlier wording
    if "trader = balance scale" in t:
        t = t.replace("trader = balance scale", new, 1)
    else:
        raise SystemExit("blurb not found")
else:
    t = t.replace(old, new, 1)
p.write_text(t, encoding="utf-8")
print("ok")
