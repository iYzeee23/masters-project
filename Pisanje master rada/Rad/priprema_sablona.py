# -*- coding: utf-8 -*-
"""
priprema_sablona.py — pretvara zvanični .dotx šablon u .docx osnovu za pisanje rada.

Word šablon (.dotx) i dokument (.docx) razlikuju se samo po deklarisanom tipu
sadržaja glavnog dela paketa, pa je dovoljno izmeniti [Content_Types].xml.
Skript zatim uklanja sav tekst uputstva, a zadržava definicije stilova,
podešavanja stranice, numeraciju i zaglavlja.

Pokretanje:
  .venv\\Scripts\\python.exe "Pisanje master rada\\Rad\\priprema_sablona.py"
"""

import shutil
import re
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOTX = ROOT / "Pisanje master rada" / "Preporuke oblikovanje master rada.dotx"
OSNOVA = ROOT / "Pisanje master rada" / "Rad" / "osnova.docx"

STARI = "application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml"
NOVI = "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"


def poravnaj_podnozje_desno(xml: str) -> str:
    """Премешта број стране у доњи десни угао, како траже упутства."""
    def zameni(m):
        pasus = m.group(0)
        if "PAGE" not in pasus:
            return pasus
        if "<w:jc " in pasus:
            return re.sub(r'<w:jc w:val="\w+"/>', '<w:jc w:val="right"/>', pasus)
        if "<w:pPr>" in pasus:
            return pasus.replace("<w:pPr>", '<w:pPr><w:jc w:val="right"/>', 1)
        return pasus.replace("<w:p>", '<w:p><w:pPr><w:jc w:val="right"/></w:pPr>', 1)

    return re.sub(r"<w:p\b.*?</w:p>", zameni, xml, flags=re.S)


OSNOVA.parent.mkdir(parents=True, exist_ok=True)
if OSNOVA.exists():
    OSNOVA.unlink()

with zipfile.ZipFile(DOTX) as src, zipfile.ZipFile(OSNOVA, "w", zipfile.ZIP_DEFLATED) as dst:
    for item in src.infolist():
        data = src.read(item.filename)
        if item.filename == "[Content_Types].xml":
            data = data.replace(STARI.encode(), NOVI.encode())
        elif item.filename.startswith("word/footer"):
            data = poravnaj_podnozje_desno(data.decode("utf-8")).encode("utf-8")
        dst.writestr(item, data)

print(f"Napravljeno: {OSNOVA}")

from docx import Document  # noqa: E402

doc = Document(str(OSNOVA))
print(f"\nParagrafa u šablonu: {len(doc.paragraphs)}")
print("\nDostupni stilovi pasusa:")
for s in doc.styles:
    if s.type is not None and "PARAGRAPH" in str(s.type):
        print(f"  - {s.name}")
print("\nDostupni stilovi znakova:")
for s in doc.styles:
    if s.type is not None and "CHARACTER" in str(s.type):
        print(f"  - {s.name}")
print("\nDostupni stilovi tabela:")
for s in doc.styles:
    if s.type is not None and "TABLE" in str(s.type):
        print(f"  - {s.name}")
