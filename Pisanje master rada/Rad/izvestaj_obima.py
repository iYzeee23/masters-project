# -*- coding: utf-8 -*-
"""Извештај о томе колико страна заузима свака целина рада."""
import re
import sys
from pathlib import Path

import fitz

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parents[2]
doc = fitz.open(ROOT / "Pisanje master rada" / "Master rad - Predrag Pesic.pdf")

pocetak = []
for i in range(doc.page_count):
    tekst = doc[i].get_text()
    # наслови поглавља исписују се верзалом на врху стране
    for linija in tekst.splitlines()[:6]:
        l = linija.strip()
        if len(l) > 4 and l == l.upper() and re.search(r"[А-ЯЀ-ӿ]", l):
            pocetak.append((i + 1, l))
            break

for j, (str_broj, naslov) in enumerate(pocetak):
    kraj = pocetak[j + 1][0] - 1 if j + 1 < len(pocetak) else doc.page_count
    print(f"{str_broj:3d}–{kraj:3d}  ({kraj - str_broj + 1:2d} стр.)  {naslov}")
print(f"\nУкупно: {doc.page_count} страна")
