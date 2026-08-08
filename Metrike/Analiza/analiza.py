# -*- coding: utf-8 -*-
r"""
analiza.py — statistička obrada rezultata i generisanje grafika za master rad.

Ulaz:
  Metrike/Algoritmi/benchmark-<batch>.csv   (najnoviji batch)
  Metrike/Playground/playground-benchmark.csv
  Metrike/AI/ai-benchmark-*.json

Izlaz:
  Metrike/Analiza/rezultati.json            (svi izračunati brojevi)
  Metrike/Analiza/tabele.md                 (tabele u Markdown formatu)
  Metrike/Slike/*.png                       (grafici, crno-belo čitljivi)

Pokretanje:
  .venv\Scripts\python.exe Metrike\Analiza\analiza.py
"""

import json
import re
import glob
import os
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter
from scipy import stats

# ─────────────────────────────────────────────────────────────
# KONFIGURACIJA
# ─────────────────────────────────────────────────────────────

ROOT = Path(__file__).resolve().parents[2]
METRIKE = ROOT / "Metrike"
SLIKE = METRIKE / "Slike"
ANALIZA = METRIKE / "Analiza"
SLIKE.mkdir(parents=True, exist_ok=True)
ANALIZA.mkdir(parents=True, exist_ok=True)

plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "font.size": 10,
    "axes.titlesize": 11,
    "axes.labelsize": 10,
    "legend.fontsize": 9,
    "xtick.labelsize": 9,
    "ytick.labelsize": 9,
    "figure.dpi": 200,
    "savefig.dpi": 200,
    "savefig.bbox": "tight",
    "axes.grid": True,
    "grid.alpha": 0.3,
    "grid.linestyle": ":",
})

ALGO_ORDER = ["bfs", "dfs", "dijkstra", "a_star", "greedy", "swarm", "convergent_swarm", "zero_one_bfs"]
ALGO_LABEL = {
    "bfs": "BFS", "dfs": "DFS", "dijkstra": "Dijkstra", "a_star": "A*",
    "greedy": "Greedy", "swarm": "Swarm", "convergent_swarm": "Conv. Swarm",
    "zero_one_bfs": "0-1 BFS",
}
# Marker i tip linije po algoritmu — obezbeđuju razlikovanje i u crno-beloj štampi
ALGO_STYLE = {
    "bfs":              ("o", "-",   "#000000"),
    "dfs":              ("s", "--",  "#404040"),
    "dijkstra":         ("^", "-.",  "#808080"),
    "a_star":           ("D", ":",   "#000000"),
    "greedy":           ("v", "-",   "#606060"),
    "swarm":            ("<", "--",  "#202020"),
    "convergent_swarm": (">", "-.",  "#909090"),
    "zero_one_bfs":     ("P", ":",   "#505050"),
}
HATCH = ["", "///", "...", "xxx", "\\\\\\", "|||", "---", "+++"]
GRAY = ["#ffffff", "#dcdcdc", "#bfbfbf", "#a0a0a0", "#828282", "#646464", "#464646", "#282828"]

MAPA_LABEL = {
    "random": "случајне\nпрепреке",
    "maze": "лавиринт",
    "weighted": "пондерисан\nтерен",
    "mixed": "мешовит",
    "bottleneck": "уско грло",
    "city": "градски\nблокови",
    "open": "отворено\nпоље",
    "unsolvable": "без решења",
}
HEUR_LABEL = {
    "manhattan": "Манхетн", "euclidean": "еуклидска",
    "chebyshev": "Чебишевљева", "octile": "октилна",
}

REZ = {}   # sve izračunate vrednosti idu ovde
TABELE = []  # markdown tabele


def md_table(naslov, df, floatfmt="{:.2f}"):
    """Serijalizuje DataFrame u Markdown tabelu."""
    lines = [f"### {naslov}", ""]
    cols = list(df.columns)
    lines.append("| " + " | ".join(str(c) for c in cols) + " |")
    lines.append("|" + "|".join(["---"] * len(cols)) + "|")
    for _, row in df.iterrows():
        cells = []
        for v in row:
            if isinstance(v, (float, np.floating)):
                cells.append(floatfmt.format(v))
            else:
                cells.append(str(v))
        lines.append("| " + " | ".join(cells) + " |")
    lines.append("")
    TABELE.append("\n".join(lines))


def ci95(x):
    """Polovina širine 95% intervala poverenja aritmetičke sredine."""
    x = np.asarray(x, dtype=float)
    x = x[~np.isnan(x)]
    n = len(x)
    if n < 2:
        return 0.0
    return float(stats.t.ppf(0.975, n - 1) * x.std(ddof=1) / np.sqrt(n))


# ─────────────────────────────────────────────────────────────
# UČITAVANJE PODATAKA
# ─────────────────────────────────────────────────────────────

def ucitaj_benchmark():
    kandidati = sorted(glob.glob(str(METRIKE / "Algoritmi" / "benchmark-*.csv")))
    # biramo najnoviji fajl koji sadrži nove kolone
    for p in reversed(kandidati):
        df = pd.read_csv(p)
        if "truePathCost" in df.columns and "maxFrontier" in df.columns:
            print(f"Benchmark: {os.path.basename(p)}  ({len(df)} redova)")
            REZ["benchmark_fajl"] = os.path.basename(p)
            REZ["benchmark_broj_simulacija"] = int(len(df))
            return df
    raise SystemExit("Nije pronađen benchmark CSV sa proširenim kolonama.")


df = ucitaj_benchmark()
df["algo"] = pd.Categorical(df["algorithm"], categories=ALGO_ORDER, ordered=True)
# suboptimalnost: koliko je procenata skuplji vraćeni put od dokazano najjeftinijeg
maska = df["foundPath"] & df["refOptimalCost"].notna() & (df["refOptimalCost"] > 0)
df.loc[maska, "subopt"] = (df.loc[maska, "truePathCost"] - df.loc[maska, "refOptimalCost"]) \
                          / df.loc[maska, "refOptimalCost"] * 100.0


# ─────────────────────────────────────────────────────────────
# T1 — ZBIRNI PREGLED SA MERAMA RASIPANJA
# ─────────────────────────────────────────────────────────────

