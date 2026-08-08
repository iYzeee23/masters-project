# -*- coding: utf-8 -*-
"""Проверава где се на страни исписује број стране."""
import sys
from pathlib import Path

import fitz

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parents[2]
doc = fitz.open(ROOT / "Pisanje master rada" / "Master rad - Predrag Pesic.pdf")

for i in (5, 20, 45):
    strana = doc[i]
    print(f"--- страна {i + 1}  ({strana.rect.width:.0f} x {strana.rect.height:.0f}) ---")
    for blok in strana.get_text("blocks"):
        x0, y0, x1, y1, tekst = blok[0], blok[1], blok[2], blok[3], blok[4].strip()
        if y0 < 90 or y1 > strana.rect.height - 60:
            print(f"  x={x0:6.1f} y={y0:6.1f}  {tekst[:50]!r}")
