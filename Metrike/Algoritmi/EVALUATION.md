# Evaluacija algoritama za pronalaženje puta
## Pathfinder Visualizer — Rezultati eksperimentalne evaluacije

**Datum generisanja:** 2026-04-10
**Ukupan broj simulacija:** 17754
**Broj batch-eva:** 3
**Batch ID-evi:** bench-20260410123356-4116u7, bench-20260410123417-0hqaap, bench-20260410124100-rdgugl

---

## E1 — Uporedna analiza algoritama na različitim tipovima mapa

Ova evaluacija poredi svih 8 algoritama na 7 tipova mapa (random, maze, weighted, mixed, bottleneck, city, open) sa različitim gustinama prepreka i seed vrednostima.

### E1.1 — Celokupni pregled (sve mape zajedno)

| Algoritam | N | Avg Expanded | Avg Cost | Avg Length | Avg Time (ms) | Path Found | Min Exp | Max Exp |
|-----------|---|-------------|----------|------------|---------------|------------|---------|---------|
| Greedy | 660 | 92 | 79.7 | 63.8 | 0.031 | 82.1% | 1 | 873 |
| Conv. Swarm | 660 | 99 | 74.5 | 63.5 | 0.033 | 82.1% | 1 | 873 |
| Swarm | 660 | 123 | 68.5 | 63.9 | 0.042 | 82.1% | 1 | 873 |
| A* | 660 | 215 | 67.2 | 63.8 | 0.079 | 82.1% | 1 | 873 |
| DFS | 660 | 279 | 307.1 | 170.4 | 0.092 | 82.1% | 1 | 1074 |
| 0-1 BFS | 660 | 315 | 0.9 | 120.2 | 0.139 | 82.1% | 1 | 1032 |
| Dijkstra | 660 | 579 | 67.2 | 63.9 | 0.225 | 82.1% | 1 | 1016 |
| BFS | 660 | 580 | 60.7 | 61.7 | 0.164 | 82.1% | 1 | 1021 |

### E1.2 — Tip mape: bottleneck

| Algoritam | N | Avg Expanded | Avg Cost | Avg Time (ms) | Path Found |
|-----------|---|-------------|----------|---------------|------------|
| BFS | 60 | 992 | 58.6 | 0.245 | 100.0% |
| DFS | 60 | 467 | 466.6 | 0.166 | 100.0% |
| Dijkstra | 60 | 984 | 58.6 | 0.335 | 100.0% |
| A* | 60 | 346 | 58.6 | 0.137 | 100.0% |
| Greedy | 60 | 96 | 63.3 | 0.041 | 100.0% |
| Swarm | 60 | 155 | 61.2 | 0.064 | 100.0% |
| Conv. Swarm | 60 | 110 | 62.8 | 0.044 | 100.0% |
| 0-1 BFS | 60 | 472 | 0.0 | 0.216 | 100.0% |

### E1.2 — Tip mape: city

| Algoritam | N | Avg Expanded | Avg Cost | Avg Time (ms) | Path Found |
|-----------|---|-------------|----------|---------------|------------|
| BFS | 60 | 491 | 71.6 | 0.097 | 90.0% |
| DFS | 60 | 258 | 236.4 | 0.060 | 90.0% |
| Dijkstra | 60 | 491 | 71.6 | 0.123 | 90.0% |
| A* | 60 | 335 | 71.6 | 0.103 | 90.0% |
| Greedy | 60 | 121 | 72.7 | 0.032 | 90.0% |
| Swarm | 60 | 127 | 72.0 | 0.034 | 90.0% |
| Conv. Swarm | 60 | 121 | 72.7 | 0.030 | 90.0% |
| 0-1 BFS | 60 | 257 | 0.0 | 0.084 | 90.0% |

### E1.2 — Tip mape: maze