e1 = df[df["evaluationCategory"] == "E1"]

rows = []
for a in ALGO_ORDER:
    s = e1[e1["algorithm"] == a]
    sp = s[s["foundPath"]]
    rows.append({
        "Алгоритам": ALGO_LABEL[a],
        "N": len(s),
        "Проширења": s["expandedNodes"].mean(),
        "95% ИП (±)": ci95(s["expandedNodes"]),
        "Цена пута": sp["truePathCost"].mean(),
        "Субопт. (%)": sp["subopt"].mean(),
        "Макс. фронтијер": s["maxFrontier"].mean(),
        "Време (ms)": s["executionTimeMs"].median(),
    })
t1 = pd.DataFrame(rows)
md_table("Т1 — Збирни преглед алгоритама (категорија Е1)", t1)
REZ["T1_zbirno"] = t1.to_dict(orient="records")

# пуна верзија са свим мерама расипања, за евиденцију
rows = []
for a in ALGO_ORDER:
    s = e1[e1["algorithm"] == a]
    sp = s[s["foundPath"]]
    rows.append({
        "Алгоритам": ALGO_LABEL[a], "N": len(s),
        "Просек проширења": s["expandedNodes"].mean(),
        "Ст. девијација": s["expandedNodes"].std(ddof=1),
        "95% ИП (±)": ci95(s["expandedNodes"]),
        "Медијана": s["expandedNodes"].median(),
        "Просек цене": sp["truePathCost"].mean(),
        "Субоптималност (%)": sp["subopt"].mean(),
        "Макс. фронтијер": s["maxFrontier"].mean(),
        "Време (ms)": s["executionTimeMs"].median(),
        "Пронађен пут (%)": s["foundPath"].mean() * 100,
    })
md_table("Т1П — Збирни преглед, пуна верзија", pd.DataFrame(rows))


# ─────────────────────────────────────────────────────────────
# T2 — REZULTATI PO TIPU MAPE
# ─────────────────────────────────────────────────────────────

tipovi = ["open", "random", "mixed", "weighted", "maze", "bottleneck", "city"]
rows = []
for t in tipovi:
    for a in ALGO_ORDER:
        s = e1[(e1["generatorType"] == t) & (e1["algorithm"] == a)]
        if len(s) == 0:
            continue
        sp = s[s["foundPath"]]
        rows.append({
            "Тип мапе": t, "Алгоритам": ALGO_LABEL[a], "N": len(s),
            "Проширења": s["expandedNodes"].mean(),
            "Цена": sp["truePathCost"].mean() if len(sp) else np.nan,
            "Субоптималност (%)": sp["subopt"].mean() if len(sp) else np.nan,
            "Време (ms)": s["executionTimeMs"].median(),
            "Пронађен пут (%)": s["foundPath"].mean() * 100,
        })
t2 = pd.DataFrame(rows)
REZ["T2_po_tipu_mape"] = t2.to_dict(orient="records")
for t in tipovi:
    md_table(f"Т2 — Тип мапе: {t}", t2[t2["Тип мапе"] == t].drop(columns=["Тип мапе"]))

# Сажет приказ: својства мапе и субоптималност свих алгоритама у једној табели
rows = []
for t in tipovi:
    s = e1[e1["generatorType"] == t]
    red = {
        "Тип мапе": MAPA_LABEL[t].replace("\n", " "),
        "Пут (%)": s["foundPath"].mean() * 100,
    }
    for a in ALGO_ORDER:
        sa = s[(s["algorithm"] == a) & s["foundPath"]]
        red[ALGO_LABEL[a]] = sa["subopt"].mean() if len(sa) else np.nan
    rows.append(red)
t2s = pd.DataFrame(rows)
md_table("Т2С — Субоптималност по типу мапе", t2s)
REZ["T2S_subopt_po_tipu"] = t2s.to_dict(orient="records")

rows = []
for t in tipovi:
    s = e1[e1["generatorType"] == t]
    opt = s[(s["algorithm"] == "dijkstra") & s["foundPath"]]
    rows.append({
        "Тип мапе": MAPA_LABEL[t].replace("\n", " "),
        "N по алгоритму": int(len(s) / len(ALGO_ORDER)),
        "Пронађен пут (%)": s["foundPath"].mean() * 100,
        "Оптимална цена": opt["truePathCost"].mean() if len(opt) else np.nan,
        "Распон проширења": f"{int(s.groupby('algorithm')['expandedNodes'].mean().min())}"
                            f"–{int(s.groupby('algorithm')['expandedNodes'].mean().max())}",
    })
t2m = pd.DataFrame(rows)
md_table("Т2М — Својства мапа по типу", t2m)
REZ["T2M_svojstva_mapa"] = t2m.to_dict(orient="records")


# ─────────────────────────────────────────────────────────────
# G1 — PROŠIRENI ČVOROVI PO TIPU MAPE
# ─────────────────────────────────────────────────────────────

fig, ax = plt.subplots(figsize=(9.5, 4.6))
x = np.arange(len(tipovi))
w = 0.10
for i, a in enumerate(ALGO_ORDER):
    vals = [e1[(e1["generatorType"] == t) & (e1["algorithm"] == a)]["expandedNodes"].mean() for t in tipovi]
    errs = [ci95(e1[(e1["generatorType"] == t) & (e1["algorithm"] == a)]["expandedNodes"]) for t in tipovi]
    ax.bar(x + (i - 3.5) * w, vals, w, yerr=errs, capsize=1.5, label=ALGO_LABEL[a],
           color=GRAY[i], edgecolor="black", linewidth=0.5, hatch=HATCH[i])
ax.set_xticks(x)
ax.set_xticklabels([MAPA_LABEL[t] for t in tipovi])
ax.set_xlabel("Тип мапе")
ax.set_ylabel("Просечан број проширених чворова")
ax.set_title("Број проширених чворова по типу мапе (мреже 25×50, 95% интервали поверења)")
ax.legend(ncol=4, fontsize=8, loc="upper left")
fig.savefig(SLIKE / "g01-ekspanzije-po-tipu-mape.png")
plt.close(fig)


