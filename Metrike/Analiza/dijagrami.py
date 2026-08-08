# -*- coding: utf-8 -*-
"""
dijagrami.py — црта два схематска приказа која се користе у раду.

Излаз:
  Metrike/Slike/dijagram-arhitekture.png
  Metrike/Slike/dijagram-ai-toka.png
"""

from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch

ROOT = Path(__file__).resolve().parents[2]
SLIKE = ROOT / "Metrike" / "Slike"
SLIKE.mkdir(parents=True, exist_ok=True)

plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "font.size": 9,
    "figure.dpi": 200,
    "savefig.dpi": 200,
    "savefig.bbox": "tight",
})


def kutija(ax, x, y, w, h, tekst, boja="#f2f2f2", velicina=9, debljina="normal"):
    ax.add_patch(FancyBboxPatch(
        (x, y), w, h, boxstyle="round,pad=0.012,rounding_size=0.02",
        linewidth=1.1, edgecolor="black", facecolor=boja))
    ax.text(x + w / 2, y + h / 2, tekst, ha="center", va="center",
            fontsize=velicina, fontweight=debljina, linespacing=1.35)


def strelica(ax, xy_od, xy_do, stil="-|>", isprekidana=False, natpis=None, pomeraj=(0, 0)):
    ax.add_patch(FancyArrowPatch(
        xy_od, xy_do, arrowstyle=stil, mutation_scale=12,
        linewidth=1.0, color="black",
        linestyle="--" if isprekidana else "-",
        shrinkA=2, shrinkB=2))
    if natpis:
        mx = (xy_od[0] + xy_do[0]) / 2 + pomeraj[0]
        my = (xy_od[1] + xy_do[1]) / 2 + pomeraj[1]
        ax.text(mx, my, natpis, ha="center", va="center", fontsize=7.5,
                bbox=dict(boxstyle="round,pad=0.15", fc="white", ec="none"))


# ─────────────────────────────────────────────────────────────
# ДИЈАГРАМ АРХИТЕКТУРЕ
# ─────────────────────────────────────────────────────────────

fig, ax = plt.subplots(figsize=(8.2, 5.6))
ax.set_xlim(0, 10)
ax.set_ylim(0, 7.6)
ax.axis("off")

ax.add_patch(FancyBboxPatch((0.15, 5.05), 9.7, 2.4,
             boxstyle="round,pad=0.02,rounding_size=0.05",
             linewidth=1.0, edgecolor="#606060", facecolor="#fbfbfb", linestyle=":"))
ax.text(0.35, 7.25, "Клијентски слој (Angular)", fontsize=9.5, fontweight="bold", va="center")

kutija(ax, 0.35, 6.10, 2.25, 0.90, "Странице\nВизуелизација,\nПоређење, Полигон", velicina=8)
kutija(ax, 2.75, 6.10, 2.25, 0.90, "Приказ мреже\nHTML5 Canvas", velicina=8)
kutija(ax, 5.15, 6.10, 2.25, 0.90, "Алатна трака\nи водич", velicina=8)
kutija(ax, 7.55, 6.10, 2.10, 0.90, "Услуге стања,\nприказа и\nкомуникације", velicina=8)
kutija(ax, 1.55, 5.18, 2.85, 0.72, "Алгоритми\nса бележењем трага", boja="#e4e4e4", velicina=8)
kutija(ax, 5.60, 5.18, 2.85, 0.72, "Систем догађаја\n(осам врста)", boja="#e4e4e4", velicina=8)

ax.add_patch(FancyBboxPatch((0.15, 2.05), 9.7, 2.3,
             boxstyle="round,pad=0.02,rounding_size=0.05",
             linewidth=1.0, edgecolor="#606060", facecolor="#fbfbfb", linestyle=":"))
ax.text(0.35, 4.15, "Серверски слој (Express)", fontsize=9.5, fontweight="bold", va="center")

kutija(ax, 0.35, 3.00, 2.25, 0.90, "REST сучеље\nседам група\nпутања", velicina=8)
kutija(ax, 2.75, 3.00, 2.25, 0.90, "Генератори мапа\nи покретање\nалгоритама", velicina=8)
kutija(ax, 5.15, 3.00, 2.25, 0.90, "Логика полигона\nи бодовање", velicina=8)
kutija(ax, 7.55, 3.00, 2.10, 0.90, "Посредник ка\nјезичким\nмоделима", velicina=8)
kutija(ax, 1.05, 2.13, 2.85, 0.72, "Провера токена\nи улазних података", boja="#e4e4e4", velicina=8)
kutija(ax, 5.60, 2.13, 2.85, 0.72, "Подсистем\nза мерење", boja="#e4e4e4", velicina=8)

