# -*- coding: utf-8 -*-
"""Провера подножја: положај броја стране."""
import re
import sys
import zipfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parents[2]

with zipfile.ZipFile(ROOT / "Pisanje master rada" / "Rad" / "osnova.docx") as z:
    for ime in sorted(n for n in z.namelist() if "footer" in n or "header" in n):
        xml = z.read(ime).decode("utf-8")
        jc = re.findall(r'<w:jc w:val="(\w+)"', xml)
        ima_broj = "PAGE" in xml
        tekst = re.sub(r"<[^>]+>", "", xml).strip()[:60]
        print(f"{ime:22s} poravnanje={jc} broj={ima_broj} tekst={tekst!r}")