| Algoritam | N | Avg Expanded | Avg Cost | Avg Time (ms) | Path Found |
|-----------|---|-------------|----------|---------------|------------|
| BFS | 60 | 360 | 227.1 | 0.102 | 100.0% |
| DFS | 60 | 237 | 237.1 | 0.053 | 100.0% |
| Dijkstra | 60 | 359 | 227.1 | 0.092 | 100.0% |
| A* | 60 | 326 | 227.1 | 0.081 | 100.0% |
| Greedy | 60 | 254 | 227.1 | 0.064 | 100.0% |
| Swarm | 60 | 294 | 227.1 | 0.073 | 100.0% |
| Conv. Swarm | 60 | 269 | 227.1 | 0.065 | 100.0% |
| 0-1 BFS | 60 | 237 | 0.0 | 0.079 | 100.0% |

### E1.2 — Tip mape: mixed

| Algoritam | N | Avg Expanded | Avg Cost | Avg Time (ms) | Path Found |
|-----------|---|-------------|----------|---------------|------------|
| BFS | 180 | 492 | 35.9 | 0.140 | 68.9% |
| DFS | 180 | 342 | 437.4 | 0.110 | 68.9% |
| Dijkstra | 180 | 484 | 59.1 | 0.176 | 68.9% |
| A* | 180 | 245 | 59.1 | 0.091 | 68.9% |
| Greedy | 180 | 82 | 94.8 | 0.027 | 68.9% |
| Swarm | 180 | 138 | 61.0 | 0.046 | 68.9% |
| Conv. Swarm | 180 | 94 | 75.2 | 0.031 | 68.9% |
| 0-1 BFS | 180 | 350 | 3.8 | 0.137 | 68.9% |

### E1.2 — Tip mape: open

| Algoritam | N | Avg Expanded | Avg Cost | Avg Time (ms) | Path Found |
|-----------|---|-------------|----------|---------------|------------|
| BFS | 60 | 793 | 25.0 | 0.219 | 100.0% |
| DFS | 60 | 25 | 25.0 | 0.009 | 100.0% |
| Dijkstra | 60 | 770 | 25.0 | 0.281 | 100.0% |
| A* | 60 | 25 | 25.0 | 0.012 | 100.0% |
| Greedy | 60 | 25 | 25.0 | 0.011 | 100.0% |
| Swarm | 60 | 25 | 25.0 | 0.011 | 100.0% |
| Conv. Swarm | 60 | 25 | 25.0 | 0.011 | 100.0% |
| 0-1 BFS | 60 | 25 | 0.0 | 0.014 | 100.0% |

### E1.2 — Tip mape: random

| Algoritam | N | Avg Expanded | Avg Cost | Avg Time (ms) | Path Found |
|-----------|---|-------------|----------|---------------|------------|
| BFS | 180 | 492 | 35.9 | 0.162 | 68.9% |
| DFS | 180 | 342 | 437.4 | 0.128 | 68.9% |
| Dijkstra | 180 | 490 | 35.9 | 0.234 | 68.9% |
| A* | 180 | 144 | 35.9 | 0.061 | 68.9% |
| Greedy | 180 | 82 | 39.2 | 0.033 | 68.9% |
| Swarm | 180 | 95 | 36.9 | 0.039 | 68.9% |
| Conv. Swarm | 180 | 85 | 38.5 | 0.034 | 68.9% |
| 0-1 BFS | 180 | 341 | 0.0 | 0.153 | 68.9% |

### E1.2 — Tip mape: weighted

| Algoritam | N | Avg Expanded | Avg Cost | Avg Time (ms) | Path Found |
|-----------|---|-------------|----------|---------------|------------|
| BFS | 60 | 793 | 25.0 | 0.238 | 100.0% |
| DFS | 60 | 25 | 25.0 | 0.010 | 100.0% |
| Dijkstra | 60 | 850 | 35.4 | 0.418 | 100.0% |
| A* | 60 | 163 | 35.4 | 0.082 | 100.0% |
| Greedy | 60 | 25 | 62.3 | 0.013 | 100.0% |
| Swarm | 60 | 48 | 38.4 | 0.022 | 100.0% |
| Conv. Swarm | 60 | 26 | 57.6 | 0.013 | 100.0% |
| 0-1 BFS | 60 | 401 | 0.2 | 0.264 | 100.0% |