# ─────────────────────────────────────────────────────────────
# G2, G3 — SKALABILNOST
# ─────────────────────────────────────────────────────────────

e6 = df[df["evaluationCategory"] == "E6"].copy()
e6["celije"] = e6["mapRows"] * e6["mapCols"]
velicine = sorted(e6["celije"].unique())
oznake = []
for c in velicine:
    r = e6[e6["celije"] == c].iloc[0]
    oznake.append(f"{int(r['mapRows'])}×{int(r['mapCols'])}\n({int(c)})")

rows = []
for metrika, naziv, fajl, ylab, naslov in [
    ("expandedNodes", "Проширења", "g02-skalabilnost-ekspanzije.png",
     "Просечан број проширених чворова", "Скалабилност: проширени чворови у односу на величину мреже"),
    ("executionTimeMs", "Време", "g03-skalabilnost-vreme.png",
     "Медијана времена извршавања [ms]", "Скалабилност: време извршавања у односу на величину мреже"),
]:
    fig, ax = plt.subplots(figsize=(7.2, 4.4))
    for a in ALGO_ORDER:
        m, ls, col = ALGO_STYLE[a]
        y = []
        for c in velicine:
            s = e6[(e6["celije"] == c) & (e6["algorithm"] == a)][metrika]
            y.append(s.median() if metrika == "executionTimeMs" else s.mean())
        ax.plot(range(len(velicine)), y, marker=m, linestyle=ls, color=col,
                markersize=5, linewidth=1.3, label=ALGO_LABEL[a], markerfacecolor="white")
        if metrika == "expandedNodes":
            for c, yy in zip(velicine, y):
                rows.append({"Ћелија": int(c), "Алгоритам": ALGO_LABEL[a], "Проширења": yy})
    ax.set_yscale("log")
    ax.set_xticks(range(len(velicine)))
    ax.set_xticklabels(oznake)
    ax.set_xlabel("Величина мреже (редови × колоне, укупан број ћелија)")
    ax.set_ylabel(ylab)
    ax.set_title(naslov)
    ax.legend(ncol=2, fontsize=8)
    fig.savefig(SLIKE / fajl)
    plt.close(fig)

# tabela skalabilnosti
piv_e = e6.pivot_table(index="algorithm", columns="celije", values="expandedNodes", aggfunc="mean")
piv_t = e6.pivot_table(index="algorithm", columns="celije", values="executionTimeMs", aggfunc="median")
piv_m = e6.pivot_table(index="algorithm", columns="celije", values="maxFrontier", aggfunc="mean")
for piv, ime in [(piv_e, "проширени чворови"), (piv_t, "време извршавања [ms]"), (piv_m, "максимални фронтијер")]:
    piv = piv.reindex(ALGO_ORDER)
    d = piv.reset_index()
    d["algorithm"] = d["algorithm"].map(ALGO_LABEL)
    d.columns = ["Алгоритам"] + [f"{c}" for c in piv.columns]
    md_table(f"Т3 — Скалабилност: {ime}", d)
    REZ[f"T3_skalabilnost_{ime.split()[0]}"] = d.to_dict(orient="records")

# empirijski eksponent rasta: expanded ~ C * celije^k
rows = []
for a in ALGO_ORDER:
    s = e6[e6["algorithm"] == a].groupby("celije")["expandedNodes"].mean()
    k, lnC = np.polyfit(np.log(s.index.values.astype(float)), np.log(s.values), 1)
    rows.append({"Алгоритам": ALGO_LABEL[a], "Експонент раста k": k,
                 "Проширења 10×20": s.iloc[0], "Проширења 100×200": s.iloc[-1],
                 "Фактор пораста": s.iloc[-1] / s.iloc[0]})
t_rast = pd.DataFrame(rows)
md_table("Т4 — Емпиријски експонент раста броја проширених чворова", t_rast, "{:.3f}")
REZ["T4_eksponent_rasta"] = t_rast.to_dict(orient="records")


# ─────────────────────────────────────────────────────────────
# G4 — KOMPROMIS BRZINA/OPTIMALNOST
# ─────────────────────────────────────────────────────────────

fig, ax = plt.subplots(figsize=(7.0, 4.6))
for i, a in enumerate(ALGO_ORDER):
    s = e1[(e1["algorithm"] == a) & e1["foundPath"]]
    xv = s["expandedNodes"].mean()
    yv = s["subopt"].mean()
    m, ls, col = ALGO_STYLE[a]
    ax.scatter(xv, yv, marker=m, s=110, color=col, edgecolor="black", zorder=3, label=ALGO_LABEL[a])
    ax.annotate(ALGO_LABEL[a], (xv, yv), textcoords="offset points", xytext=(8, 6), fontsize=9)
ax.axhline(0, color="black", linewidth=0.8, linestyle="--")
ax.set_xlabel("Просечан број проширених чворова (мања вредност је боља)")
ax.set_ylabel("Просечна субоптималност пута [%]")
ax.set_title("Компромис између цене претраге и квалитета пута")
fig.savefig(SLIKE / "g04-kompromis-brzina-optimalnost.png")
plt.close(fig)


# ─────────────────────────────────────────────────────────────
# G5 — HEURISTIKE
# ─────────────────────────────────────────────────────────────

e7 = df[df["evaluationCategory"] == "E7"]
heur_algos = ["a_star", "greedy", "swarm", "convergent_swarm"]
heurs = ["manhattan", "euclidean", "chebyshev", "octile"]

fig, ax = plt.subplots(figsize=(7.2, 4.2))
x = np.arange(len(heur_algos))
w = 0.2
rows = []
for i, h in enumerate(heurs):
    vals, errs = [], []
    for a in heur_algos:
        s = e7[(e7["algorithm"] == a) & (e7["heuristic"] == h)]
        vals.append(s["expandedNodes"].mean())
        errs.append(ci95(s["expandedNodes"]))
        sp = s[s["foundPath"]]
        rows.append({"Хеуристика": HEUR_LABEL[h], "Алгоритам": ALGO_LABEL[a],
                     "Проширења": s["expandedNodes"].mean(),
                     "Цена": sp["truePathCost"].mean(),
                     "Субоптималност (%)": sp["subopt"].mean()})
    ax.bar(x + (i - 1.5) * w, vals, w, yerr=errs, capsize=2, label=HEUR_LABEL[h],
           color=GRAY[i * 2], edgecolor="black", linewidth=0.5, hatch=HATCH[i])
