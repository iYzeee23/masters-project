# Помоћна анализа: које везнике и обрте кандидат стварно користи у свом ранијем раду.
import re
import sys
from docx import Document

sys.stdout.reconfigure(encoding="utf-8")

d = Document(r"C:\Fakultet\Zavrsni\Pisanje master rada\Diplomski rad Predrag Pesic.docx")
dip = "\n".join(p.text for p in d.paragraphs)
rd = max(len(re.findall(r"[.!?]\s", dip)), 1)

izrazi = ["односно", "то јест", "као што", "због тога", "зато што", "јер ", "чиме",
          "тако да", "на тај начин", "у том смислу", "поред", "такође", "затим",
          "уз то", "при томе", "омогућава", "обезбеђује", "приказан",
          "имплементиран", "коришћен", "реализован", "у ту сврху", "с обзиром на то"]
print("реченица у дипломском: %d" % rd)
print()
for m in izrazi:
    n = len(re.findall(re.escape(m), dip))
    if n:
        print("%-18s %4d  (%4.1f%%)" % (m.strip(), n, n / rd * 100))
