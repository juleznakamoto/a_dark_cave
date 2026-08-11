"""Render balance_scale.svg to PNG for inspection."""
import re
from pathlib import Path

try:
    import cairosvg
except ImportError:
    import subprocess
    subprocess.check_call(["pip", "install", "cairosvg", "-q"])
    import cairosvg

src = Path(r"c:\Users\bauer\dev\a_dark_cave\client\public\icons\balance_scale.svg")
# dark background so white icon is visible
svg = src.read_text(encoding="utf-8")
# wrap on dark bg
wrapped = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="#222"/>
  <g transform="translate(100,100) scale(1.9)">
    {re.sub(r'^\\s*<\\?xml[^>]*>', '', svg)}
  </g>
</svg>
'''
out = Path(r"c:\Users\bauer\dev\a_dark_cave\tmp_balance_scale.png")
cairosvg.svg2png(bytestring=wrapped.encode("utf-8"), write_to=str(out), output_width=400, output_height=400)
print("wrote", out)
