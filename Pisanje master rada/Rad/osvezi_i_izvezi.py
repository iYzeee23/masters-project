# -*- coding: utf-8 -*-
"""
osvezi_i_izvezi.py — отвара готов документ у алату Microsoft Word, освежава сва поља
(садржај, списак слика, списак табела, аутоматска нумерација) и извози PDF.

Покретање:
  .venv\\Scripts\\python.exe "Pisanje master rada\\Rad\\osvezi_i_izvezi.py"
"""

import sys
from pathlib import Path

try:
    import win32com.client as win32
except ImportError:
    sys.exit("Недостаје пакет pywin32. Инсталирајте га наредбом: pip install pywin32")

ROOT = Path(__file__).resolve().parents[2]
DOCX = ROOT / "Pisanje master rada" / "Master rad - Predrag Pesic.docx"
PDF = ROOT / "Pisanje master rada" / "Master rad - Predrag Pesic.pdf"

WD_FORMAT_PDF = 17
WD_STATISTIC_PAGES = 2
WD_STATISTIC_WORDS = 0

word = win32.Dispatch("Word.Application")
word.Visible = False
word.DisplayAlerts = 0

doc = word.Documents.Open(str(DOCX))
try:
    # Освежавање мора да се обави више пута, јер померање садржаја мења бројеве страна.
    for _ in range(3):
        doc.Fields.Update()
        for toc in doc.TablesOfContents:
            toc.Update()
        for tof in doc.TablesOfFigures:
            tof.Update()

    strana = doc.ComputeStatistics(WD_STATISTIC_PAGES)
    reci = doc.ComputeStatistics(WD_STATISTIC_WORDS)

    doc.Save()
    doc.SaveAs(str(PDF), FileFormat=WD_FORMAT_PDF)
    print(f"Страна: {strana}")
    print(f"Речи: {reci}")
    print(f"PDF: {PDF}")
finally:
    doc.Close(SaveChanges=0)
    word.Quit()