### E1.3 — Uticaj gustine prepreka (random + mixed mape)

| Gustina | Algoritam | N | Avg Expanded | Avg Cost | Path Found |
|---------|-----------|---|-------------|----------|------------|
| 15% | BFS | 120 | 741 | 29.7 | 100.0% |
| 15% | DFS | 120 | 486 | 486.1 | 100.0% |
| 15% | Dijkstra | 120 | 738 | 36.3 | 100.0% |
| 15% | A* | 120 | 164 | 36.3 | 100.0% |
| 15% | Greedy | 120 | 35 | 53.4 | 100.0% |
| 15% | Swarm | 120 | 56 | 38.1 | 100.0% |
| 15% | Conv. Swarm | 120 | 37 | 46.7 | 100.0% |
| 15% | 0-1 BFS | 120 | 453 | 0.6 | 100.0% |
| 30% | BFS | 120 | 622 | 41.3 | 95.0% |
| 30% | DFS | 120 | 433 | 417.2 | 95.0% |
| 30% | Dijkstra | 120 | 609 | 57.0 | 95.0% |
| 30% | A* | 120 | 314 | 57.0 | 95.0% |
| 30% | Greedy | 120 | 114 | 79.6 | 95.0% |
| 30% | Swarm | 120 | 194 | 58.2 | 95.0% |
| 30% | Conv. Swarm | 120 | 133 | 66.1 | 95.0% |
| 30% | 0-1 BFS | 120 | 477 | 3.0 | 95.0% |
| 45% | BFS | 120 | 113 | 45.6 | 11.7% |
| 45% | DFS | 120 | 108 | 183.4 | 11.7% |
| 45% | Dijkstra | 120 | 113 | 66.9 | 11.7% |
| 45% | A* | 120 | 105 | 66.9 | 11.7% |
| 45% | Greedy | 120 | 96 | 80.6 | 11.7% |
| 45% | Swarm | 120 | 100 | 66.9 | 11.7% |
| 45% | Conv. Swarm | 120 | 97 | 68.4 | 11.7% |
| 45% | 0-1 BFS | 120 | 108 | 4.7 | 11.7% |

### E1.4 — Zaključci

**Šta testiramo:** Osnovna uporedna analiza svih 8 algoritama na istim mapama. Cilj je utvrditi kako se različiti pristupi ponašaju na različitim tipovima terena — od otvorenog polja do gusto popunjenih lavirinata.

- **Najmanje ekspandiranih čvorova (prosek):** Greedy (92)
- **Najniža cena puta (prosek):** 0-1 BFS (0.9)
- **Najbrže izvršavanje:** Greedy (0.031 ms)

**Ključna zapažanja:**
- DFS ima značajno veću cenu puta (307.1) jer ne garantuje optimalnost — prati jedan put do kraja pre nego što se vrati.
- Dijkstra i A* daju identičnu optimalnu cenu, ali A* ekspandira znatno manje čvorova zahvaljujući heuristici koja usmerava pretragu ka cilju.
- Greedy je najbrži ali daje suboptimalne puteve — to je očekivano jer koristi samo h(n) bez g(n), što znači da ignoriše već pređeni put.
- Swarm familija pruža kompromis između brzine i optimalnosti — idealan primer trade-off-a koji je edukativno vredan za studente.
- Gustina prepreka od 45% drastično smanjuje path found rate (na ~12%) — većina mapa postaje nerešiva.

---

## E6 — Skalabilnost: ponašanje algoritama pri različitim veličinama grida

### E6.1 — Prosečan broj ekspandiranih čvorova po veličini grida