ax.set_xticks(x)
ax.set_xticklabels([ALGO_LABEL[a] for a in heur_algos])
ax.set_xlabel("Алгоритам")
ax.set_ylabel("Просечан број проширених чворова")
ax.set_title("Утицај избора хеуристике на број проширених чворова (4-повезано суседство)")
ax.legend()
fig.savefig(SLIKE / "g05-heuristike.png")
plt.close(fig)

t_h = pd.DataFrame(rows)
md_table("Т5П — Утицај хеуристике, пуна верзија", t_h)
REZ["T5_heuristike"] = t_h.to_dict(orient="records")

# Сажета верзија: редови су алгоритми, колоне хеуристике
rows = []
for a in heur_algos:
    red = {"Алгоритам": ALGO_LABEL[a]}
    for h in heurs:
        s = e7[(e7["algorithm"] == a) & (e7["heuristic"] == h)]
        red[HEUR_LABEL[h]] = s["expandedNodes"].mean()
    sp = e7[(e7["algorithm"] == a) & e7["foundPath"]]
    red["Субопт. (%)"] = sp["subopt"].mean()
    rows.append(red)
t_hs = pd.DataFrame(rows)
md_table("Т5С — Број проширења по хеуристици", t_hs)
REZ["T5S_heuristike"] = t_hs.to_dict(orient="records")


# ─────────────────────────────────────────────────────────────
# G6 — SWARM TEŽINSKI PARAMETAR
# ─────────────────────────────────────────────────────────────

e9 = df[(df["evaluationCategory"] == "E9") & (df["algorithm"] == "swarm")]
ws = sorted(e9["swarmWeight"].dropna().unique())
exp_w = [e9[e9["swarmWeight"] == w_]["expandedNodes"].mean() for w_ in ws]
cost_w = [e9[(e9["swarmWeight"] == w_) & e9["foundPath"]]["truePathCost"].mean() for w_ in ws]
sub_w = [e9[(e9["swarmWeight"] == w_) & e9["foundPath"]]["subopt"].mean() for w_ in ws]

fig, ax1 = plt.subplots(figsize=(7.0, 4.3))
ax1.plot(ws, exp_w, marker="o", linestyle="-", color="black", label="проширени чворови", markerfacecolor="white")
ax1.set_xlabel("Вредност параметра w у изразу f(n) = g(n) + w·h(n)")
ax1.set_ylabel("Просечан број проширених чворова")
ax2 = ax1.twinx()
ax2.plot(ws, sub_w, marker="s", linestyle="--", color="#606060", label="субоптималност")
ax2.set_ylabel("Просечна субоптималност пута [%]")
ax2.grid(False)
lines = ax1.get_lines() + ax2.get_lines()
ax1.legend(lines, [l.get_label() for l in lines], loc="center right")
ax1.set_title("Утицај параметра w на цену претраге и квалитет пута")
fig.savefig(SLIKE / "g06-swarm-parametar-w.png")
plt.close(fig)

t_w = pd.DataFrame({"w": ws, "Проширења": exp_w, "Цена пута": cost_w, "Субоптималност (%)": sub_w})
md_table("Т6 — Померање параметра w", t_w)
REZ["T6_swarm_w"] = t_w.to_dict(orient="records")


# ─────────────────────────────────────────────────────────────
# G7 — MEMORIJSKI OTISAK (MAKSIMALNI FRONTIJER)
# ─────────────────────────────────────────────────────────────

fig, ax = plt.subplots(figsize=(7.0, 4.2))
vals = [e1[e1["algorithm"] == a]["maxFrontier"].mean() for a in ALGO_ORDER]
errs = [ci95(e1[e1["algorithm"] == a]["maxFrontier"]) for a in ALGO_ORDER]
bars = ax.bar(range(len(ALGO_ORDER)), vals, yerr=errs, capsize=3,
              color=GRAY[2], edgecolor="black", linewidth=0.6)
for b, h in zip(bars, HATCH):
    b.set_hatch(h)
ax.set_xticks(range(len(ALGO_ORDER)))
ax.set_xticklabels([ALGO_LABEL[a] for a in ALGO_ORDER], rotation=20, ha="right")
ax.set_ylabel("Просечна максимална величина фронтијера")
ax.set_xlabel("Алгоритам")
ax.set_title("Меморијски отисак: највећи истовремени број чворова у фронтијеру")
fig.savefig(SLIKE / "g07-memorijski-otisak.png")
plt.close(fig)

t_m = pd.DataFrame({
    "Алгоритам": [ALGO_LABEL[a] for a in ALGO_ORDER],
    "Просек": vals,
    "95% ИП (±)": errs,
    "Максимум": [e1[e1["algorithm"] == a]["maxFrontier"].max() for a in ALGO_ORDER],
    "Однос према броју проширења": [
        e1[e1["algorithm"] == a]["maxFrontier"].mean() / max(e1[e1["algorithm"] == a]["expandedNodes"].mean(), 1)
        for a in ALGO_ORDER],
})
md_table("Т7 — Меморијски отисак", t_m)
REZ["T7_memorija"] = t_m.to_dict(orient="records")


# ─────────────────────────────────────────────────────────────
# G8 — GUSTINA PREPREKA
# ─────────────────────────────────────────────────────────────

dens_df = e1[e1["generatorType"].isin(["random", "mixed"])]
dens = sorted(dens_df["density"].unique())

fig, (axa, axb) = plt.subplots(1, 2, figsize=(10.0, 4.0))
for a in ALGO_ORDER:
    m, ls, col = ALGO_STYLE[a]
    y = [dens_df[(dens_df["density"] == d) & (dens_df["algorithm"] == a)]["expandedNodes"].mean() for d in dens]
    axa.plot(dens, y, marker=m, linestyle=ls, color=col, markersize=5, linewidth=1.2,
             label=ALGO_LABEL[a], markerfacecolor="white")
