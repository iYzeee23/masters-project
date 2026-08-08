# -*- coding: utf-8 -*-
"""Помоћна провера: да ли стилови наслова садрже прелом стране."""
import re
import sys
import zipfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[2]
with zipfile.ZipFile(ROOT / "Pisanje master rada" / "Rad" / "osnova.docx") as z:
    xml = z.read("word/styles.xml").decode("utf-8")

for blok in re.finditer(r"<w:style [^>]*>.*?</w:style>", xml, re.S):
    s = blok.group(0)
    ime = re.search(r'<w:name w:val="([^"]+)"', s)
    if not ime:
        continue
    naziv = ime.group(1)
    if naziv in ("I nivo naslova - Poglavlje", "Sadržaj/Literatura",
                 "Prilog - I nivo naslova", "Oznaka slike", "Oznaka tabele",
                 "Osnovni tekst", "Jednacine", "Referenca"):
        lvl = re.search(r'outlineLvl w:val="(\d+)"', s)
        print(f"{naziv}")
        print(f"   pageBreakBefore : {'pageBreakBefore' in s}")
        print(f"   outlineLvl      : {lvl.group(1) if lvl else '-'}")
        print(f"   keepNext        : {'keepNext' in s}")