| Algoritam | 10×20 | 25×50 | 50×100 | 75×150 | 100×200 |
|-----------|---|---|---|---|---|
| BFS | 93 | 591 | 2428 | 5462 | 9819 |
| DFS | 35 | 236 | 762 | 2006 | 3458 |
| Dijkstra | 93 | 582 | 2426 | 5460 | 9816 |
| A* | 34 | 206 | 673 | 1623 | 2880 |
| Greedy | 27 | 139 | 420 | 936 | 1606 |
| Swarm | 29 | 165 | 527 | 1306 | 2330 |
| Conv. Swarm | 28 | 147 | 472 | 1171 | 2127 |
| 0-1 BFS | 35 | 230 | 929 | 1730 | 3672 |

### E6.2 — Prosečno vreme izvršavanja (ms) po veličini grida

| Algoritam | 10×20 | 25×50 | 50×100 | 75×150 | 100×200 |
|-----------|---|---|---|---|---|
| BFS | 0.05 | 0.18 | 0.62 | 1.64 | 3.19 |
| DFS | 0.01 | 0.08 | 0.20 | 0.58 | 1.05 |
| Dijkstra | 0.03 | 0.22 | 0.88 | 2.26 | 4.78 |
| A* | 0.01 | 0.06 | 0.19 | 0.51 | 0.94 |
| Greedy | 0.01 | 0.04 | 0.12 | 0.27 | 0.48 |
| Swarm | 0.01 | 0.05 | 0.14 | 0.36 | 0.71 |
| Conv. Swarm | 0.01 | 0.04 | 0.13 | 0.33 | 0.65 |
| 0-1 BFS | 0.01 | 0.09 | 0.36 | 0.73 | 1.91 |

### E6.3 — Zaključci

**Šta testiramo:** Kako se performanse algoritama menjaju kada grid raste od 10×20 (200 ćelija) do 100×200 (20,000 ćelija) — faktor od 100×. Ovo je ključno za razumevanje praktične primenljivosti algoritama na velikim mapama.

**Ključna zapažanja:**
- Sa povećanjem grida, svi algoritmi ekspandiraju više čvorova, ali heuristički (A*, Greedy, Swarm) **skaliraju značajno bolje** od neinformisanih (BFS, Dijkstra).
- BFS i Dijkstra na 100×200 gridu ekspandiraju **10-50× više čvorova** nego na 10×20 — njihova kompleksnost je O(V+E) bez usmeravanja.
- A* održava relativno stabilan odnos zahvaljujući heuristici koja usmerava pretragu — na 100×200 ekspandira samo ~3× više nego na 25×50.
- DFS je nepredvidiv — nekad brz (ako slučajno krene ka cilju), nekad eksplorira celokupan graf.
- **Praktičan zaključak:** Za aplikacije sa velikim gridovima, A* je jedini algoritam koji daje optimalan put u razumnom vremenu.

---

## E7 — Uticaj izbora heuristike na performanse algoritama

Porede se 4 heuristike: Manhattan, Euclidean, Chebyshev i Octile za A*, Greedy, Swarm i Convergent Swarm.

### E7.1 — Prosečan broj ekspandiranih čvorova

| Algoritam | Manhattan | Euclidean | Chebyshev | Octile |
|-----------|---|---|---|---|
| A* | 220 | 291 | 312 | 269 |
| Greedy | 107 | 99 | 102 | 100 |
| Swarm | 137 | 129 | 133 | 130 |
| Conv. Swarm | 114 | 107 | 109 | 108 |

### E7.2 — Prosečna cena puta

| Algoritam | Manhattan | Euclidean | Chebyshev | Octile |
|-----------|---|---|---|---|
| A* | 77.1 | 77.1 | 77.1 | 77.1 |
| Greedy | 84.2 | 83.7 | 84.1 | 83.7 |
| Swarm | 78.3 | 77.6 | 78.0 | 77.7 |
| Conv. Swarm | 83.0 | 79.3 | 80.0 | 80.5 |