axa.set_xlabel("Густина препрека [%]")
axa.set_ylabel("Просечан број проширених чворова")
axa.set_title("Проширени чворови у односу на густину препрека")
axa.set_xticks(dens)
axa.legend(ncol=2, fontsize=8)

found = [dens_df[dens_df["density"] == d]["foundPath"].mean() * 100 for d in dens]
axb.plot(dens, found, marker="o", linestyle="-", color="black", markerfacecolor="white")
for d, f in zip(dens, found):
    axb.annotate(f"{f:.1f}%", (d, f), textcoords="offset points", xytext=(0, 8), ha="center", fontsize=9)
axb.set_xlabel("Густина препрека [%]")
axb.set_ylabel("Удео мапа са постојећим путем [%]")
axb.set_title("Решивост мапа у односу на густину препрека")
axb.set_xticks(dens)
axb.set_ylim(-5, 115)
fig.savefig(SLIKE / "g08-gustina-prepreka.png")
plt.close(fig)

rows = []
for d in dens:
    for a in ALGO_ORDER:
        s = dens_df[(dens_df["density"] == d) & (dens_df["algorithm"] == a)]
        sp = s[s["foundPath"]]
        rows.append({"Густина (%)": d, "Алгоритам": ALGO_LABEL[a], "N": len(s),
                     "Проширења": s["expandedNodes"].mean(),
                     "Субоптималност (%)": sp["subopt"].mean() if len(sp) else np.nan,
                     "Пронађен пут (%)": s["foundPath"].mean() * 100})
t_d = pd.DataFrame(rows)
md_table("Т8 — Утицај густине препрека", t_d)
REZ["T8_gustina"] = t_d.to_dict(orient="records")


# ─────────────────────────────────────────────────────────────
# G9 — 4 vs 8 SUSEDSTVO
# ─────────────────────────────────────────────────────────────

e8 = df[df["evaluationCategory"] == "E8"]
fig, ax = plt.subplots(figsize=(7.4, 4.2))
x = np.arange(len(ALGO_ORDER))
w = 0.36
rows = []
for i, mode in enumerate([4, 8]):
    vals, errs = [], []
    for a in ALGO_ORDER:
        s = e8[(e8["algorithm"] == a) & (e8["neighborMode"] == mode)]
        vals.append(s["expandedNodes"].mean())
        errs.append(ci95(s["expandedNodes"]))
        sp = s[s["foundPath"]]
        rows.append({"Суседство": f"{mode}-повезано", "Алгоритам": ALGO_LABEL[a],
                     "Проширења": s["expandedNodes"].mean(),
                     "Цена": sp["truePathCost"].mean() if len(sp) else np.nan,
                     "Дужина пута": sp["pathLength"].mean() if len(sp) else np.nan,
                     "Пронађен пут (%)": s["foundPath"].mean() * 100})
    ax.bar(x + (i - 0.5) * w, vals, w, yerr=errs, capsize=2, label=f"{mode}-повезано суседство",
           color=GRAY[i * 3 + 1], edgecolor="black", linewidth=0.6, hatch=HATCH[i * 2])
ax.set_xticks(x)
ax.set_xticklabels([ALGO_LABEL[a] for a in ALGO_ORDER], rotation=20, ha="right")
ax.set_ylabel("Просечан број проширених чворова")
ax.set_xlabel("Алгоритам")
ax.set_title("Поређење 4-повезаног и 8-повезаног суседства")
ax.legend()
fig.savefig(SLIKE / "g09-susedstvo-4-vs-8.png")
plt.close(fig)

t_s = pd.DataFrame(rows)
md_table("Т9П — 4-повезано наспрам 8-повезаног суседства, пуна верзија", t_s)
REZ["T9_susedstvo"] = t_s.to_dict(orient="records")

# Сажета верзија: један ред по алгоритму, оба режима у колонама
rows = []
for a in ALGO_ORDER:
    s4 = e8[(e8["algorithm"] == a) & (e8["neighborMode"] == 4)]
    s8 = e8[(e8["algorithm"] == a) & (e8["neighborMode"] == 8)]
    rows.append({
        "Алгоритам": ALGO_LABEL[a],
        "Проширења 4": s4["expandedNodes"].mean(),
        "Проширења 8": s8["expandedNodes"].mean(),
        "Цена 4": s4[s4["foundPath"]]["truePathCost"].mean(),
        "Цена 8": s8[s8["foundPath"]]["truePathCost"].mean(),
        "Дужина 4": s4[s4["foundPath"]]["pathLength"].mean(),
        "Дужина 8": s8[s8["foundPath"]]["pathLength"].mean(),
    })
t_ss = pd.DataFrame(rows)
md_table("Т9С — Поређење суседства", t_ss)
REZ["T9S_susedstvo"] = t_ss.to_dict(orient="records")


# ─────────────────────────────────────────────────────────────
# G10 — KORELACIJA PROŠIRENJA I VREMENA
# ─────────────────────────────────────────────────────────────

kor = df[(df["evaluationCategory"].isin(["E1", "E6"])) & (df["executionTimeMs"] > 0)]
r_p, p_p = stats.pearsonr(kor["expandedNodes"], kor["executionTimeMs"])
r_s, p_s = stats.spearmanr(kor["expandedNodes"], kor["executionTimeMs"])
REZ["korelacija_ekspanzije_vreme"] = {
    "pearson_r": float(r_p), "pearson_p": float(p_p),
    "spearman_rho": float(r_s), "spearman_p": float(p_s), "N": int(len(kor)),
}

fig, ax = plt.subplots(figsize=(6.6, 4.4))
uzorak = kor.sample(min(3000, len(kor)), random_state=7)
ax.scatter(uzorak["expandedNodes"], uzorak["executionTimeMs"], s=5, alpha=0.25,
           color="black", edgecolors="none")