kutija(ax, 0.35, 0.55, 4.35, 1.05,
       "База података (MongoDB)\nкорисници, мапе, покретања,\nтрагови, покушаји, мерења",
       boja="#ededed", velicina=8)
kutija(ax, 5.30, 0.55, 4.35, 1.05,
       "Спољашњи сервиси\nGitHub Models (језички модели)\nCloudinary (слике профила)",
       boja="#ededed", velicina=8)

strelica(ax, (5.0, 5.05), (5.0, 4.35), natpis="HTTP / WebSocket", pomeraj=(0, 0.0))
strelica(ax, (2.5, 2.05), (2.5, 1.60))
strelica(ax, (7.5, 2.05), (7.5, 1.60))

fig.savefig(SLIKE / "dijagram-arhitekture.png")
plt.close(fig)

# ─────────────────────────────────────────────────────────────
# ДИЈАГРАМ ТОКА У СЛОЈУ ВЕШТАЧКЕ ИНТЕЛИГЕНЦИЈЕ
# ─────────────────────────────────────────────────────────────

fig, ax = plt.subplots(figsize=(8.2, 4.8))
ax.set_xlim(0, 10)
ax.set_ylim(-0.35, 5.6)
ax.axis("off")

SVETLA = "#f4f4f4"
TAMNA = "#c2c2c2"

kutija(ax, 0.25, 4.35, 2.3, 0.85, "Корисник\nзадаје захтев", boja=SVETLA, velicina=8)
kutija(ax, 3.35, 4.35, 3.3, 0.85, "Клијент прикупља контекст\nи шаље га серверу", boja=SVETLA, velicina=8)
kutija(ax, 7.45, 4.35, 2.3, 0.85, "Провера улаза\nшемама Zod", boja=SVETLA, velicina=8)

kutija(ax, 7.45, 2.90, 2.3, 0.95, "Позив језичком\nмоделу\n(издвајање намере)", boja=TAMNA, velicina=8)
kutija(ax, 3.35, 2.90, 3.3, 0.95,
       "Сервер сам израчунава\nпокретање свих алгоритама\nи оцењивање мапа", boja=SVETLA, velicina=8)
kutija(ax, 0.25, 2.90, 2.3, 0.95, "Провера\nпроходности\nпретрагом у ширину", boja=SVETLA, velicina=8)

kutija(ax, 3.35, 1.45, 3.3, 0.95,
       "Позив језичком моделу\nобјашњење проверених\nрезултата (SR и EN)", boja=TAMNA, velicina=8)
kutija(ax, 7.45, 1.45, 2.3, 0.95, "Обрада одговора\nу заштићеном\nблоку", boja=SVETLA, velicina=8)

kutija(ax, 3.35, 0.20, 3.3, 0.85,
       "Кориснику се приказују\nобјашњење и измерене вредности", boja=SVETLA, velicina=8)

strelica(ax, (2.55, 4.77), (3.35, 4.77))
strelica(ax, (6.65, 4.77), (7.45, 4.77))
strelica(ax, (8.60, 4.35), (8.60, 3.85))
strelica(ax, (7.45, 3.37), (6.65, 3.37), natpis="намера", pomeraj=(0, 0.30))
strelica(ax, (3.35, 3.37), (2.55, 3.37))
strelica(ax, (5.00, 2.90), (5.00, 2.40), natpis="проверени подаци", pomeraj=(0, 0.02))
strelica(ax, (6.65, 1.92), (7.45, 1.92))
strelica(ax, (7.90, 1.45), (6.65, 0.85), isprekidana=True, natpis="одговор", pomeraj=(0.15, 0.30))
strelica(ax, (5.00, 1.45), (5.00, 1.05))

ax.text(0.25, -0.20, "Тамније означени кораци захтевају позив спољашњем сервису.",
        fontsize=7.5, style="italic", va="center")

fig.savefig(SLIKE / "dijagram-ai-toka.png")
plt.close(fig)

print(f"Сачувано у: {SLIKE}")