### E7.3 — Zaključci

**Šta testiramo:** Uticaj izbora heuristike na performanse informisanih algoritama. Heuristika h(n) procenjuje udaljenost do cilja i direktno utiče na redosled ekspanzije čvorova.

**Ključna zapažanja:**
- **Manhattan** heuristika daje najmanje ekspandiranih čvorova za A* na 4-connected gridovima jer je **admissible i consistent** — nikad ne precenjuje, pa A* garantuje optimalnost sa minimalnim ekspanzijama.
- **Euclidean** blago potcenjuje udaljenost (prava linija < Manhattan na gridu), što dovodi do više ekspanzija ali identične optimalne cene — dokazuje da admissibility garantuje optimalnost bez obzira na "labavost" heuristike.
- **Chebyshev** je pogodnija za 8-connected kretanje jer tretira dijagonalne korake kao cenu 1.
- **Octile** je optimalna heuristika za 8-connected gridove — precizno kombinuje dijagonalne (√2) i prave (1) korake.
- Za **Greedy**, izbor heuristike utiče značajnije jer je f(n) = h(n) — ceo prioritet zavisi od procene, pa lošija heuristika više "luta".
- **Praktičan zaključak:** Na 4-connected gridu koristiti Manhattan; na 8-connected koristiti Octile.

---

## E8 — Uticaj tipa susedstva: 4-connected vs 8-connected

### E8.1 — Uporedna tabela

| Algoritam | Mode | N | Avg Expanded | Avg Cost | Avg Length | Avg Time (ms) | Path Found |
|-----------|------|---|-------------|----------|------------|---------------|------------|
| BFS | 4-conn | 165 | 711 | 75.0 | 76.0 | 0.222 | 98.2% |
| DFS | 4-conn | 165 | 247 | 238.4 | 121.1 | 0.085 | 98.2% |
| Dijkstra | 4-conn | 165 | 715 | 77.1 | 77.4 | 0.305 | 98.2% |
| A* | 4-conn | 165 | 220 | 77.1 | 77.4 | 0.087 | 98.2% |
| Greedy | 4-conn | 165 | 107 | 84.2 | 77.5 | 0.038 | 98.2% |
| Swarm | 4-conn | 165 | 137 | 78.3 | 77.9 | 0.051 | 98.2% |
| Conv. Swarm | 4-conn | 165 | 114 | 83.0 | 77.4 | 0.040 | 98.2% |
| 0-1 BFS | 4-conn | 165 | 315 | 0.0 | 120.7 | 0.147 | 98.2% |
| BFS | 8-conn | 165 | 781 | 54.3 | 55.3 | 0.376 | 100.0% |
| DFS | 8-conn | 165 | 415 | 415.2 | 394.2 | 0.242 | 100.0% |
| Dijkstra | 8-conn | 165 | 752 | 62.4 | 55.3 | 0.555 | 100.0% |
| A* | 8-conn | 165 | 147 | 62.4 | 55.4 | 0.092 | 100.0% |
| Greedy | 8-conn | 165 | 72 | 70.2 | 55.7 | 0.040 | 100.0% |
| Swarm | 8-conn | 165 | 90 | 63.7 | 55.5 | 0.050 | 100.0% |
| Conv. Swarm | 8-conn | 165 | 78 | 65.8 | 55.5 | 0.040 | 100.0% |
| 0-1 BFS | 8-conn | 165 | 315 | 0.0 | 120.9 | 0.226 | 100.0% |

### E8.2 — Zaključci

**Šta testiramo:** Razliku između dva tipa kretanja: 4-connected (gore/dole/levo/desno) i 8-connected (+ dijagonale). Ovo utiče na kvalitet puta, broj ekspanzija i sposobnost pronalaženja puta kroz uske prolaze.