xs = np.logspace(np.log10(max(kor["expandedNodes"].min(), 1)), np.log10(kor["expandedNodes"].max()), 50)
k, n = np.polyfit(np.log10(kor["expandedNodes"].clip(lower=1)), np.log10(kor["executionTimeMs"]), 1)
ax.plot(xs, 10 ** n * xs ** k, linestyle="--", color="black", linewidth=1.5,
        label=f"регресија: log t = {k:.2f}·log E + {n:.2f}")
ax.set_xscale("log")
ax.set_yscale("log")
ax.set_xlabel("Број проширених чворова")
ax.set_ylabel("Време извршавања [ms]")
ax.set_title(f"Веза броја проширених чворова и времена извршавања (ρ = {r_s:.3f}, N = {len(kor)})")
ax.legend(loc="upper left")
fig.savefig(SLIKE / "g10-korelacija-ekspanzije-vreme.png")
plt.close(fig)


# ─────────────────────────────────────────────────────────────
# AI EVALUACIJA
# ─────────────────────────────────────────────────────────────

ai_zapisi = []
for p in glob.glob(str(METRIKE / "AI" / "ai-benchmark-*.json")):
    with open(p, encoding="utf-8") as fh:
        ai_zapisi.extend(json.load(fh))
ai = pd.DataFrame(ai_zapisi)
# Prvi batch je snimljen pre nego što je polje aiModel uvedeno; pokrenut je
# podrazumevanim modelom iz CLI skripte.
ai["aiModel"] = ai["aiModel"].fillna("gpt-4o-mini")
REZ["ai_broj_testova"] = int(len(ai))
print(f"AI: {len(ai)} testova, {ai['aiModel'].nunique()} modela")

# Tolerantna tačnost: predikcija se prihvata ako predviđeni algoritam ima
# istu vrednost metrike kao stvarni ekstrem (rešava problem izjednačenih rezultata).
PROMPT_RE = re.compile(r"^(BFS|DFS|Dijkstra|A\*|Greedy|Swarm|Conv\. Swarm|0-1 BFS):\s*(\d+)\s*expanded", re.M)
IME_U_KLJUC = {
    "BFS": "bfs", "DFS": "dfs", "Dijkstra": "dijkstra", "A*": "a_star",
    "Greedy": "greedy", "Swarm": "swarm", "Conv. Swarm": "convergent_swarm", "0-1 BFS": "zero_one_bfs",
}


def tolerantno(red):
    prazno = pd.Series({"bestTol": np.nan, "worstTol": np.nan, "izjednacenoBest": np.nan,
                        "izjednacenoWorst": np.nan})
    if red.get("testType") != "recommend" or not isinstance(red.get("prompt"), str):
        return prazno
    parovi = {IME_U_KLJUC[m.group(1)]: int(m.group(2)) for m in PROMPT_RE.finditer(red["prompt"])}
    if len(parovi) < 8:
        return prazno
    mn, mx = min(parovi.values()), max(parovi.values())
    # Kontrola: rekonstruisani ekstremi moraju biti saglasni sa zabeleženim.
    if parovi.get(red.get("actualBest")) != mn or parovi.get(red.get("actualWorst")) != mx:
        return prazno
    pb, pw = red.get("aiPredictedBest"), red.get("aiPredictedWorst")
    return pd.Series({
        "bestTol": float(parovi.get(pb, -1) == mn),
        "worstTol": float(parovi.get(pw, -1) == mx),
        "izjednacenoBest": float(sum(1 for v in parovi.values() if v == mn) > 1),
        "izjednacenoWorst": float(sum(1 for v in parovi.values() if v == mx) > 1),
    })


ai = pd.concat([ai, ai.apply(tolerantno, axis=1)], axis=1)

rec = ai[ai["testType"] == "recommend"]

# Modeli se razvrstavaju prema tome da li je pokretanje dovršeno u punom obimu.
po_modelu = ai.groupby("aiModel").agg(n=("validJson", "size"), json_ok=("validJson", "mean"))
MODELI_PUNI = sorted(po_modelu[(po_modelu["n"] >= 100) & (po_modelu["json_ok"] > 0.5)].index)
MODELI_DELIMICNI = sorted(po_modelu[(po_modelu["n"] < 100) & (po_modelu["json_ok"] > 0.5)].index)
MODELI_NEUSPELI = sorted(po_modelu[po_modelu["json_ok"] <= 0.5].index)
REZ["ai_modeli_puni"] = MODELI_PUNI
REZ["ai_modeli_delimicni"] = MODELI_DELIMICNI
REZ["ai_modeli_neuspeli"] = MODELI_NEUSPELI
REZ["ai_broj_testova_po_modelu"] = {k: int(v) for k, v in po_modelu["n"].items()}

rows = []
for model in MODELI_PUNI + MODELI_DELIMICNI + MODELI_NEUSPELI:
    r = rec[rec["aiModel"] == model]
    a = ai[ai["aiModel"] == model]
    status = ("потпуно" if model in MODELI_PUNI
              else "делимично" if model in MODELI_DELIMICNI else "неуспело")
    rows.append({
        "Модел": model,
        "Покретање": status,
        "N (укупно)": len(a),
        "N (препорука)": len(r),
        "Најбољи тачно (%)": r["bestCorrect"].mean() * 100 if len(r) else np.nan,
        "Најбољи тачно, толерантно (%)": r["bestTol"].mean() * 100 if len(r) else np.nan,
        "Најгори тачно (%)": r["worstCorrect"].mean() * 100 if len(r) else np.nan,
        "Најгори тачно, толерантно (%)": r["worstTol"].mean() * 100 if len(r) else np.nan,
        "Исправан JSON (%)": a["validJson"].mean() * 100,
        "Медијана латенције (ms)": a["responseTimeMs"].median(),
    })
t_ai = pd.DataFrame(rows)
md_table("Т10 — Тачност AI препоруке по моделу", t_ai)
REZ["T10_ai_po_modelu"] = t_ai.to_dict(orient="records")