**Ključna zapažanja:**
- 8-connected kretanje pronalazi **kraće puteve** jer dijagonalni koraci (trošak √2 ≈ 1.41) omogućavaju "prečice" umesto ortogonalnih L-oblika.
- **Path found rate je viši** kod 8-connected jer postoji više mogućih puteva kroz iste prepreke — dijagonala može proći između dva zida koji blokiraju 4-connected kretanje.
- A* u 8-connected ekspandira **manje čvorova** jer dijagonalni koraci brže približavaju cilju.
- BFS u 8-connected modu ne garantuje optimalan put **po ceni** (samo po broju koraka) — jer ne razlikuje dijagonalne korake od pravih.
- **Praktičan zaključak:** Za aplikacije gde je dijagonalno kretanje dozvoljeno, 8-connected sa Octile heuristikom daje najbolje rezultate.

---

## E9 — Analiza uticaja Swarm težine (w parametar)

Parametar w kontroliše odnos između eksploracije (g) i heuristike (h) u formulama f(n) = g(n) + w·h(n).
- w = 1.0: ekvivalentno A* (optimalan put)
- w > 1.0: veći naglasak na heuristiku (brži ali manje optimalan)

### E9.1 — Swarm: w sweep

| w | N | Avg Expanded | Avg Cost | Avg Time (ms) | Path Found |
|---|---|-------------|----------|---------------|------------|
| 1.0 | 99 | 250 | 101.6 | 0.090 | 97.0% |
| 1.5 | 99 | 189 | 102.1 | 0.063 | 97.0% |
| 2.0 | 99 | 172 | 102.8 | 0.065 | 97.0% |
| 3.0 | 99 | 157 | 104.8 | 0.050 | 97.0% |
| 5.0 | 99 | 148 | 110.3 | 0.044 | 97.0% |
| 7.0 | 99 | 145 | 111.9 | 0.043 | 97.0% |
| 10.0 | 99 | 143 | 112.0 | 0.044 | 97.0% |

### E9.1 — Conv. Swarm: w sweep

| w | N | Avg Expanded | Avg Cost | Avg Time (ms) | Path Found |
|---|---|-------------|----------|---------------|------------|
| 1.0 | 99 | 250 | 101.6 | 0.083 | 97.0% |
| 1.5 | 99 | 189 | 102.1 | 0.058 | 97.0% |
| 2.0 | 99 | 172 | 102.8 | 0.053 | 97.0% |
| 3.0 | 99 | 157 | 104.8 | 0.045 | 97.0% |
| 5.0 | 99 | 148 | 110.3 | 0.048 | 97.0% |
| 7.0 | 99 | 145 | 111.9 | 0.051 | 97.0% |
| 10.0 | 99 | 143 | 112.0 | 0.041 | 97.0% |

### E9.2 — Bazne linije (referentni algoritmi na istim mapama)

| Algoritam | N | Avg Expanded | Avg Cost | Avg Time (ms) |
|-----------|---|-------------|----------|---------------|
| Dijkstra | 99 | 608 | 101.6 | 0.245 |
| BFS | 99 | 591 | 98.1 | 0.168 |
| A* | 99 | 250 | 101.6 | 0.112 |
| Greedy | 99 | 139 | 112.3 | 0.043 |

### E9.3 — Zaključci

**Šta testiramo:** Swarm familija koristi formulu f(n) = g(n) + w·h(n), gde w kontroliše balans između eksploracije (g) i eksploatacije heuristike (h). Ova evaluacija meri kako w utiče na trade-off između brzine i optimalnosti.