# Zbirne vrednosti računaju se samo nad modelima čije je pokretanje uspelo.
rec_ok = rec[rec["aiModel"].isin(MODELI_PUNI + MODELI_DELIMICNI)]
ai_ok = ai[ai["aiModel"].isin(MODELI_PUNI + MODELI_DELIMICNI)]
REZ["ai_udeo_izjednacenih_best"] = float(rec_ok["izjednacenoBest"].mean() * 100)
REZ["ai_udeo_izjednacenih_worst"] = float(rec_ok["izjednacenoWorst"].mean() * 100)
REZ["ai_best_ukupno"] = float(rec_ok["bestCorrect"].mean() * 100)
REZ["ai_best_tolerantno"] = float(rec_ok["bestTol"].mean() * 100)
REZ["ai_worst_ukupno"] = float(rec_ok["worstCorrect"].mean() * 100)
REZ["ai_worst_tolerantno"] = float(rec_ok["worstTol"].mean() * 100)
REZ["ai_broj_testova_uspesnih"] = int(len(ai_ok))

fig, ax = plt.subplots(figsize=(8.4, 4.3))
modeli = MODELI_PUNI + MODELI_DELIMICNI
t_plot = t_ai[t_ai["Модел"].isin(modeli)].set_index("Модел").reindex(modeli).reset_index()
x = np.arange(len(modeli))
w = 0.2
serije = [
    ("Најбољи, строго", "Најбољи тачно (%)", 0),
    ("Најбољи, толерантно", "Најбољи тачно, толерантно (%)", 1),
    ("Најгори, строго", "Најгори тачно (%)", 2),
    ("Најгори, толерантно", "Најгори тачно, толерантно (%)", 3),
]
for i, (lab, col, hi) in enumerate(serije):
    ax.bar(x + (i - 1.5) * w, t_plot[col], w, label=lab,
           color=GRAY[i * 2], edgecolor="black", linewidth=0.5, hatch=HATCH[hi])
ax.set_xticks(x)
ax.set_xticklabels(modeli, rotation=12, ha="right", fontsize=8)
ax.set_ylabel("Тачност [%]")
ax.set_xlabel("Језички модел")
ax.set_title("Тачност идентификације најбољег и најгорег алгоритма по моделу")
ax.legend(ncol=2, fontsize=8)
ax.set_ylim(0, 105)
fig.savefig(SLIKE / "g11-ai-tacnost-po-modelu.png")
plt.close(fig)

# G12 — latencija po modulu i modelu
fig, ax = plt.subplots(figsize=(8.4, 4.3))
moduli = ["recommend", "generate", "tutor"]
MOD_LABEL = {"recommend": "Препорука", "generate": "Генератор", "tutor": "Тутор"}
podaci, oznake_bp = [], []
for model in modeli:
    for mo in moduli:
        s = ai[(ai["aiModel"] == model) & (ai["testType"] == mo)]["responseTimeMs"].dropna()
        if len(s) >= 3:
            podaci.append(s.values)
            oznake_bp.append(f"{model.split('-')[0]}\n{MOD_LABEL[mo]}")
bp = ax.boxplot(podaci, tick_labels=oznake_bp, patch_artist=True, showfliers=False, widths=0.6)
for i, box in enumerate(bp["boxes"]):
    box.set(facecolor=GRAY[i % 3 + 1], edgecolor="black", linewidth=0.7)
for el in ["whiskers", "caps", "medians"]:
    for it in bp[el]:
        it.set(color="black", linewidth=0.9)
ax.set_ylabel("Време одзива [ms]")
ax.set_xlabel("Модел и AI модул")
ax.set_title("Расподела времена одзива по моделу и модулу")
plt.setp(ax.get_xticklabels(), rotation=45, ha="right", fontsize=7)
fig.savefig(SLIKE / "g12-ai-latencija.png")
plt.close(fig)

# tabela po modulu
rows = []
for mo in moduli:
    s = ai_ok[ai_ok["testType"] == mo]
    rows.append({
        "Модул": MOD_LABEL[mo], "N": len(s),
        "Исправан JSON (%)": s["validJson"].mean() * 100,
        "Медијана латенције (ms)": s["responseTimeMs"].median(),
        "P90 латенције (ms)": s["responseTimeMs"].quantile(0.90),
        "Грешке (%)": (1 - s["validJson"].mean()) * 100,
    })
t_mod = pd.DataFrame(rows)
md_table("Т11 — Робусност AI модула", t_mod)
REZ["T11_ai_moduli"] = t_mod.to_dict(orient="records")

# tačnost po tipu mape
rows = []
for t in sorted(rec_ok["generatorType"].dropna().unique()):
    s = rec_ok[rec_ok["generatorType"] == t]
    rows.append({
        "Тип мапе": t, "N": len(s),
        "Најбољи строго (%)": s["bestCorrect"].mean() * 100,
        "Најбољи толерантно (%)": s["bestTol"].mean() * 100,
        "Најгори строго (%)": s["worstCorrect"].mean() * 100,
        "Најгори толерантно (%)": s["worstTol"].mean() * 100,
        "Изједначен минимум (%)": s["izjednacenoBest"].mean() * 100,
    })
t_aitip = pd.DataFrame(rows)
md_table("Т12 — Тачност AI препоруке по типу мапе", t_aitip)
REZ["T12_ai_po_tipu_mape"] = t_aitip.to_dict(orient="records")

# generator
gen = ai_ok[ai_ok["testType"] == "generate"]
if len(gen):
    REZ["ai_generator"] = {
        "N": int(len(gen)),
        "ekstrakcija_intenta_uspesna_pct": float(gen["validJson"].mean() * 100),
        "intent_zadovoljen_pct": float(gen["intentSatisfied"].fillna(False).astype(bool).mean() * 100),
        "prosecan_score": float(pd.to_numeric(gen["intentScore"], errors="coerce").mean()),
    }
tut = ai_ok[ai_ok["testType"] == "tutor"]
if len(tut):
    REZ["ai_tutor"] = {
        "N": int(len(tut)),
        "validan_json_pct": float(tut["validJson"].mean() * 100),
        "validni_momenti_pct": float(pd.to_numeric(tut["momentsValid"], errors="coerce").fillna(0).mean() * 100),
        "prosecno_momenata": float(pd.to_numeric(tut["momentsReturned"], errors="coerce").mean()),
        "medijana_latencije_ms": float(tut["responseTimeMs"].median()),
    }


# ─────────────────────────────────────────────────────────────
# PLAYGROUND
# ─────────────────────────────────────────────────────────────

pg = pd.read_csv(METRIKE / "Playground" / "playground-benchmark.csv")
REZ["playground_broj_simulacija"] = int(len(pg))

TIP_IGRACA = {
    "perfect": "савршен", "good": "добар", "bad": "слаб", "invalid": "неисправни потези",
    "no_path_correct": "тачно „нема пута”", "no_path_wrong": "погрешно „нема пута”",
    "path_on_sealed": "пут на нерешивој мапи",
}
redosled = ["perfect", "good", "bad", "invalid", "no_path_correct", "no_path_wrong", "path_on_sealed"]

fig, ax = plt.subplots(figsize=(8.0, 4.3))
podaci = [pg[pg["playerType"] == t]["score"].values for t in redosled]
bp = ax.boxplot(podaci, tick_labels=[TIP_IGRACA[t] for t in redosled], patch_artist=True, widths=0.55)
for i, box in enumerate(bp["boxes"]):
    box.set(facecolor=GRAY[i % len(GRAY)], edgecolor="black", linewidth=0.7)
    box.set_hatch(HATCH[i % len(HATCH)])
for el in ["whiskers", "caps", "medians", "fliers"]:
    for it in bp[el]:
        it.set(color="black", linewidth=0.8)
        if el == "fliers":
            it.set(marker=".", markersize=2, markerfacecolor="black")
ax.set_ylabel("Остварени број поена")
ax.set_xlabel("Тип симулираног играча")
ax.set_title("Расподела поена по типу симулираног играча")
plt.setp(ax.get_xticklabels(), rotation=20, ha="right", fontsize=8)
fig.savefig(SLIKE / "g13-playground-skorovi.png")
plt.close(fig)

rows = []
for t in redosled:
    s = pg[pg["playerType"] == t]
    rows.append({
        "Тип играча": TIP_IGRACA[t], "N": len(s),
        "Просек": s["score"].mean(), "Медијана": s["score"].median(),
        "Ст. девијација": s["score"].std(ddof=1),
        "Мин": s["score"].min(), "Макс": s["score"].max(),
        "Пенал за цену": s["costPenalty"].mean(),
        "Пенал за грешке": s["invalidMovePenalty"].mean(),
    })
t_pg = pd.DataFrame(rows)
md_table("Т13 — Поени по типу симулираног играча", t_pg)
REZ["T13_playground"] = t_pg.to_dict(orient="records")

# monotonost: da li skor opada sa kvalitetom igraca
red_kval = ["perfect", "good", "bad"]
sredine = [pg[pg["playerType"] == t]["score"].mean() for t in red_kval]
REZ["playground_monotono_opadanje"] = bool(all(sredine[i] > sredine[i + 1] for i in range(len(sredine) - 1)))

# Kruskal-Wallis: razlikuju li se skorovi po tipu mape za "good" igraca
good = pg[pg["playerType"] == "good"]
grupe = [g["score"].values for _, g in good.groupby("generatorType") if len(g) > 5]
if len(grupe) > 2:
    H, p = stats.kruskal(*grupe)
    REZ["playground_kruskal"] = {"H": float(H), "p": float(p), "k": len(grupe)}

rows = []
for t in sorted(good["generatorType"].unique()):
    s = good[good["generatorType"] == t]
    rows.append({"Тип мапе": t, "N": len(s), "Просек": s["score"].mean(),
                 "Ст. девијација": s["score"].std(ddof=1),
                 "Мин": s["score"].min(), "Макс": s["score"].max()})
t_pgm = pd.DataFrame(rows)
md_table("Т14 — Поени играча „добар” по типу мапе", t_pgm)
REZ["T14_playground_po_mapi"] = t_pgm.to_dict(orient="records")

# G14 — skor po tipu mape
fig, ax = plt.subplots(figsize=(7.6, 4.2))
tipovi_pg = list(t_pgm["Тип мапе"])
vals = list(t_pgm["Просек"])
errs = [ci95(good[good["generatorType"] == t]["score"]) for t in tipovi_pg]
bars = ax.bar(range(len(tipovi_pg)), vals, yerr=errs, capsize=3,
              color=GRAY[3], edgecolor="black", linewidth=0.6)
for b, h in zip(bars, HATCH):
    b.set_hatch(h)
ax.set_xticks(range(len(tipovi_pg)))
ax.set_xticklabels([MAPA_LABEL.get(t, t).replace("\n", " ") for t in tipovi_pg], rotation=20, ha="right", fontsize=8)
ax.set_ylabel("Просечан број поена")
ax.set_xlabel("Тип мапе")
ax.set_ylim(0, 115)
ax.set_title("Просечан број поена играча „добар” по типу мапе (95% интервали поверења)")
fig.savefig(SLIKE / "g14-playground-po-tipu-mape.png")
plt.close(fig)


# ─────────────────────────────────────────────────────────────
# UPIS REZULTATA
# ─────────────────────────────────────────────────────────────

def cisti(o):
    if isinstance(o, dict):
        return {k: cisti(v) for k, v in o.items()}
    if isinstance(o, list):
        return [cisti(v) for v in o]
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.floating,)):
        return None if np.isnan(o) else round(float(o), 4)
    if isinstance(o, (np.bool_,)):
        return bool(o)
    if isinstance(o, float) and np.isnan(o):
        return None
    return o


with open(ANALIZA / "rezultati.json", "w", encoding="utf-8") as fh:
    json.dump(cisti(REZ), fh, ensure_ascii=False, indent=2)

with open(ANALIZA / "tabele.md", "w", encoding="utf-8") as fh:
    fh.write("# Обрађене табеле за мастер рад\n\n")
    fh.write("\n".join(TABELE))

print(f"\nUpisano: {ANALIZA / 'rezultati.json'}")
print(f"Upisano: {ANALIZA / 'tabele.md'}")
print(f"Grafici: {len(list(SLIKE.glob('*.png')))} fajlova u {SLIKE}")