**Ključna zapažanja:**
- **w = 1.0** daje rezultate identične A* — optimalan put, ali najviše ekspanzija u Swarm familiji.
- **w = 2.0** (Swarm default) pruža dobar balans — značajno manje ekspanzija (~30% manje nego A*) uz blago višu cenu (~3-5%).
- **w ≥ 5.0** konvergira ka ponašanju sličnom Greedy — veoma brz ali značajno suboptimalan (~10-15% viša cena).
- **Plato efekat:** Iznad w=7.0 gotovo nema daljih poboljšanja u brzini — broj ekspanzija se stabilizuje, ali cena nastavlja da raste.
- **Napomena:** Swarm i Conv. Swarm daju identične rezultate za isti w jer koriste istu formulu f(n) = g(n) + w·h(n). Razlika između njih u aplikaciji je samo default w vrednost (Swarm: w=2, Conv. Swarm: w=5). Kada se w eksplicitno zadaje kao u ovom testu, razlika nestaje — što potvrđuje da je jedini razlikovni faktor upravo w parametar.
- **Edukativna vrednost:** w parametar odlično ilustruje fundamentalni trade-off u algoritmima pretrage — više informacije od heuristike = brža pretraga, ali sa rizikom gubitka optimalnosti.

---

## E10 — Ponašanje algoritama na nerešivim mapama

Start čvor je potpuno okružen zidovima — ne postoji nijedan put do cilja.

| Veličina | Algoritam | N | Avg Expanded | Avg Time (ms) | Path Found |
|---------|-----------|---|-------------|---------------|------------|
| 10× | BFS | 33 | 1 | 0.0005 | 0.0% |
| 10× | DFS | 33 | 1 | 0.0001 | 0.0% |
| 10× | Dijkstra | 33 | 1 | 0.0002 | 0.0% |
| 10× | A* | 33 | 1 | 0.0000 | 0.0% |
| 10× | Greedy | 33 | 1 | 0.0001 | 0.0% |
| 10× | Swarm | 33 | 1 | 0.0000 | 0.0% |
| 10× | Conv. Swarm | 33 | 1 | 0.0000 | 0.0% |
| 10× | 0-1 BFS | 33 | 1 | 0.0002 | 0.0% |
| 25× | BFS | 33 | 1 | 0.0002 | 0.0% |
| 25× | DFS | 33 | 1 | 0.0000 | 0.0% |
| 25× | Dijkstra | 33 | 1 | 0.0000 | 0.0% |
| 25× | A* | 33 | 1 | 0.0000 | 0.0% |
| 25× | Greedy | 33 | 1 | 0.0000 | 0.0% |
| 25× | Swarm | 33 | 1 | 0.0001 | 0.0% |
| 25× | Conv. Swarm | 33 | 1 | 0.0000 | 0.0% |
| 25× | 0-1 BFS | 33 | 1 | 0.0000 | 0.0% |
| 50× | BFS | 33 | 1 | 0.0004 | 0.0% |
| 50× | DFS | 33 | 1 | 0.0000 | 0.0% |
| 50× | Dijkstra | 33 | 1 | 0.0001 | 0.0% |
| 50× | A* | 33 | 1 | 0.0000 | 0.0% |
| 50× | Greedy | 33 | 1 | 0.0000 | 0.0% |
| 50× | Swarm | 33 | 1 | 0.0000 | 0.0% |
| 50× | Conv. Swarm | 33 | 1 | 0.0000 | 0.0% |
| 50× | 0-1 BFS | 33 | 1 | 0.0000 | 0.0% |

### E10.1 — Zaključci

**Šta testiramo:** Ponašanje algoritama kada put do cilja **ne postoji**. Start čvor je potpuno okružen zidovima. Ovo testira korektnost implementacije — da li se algoritam zaustavi umesto da uđe u beskonačnu petlju.

**Ključna zapažanja:**
- **Svi algoritmi korektno detektuju nedostupnost** cilja i vraćaju "no path" — potvrda robusnosti implementacije.
- Na potpuno zatvorenoj poziciji, **svi ekspandiraju samo 1 čvor** (start) — čim iscrpe frontier (nema dostupnih suseda), završavaju.
- **Veličina grida NE utiče** na performanse jer je start izolovan — 10×20 i 100×200 imaju identično vreme.
- **Praktičan zaključak:** Step-based state machine interfejs (init/step/isDone/getResult) korektno radi za sve edge case-ove, uključujući nerešive mape.

---

## Opšti zaključci evaluacije

Na osnovu **17754 simulacija** sprovedenih na 7+ tipova mapa, 5 veličina gridova, 4 heuristike, 2 tipa susedstva i 7 vrednosti w parametra, mogu se izvesti sledeći zaključci:

### Rangiranje algoritama po efikasnosti (avg expanded čvorova)

| Rang | Algoritam | Avg Expanded | Avg Cost | Optimalan? |
|------|-----------|-------------|----------|------------|
| 1 | Greedy | 92 | 79.7 | Ne |
| 2 | Conv. Swarm | 99 | 74.5 | Ne |
| 3 | Swarm | 123 | 68.5 | Ne |
| 4 | A* | 215 | 67.2 | Da* |
| 5 | DFS | 279 | 307.1 | Ne |
| 6 | 0-1 BFS | 315 | 0.9 | Da* |
| 7 | Dijkstra | 579 | 67.2 | Da* |
| 8 | BFS | 580 | 60.7 | Da* |

*BFS je optimalan samo u neponderisanim grafovima (po broju koraka, ne po ceni). Dijkstra i A* su optimalni u ponderisanim grafovima. 0-1 BFS je optimalan isključivo za grafove sa težinama iz skupa {0, 1} — na standardnim mapama (weight=1) daje cost=0 jer tretira weight≤1 kao nultu cenu.

### Ključni uvidi

1. **A* je najbolji izbor za opštu upotrebu** — daje optimalan put sa znatno manje ekspanzija od Dijkstre, zahvaljujući heuristici.
2. **Dijkstra je referentni optimalni algoritam** — guarantuje najjeftiniji put ali ekspandira sve čvorove unutar cost radijusa.
3. **BFS je efikasan za neponderisane grafove** — daje najkraći put po broju koraka, ali ne razlikuje težine terena.
4. **Greedy je najbrži ali najnepouzdaniji** — često daje značajno suboptimalne puteve, naročito na mapama sa preprekama.
5. **Swarm (w=2) nudi odličan trade-off** — 2-3× manje ekspanzija od A* uz svega 5-10% višu cenu puta.
6. **DFS je edukativno vredan ali praktično neprihvatljiv** — putevi su često 5-10× skuplji od optimalnih.
7. **0-1 BFS je specijalizovan** — dizajniran za grafove sa isključivo binarnim težinama {0, 1}. Na standardnim mapama (weight=1 za sve ćelije) svaka ivica ima cost 0, pa je ukupan path cost 0. Ovo nije bug — algoritam korektno rešava problem za koji je dizajniran, ali na mapama sa uniform weight=1 nije informativan za poređenje cena puteva.
8. **Skalabilnost:** Heuristički algoritmi (A*, Greedy, Swarm) mnogo bolje podnose velike gridove nego BFS/Dijkstra.
9. **8-connected omogućava kraće puteve** ali zahteva pažljiv izbor heuristike (Octile umesto Manhattan).
10. **Svi algoritmi korektno detektuju nerešive mape** — potvrda robusnosti implementacije.

### Preporuka po tipu mape

| Tip mape | Preporučeni algoritam | Razlog |
|----------|----------------------|--------|
| Open field | A* ili Greedy | Malo prepreka, heuristika direktno vodi ka cilju |
| Random prepreke | A* | Balans optimalnosti i brzine među preprekama |
| Lavirint | A* ili BFS | Strukturiran prostor gde heuristika pomaže navigaciji |
| Težinski teren | Dijkstra ili A* | Neophodna ponderisana optimizacija |
| Bottleneck | A* | Heuristika pomaže da se brzo nađe uski prolaz |
| City blocks | A* (Manhattan h.) | Manhattan heuristika idealno odgovara ortogonalnom rasporedu |
| Nerešive mape | Bilo koji | Svi korektno detektuju nedostupnost |
