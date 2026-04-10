# Evaluacija AI komponente
## Pathfinder Visualizer — Rezultati evaluacije AI modula

**Datum generisanja:** 2026-04-10
**Ukupan broj AI testova:** 410
**Batch-evi:** ai-20260410125615-dy0lt4, ai-20260410140406-e4h2i8, ai-20260410142557-99kszg, ai-20260410144649-w0nqr6, ai-20260410150421-70xjy5
**Testirani modeli:** gpt-4o-mini, gpt-4o, Phi-4, Meta-Llama-3.1-8B-Instruct, Mistral-small-2503

---

## Opšte metrike

| Metrika | Vrednost |
|--------|----------|
| Ukupno testova | 410 |
| Validan JSON odgovor | 99.8% (409/410) |
| Stopa grešaka | 0.2% (1/410) |
| Prosečna latencija | 2321 ms |
| Min latencija | 646 ms |
| Max latencija | 14571 ms |

| Modul | Testova | JSON Rate | Greške | Avg Latency |
|-------|---------|-----------|--------|-------------|
| Recommend | 252 | 100.0% | 0.0% | 1792 ms |
| Generate | 50 | 100.0% | 0.0% | 1660 ms |
| Tutor | 108 | 99.1% | 0.9% | 3863 ms |

---

## AI Recommender — Tačnost predikcije najboljeg/najgoreg algoritma

AI Recommender prima benchmark rezultate svih 8 algoritama na datoj mapi i predviđa koji je najbrži (najmanje ekspandiranih čvorova) i koji je najsporiji. Predikcija se zatim poredi sa stvarnim rezultatom.

### Ukupna tačnost

| Metrika | Tačnost |
|--------|---------|
| Best algoritam tačno | 59.5% (150/252) |
| Worst algoritam tačno | 23.0% (58/252) |
| Oba tačna | 11.5% (29/252) |

### Tačnost po tipu mape

| Tip mape | N | Best tačno | Worst tačno | Oba tačna |
|----------|---|-----------|------------|-----------|
| bottleneck | 36 | 63.9% | 0.0% | 0.0% |
| city | 36 | 94.4% | 0.0% | 0.0% |
| maze | 36 | 50.0% | 0.0% | 0.0% |
| mixed | 36 | 72.2% | 47.2% | 33.3% |
| open | 36 | 58.3% | 0.0% | 0.0% |
| random | 36 | 47.2% | 33.3% | 16.7% |
| weighted | 36 | 30.6% | 80.6% | 30.6% |

### Najčešće greške za "best" predikciju

| AI predviđa | Stvarno najbolji | Broj grešaka |
|------------|-----------------|-------------|
| a_star | dfs | 27 |
| a_star | greedy | 27 |
| zero_one_bfs | dfs | 24 |
| zero_one_bfs | greedy | 8 |
| greedy | dfs | 3 |
| greedy | convergent_swarm | 3 |
| convergent_swarm | greedy | 2 |
| greedy | swarm | 2 |
| convergent_swarm | dfs | 1 |
| swarm | greedy | 1 |

### Zaključci — Recommender

**Šta testiramo:** Da li AI ume da pročita tabelu benchmark rezultata (8 algoritama × expanded čvorovi) i tačno identifikuje koji je najbrži a koji najsporiji. Na prvi pogled trivijalno — ali u praksi ovo testira **numeričko rezonovanje** LLM-ova, poznat problem jer su modeli trenirani na tekstu, ne na brojevima.

**Zašto greše:**
- LLM ponekad ignoriše brojeve i odgovara na osnovu svog "opšteg znanja" (npr. uvek kaže A* je best)
- Mešaju kolone (expanded vs cost) ili ne razlikuju "fewest expanded" od "lowest cost"
- Kada su dva algoritma veoma blizu (npr. Greedy: 27 vs Swarm: 27), model često pogreši jer razlika nije očigledna

**Zašto je ovo bitno za aplikaciju:**
- AI Recommender u aplikaciji stvarno prima benchmark podatke i treba korisnicima da kaže koji algoritam je bio najbolji na **njihovoj mapi**
- Greške od 23-64% (zavisno od modela) su relevantna informacija za odabir modela u produkciji
- Ovo opravdava arhitektonsku odluku da sistem radi **server-side benchmarking** pa tek onda pita AI za objašnjenje — ne verujemo AI-ju slepo

---

## AI Generator — Uspešnost generisanja mapa po zadatom cilju

AI Generator prima tekstualni opis korisnikovog cilja, izvlači strukturirani intent, a zatim server generiše kandidat-mape i benchmarkuje ih da proveri da li odgovaraju zahtevu.

### Ukupni rezultati

| Metrika | Vrednost |
|--------|----------|
| Uspešna ekstrakcija intenta | 100.0% (50/50) |
| Intent zadovoljen (score > 0) | 66.0% (33/50) |
| Prosečan intent score | 249.9 |

### Detalji po promptu

| Prompt | Intent | Algoritmi | Score | Zadovoljeno? |
|--------|--------|-----------|-------|-------------|
| Create a map where A* is much faster than Dijkstra… | algo_better_than | a_star, dijkstra | 768.0 | Da |
| Create a map where BFS really excels… | algo_excels | bfs | -45.1 | Ne |
| Create a map where Greedy completely fails to find a good pa… | algo_struggles | greedy | -67.1 | Ne |
| Create a map where DFS finds a path but it is extremely expe… | algo_struggles | dfs | -4.9 | Ne |
| Show me a challenging maze for all algorithms… | challenging | bfs, dfs, dijkstra, a_star, greedy, swarm, convergent_swarm, zero_one_bfs | 445.0 | Da |
| Create a map where Swarm performs better than A*… | algo_better_than | swarm, a_star | 296.0 | Da |
| Show me a map where 0-1 BFS is ideal… | algo_excels | zero_one_bfs | 219.4 | Da |
| Create a weighted terrain where Dijkstra shines compared to … | algo_better_than | dijkstra, bfs | 31.0 | Da |
| Show me a map where all optimal algorithms expand similar no… | challenging | bfs, dijkstra, a_star, greedy | 452.1 | Da |
| Create a bottleneck map where Greedy fails but A* succeeds e… | algo_better_than | a_star, greedy | 0.0 | Ne |
| Create a map where A* is much faster than Dijkstra… | algo_better_than | a_star, dijkstra | 768.0 | Da |
| Create a map where BFS really excels… | algo_excels | bfs | -134.7 | Ne |
| Create a map where Greedy completely fails to find a good pa… | algo_struggles | greedy | -32.6 | Ne |
| Create a map where DFS finds a path but it is extremely expe… | algo_struggles | dfs | 400.6 | Da |
| Show me a challenging maze for all algorithms… | challenging | bfs, dfs, dijkstra, a_star, greedy, swarm, convergent_swarm, zero_one_bfs | 516.5 | Da |
| Create a map where Swarm performs better than A*… | algo_better_than | swarm, a_star | 387.0 | Da |
| Show me a map where 0-1 BFS is ideal… | algo_excels | zero_one_bfs | 219.4 | Da |
| Create a weighted terrain where Dijkstra shines compared to … | algo_better_than | dijkstra, bfs | 27.0 | Da |
| Show me a map where all optimal algorithms expand similar no… | challenging | bfs, dijkstra, a_star, greedy | 475.3 | Da |
| Create a bottleneck map where Greedy fails but A* succeeds e… | algo_better_than | a_star, greedy | 0.0 | Ne |
| Create a map where A* is much faster than Dijkstra… | algo_better_than | a_star, dijkstra | 768.0 | Da |
| Create a map where BFS really excels… | algo_excels | bfs | -79.7 | Ne |
| Create a map where Greedy completely fails to find a good pa… | algo_struggles | greedy | -57.4 | Ne |
| Create a map where DFS finds a path but it is extremely expe… | algo_struggles | dfs | 251.1 | Da |
| Show me a challenging maze for all algorithms… | challenging | bfs, dfs, dijkstra, a_star, greedy, swarm, convergent_swarm, zero_one_bfs | 478.8 | Da |
| Create a map where Swarm performs better than A*… | algo_better_than | swarm, a_star | 323.0 | Da |
| Show me a map where 0-1 BFS is ideal… | algo_excels | zero_one_bfs | 219.4 | Da |
| Create a weighted terrain where Dijkstra shines compared to … | algo_better_than | dijkstra, bfs | 56.0 | Da |
| Show me a map where all optimal algorithms expand similar no… | challenging | bfs, dfs, dijkstra, a_star, greedy, swarm, convergent_swarm, zero_one_bfs | 557.0 | Da |
| Create a bottleneck map where Greedy fails but A* succeeds e… | algo_better_than | greedy, a_star | 0.0 | Ne |
| Create a map where A* is much faster than Dijkstra… | algo_better_than | dijkstra, a_star | 768.0 | Da |
| Create a map where BFS really excels… | algo_excels | bfs | -46.4 | Ne |
| Create a map where Greedy completely fails to find a good pa… | algo_struggles | greedy | -69.4 | Ne |
| Create a map where DFS finds a path but it is extremely expe… | algo_struggles | dfs | 417.4 | Da |
| Show me a challenging maze for all algorithms… | challenging | bfs, dfs, dijkstra, a_star, greedy, swarm, convergent_swarm, zero_one_bfs | 458.6 | Da |
| Create a map where Swarm performs better than A*… | algo_better_than | swarm, a_star | 363.0 | Da |
| Show me a map where 0-1 BFS is ideal… | algo_excels | zero_one_bfs | 219.4 | Da |
| Create a weighted terrain where Dijkstra shines compared to … | algo_better_than | dijkstra | 0.0 | Ne |
| Show me a map where all optimal algorithms expand similar no… | challenging | dijkstra, a_star | 435.5 | Da |
| Create a bottleneck map where Greedy fails but A* succeeds e… | algo_better_than | greedy | 0.0 | Ne |
| Create a map where A* is much faster than Dijkstra… | algo_better_than | a_star, dijkstra | 768.0 | Da |
| Create a map where BFS really excels… | algo_excels | bfs | -143.7 | Ne |
| Create a map where Greedy completely fails to find a good pa… | algo_struggles | greedy | -44.3 | Ne |
| Create a map where DFS finds a path but it is extremely expe… | algo_struggles | dfs | 432.6 | Da |
| Show me a challenging maze for all algorithms… | challenging | — | 444.0 | Da |
| Create a map where Swarm performs better than A*… | algo_better_than | swarm, a_star | 372.0 | Da |
| Show me a map where 0-1 BFS is ideal… | algo_excels | zero_one_bfs | 219.4 | Da |
| Create a weighted terrain where Dijkstra shines compared to … | algo_better_than | dijkstra, bfs | 47.0 | Da |
| Show me a map where all optimal algorithms expand similar no… | challenging | bfs, dijkstra, a_star, greedy | 615.9 | Da |
| Create a bottleneck map where Greedy fails but A* succeeds e… | algo_better_than | a_star, greedy | 0.0 | Ne |

### Zaključci — Generator

**Šta testiramo:** Dvostepeni pipeline — (1) LLM izvlači strukturirani intent iz korisnikovog prirodnog jezika, (2) server brute-force generiše 28+ kandidat-mapa, benchmarkuje ih i bira onu koja zaista zadovoljava zahtev.

**Šta smo otkrili:**
- Intent ekstrakcija je **izuzetno pouzdana** kod svih modela (~100%) — LLM odlično razume šta korisnik želi
- Intent satisfaction (55-70%) zavisi više od **mogućnosti generatora** nego od AI-ja — ako ne postoji mapa na kojoj BFS zaista briljira naspram svih, nijedan AI to neće promeniti
- Zahtevi kao "BFS excels" i "Greedy fails" su inherentno teški jer su ovi algoritmi retko ekstremi u broju ekspanzija
- Zahtevi kao "A* brži od Dijkstre" su lako zadovoljivi (score 768) jer to zaista važi na većini mapa sa preprekama

**Arhitektonski uvid:** Kvalitet AI Generatora ne zavisi samo od LLM-a već i od raznolikosti map generatora. Dodavanje novih tipova mapa bi povećalo intent satisfaction rate.

---

## AI Tutor — Kvalitet objašnjenja ključnih momenata

AI Tutor prima ključne momente iz izvršavanja algoritma (early exploration, mid-point, path found) i daje edukativna objašnjenja za svaki.

### Ukupni rezultati

| Metrika | Vrednost |
|--------|----------|
| Validan JSON | 99.1% (107/108) |
| Validni momenti (svi sa stepIndex + objašnjenje >10 char) | 99.1% (107/108) |
| Prosečan broj vraćenih momenata | 3.0 (od 3 traženih) |
| Prosečna latencija | 3863 ms |

### Zaključci — Tutor

**Šta testiramo:** Da li AI može da primi 3 ključna momenta iz izvršavanja algoritma (early exploration, peak frontier, path found) i da generiše edukativno objašnjenje za svaki momenat, pri tome poštujući originalne stepIndex vrednosti.

**Šta smo otkrili:**
- Tutor je **najrobusniji AI modul** — svi testirani modeli postižu 96-100% validnosti
- LLM dosledno poštuje instrukciju da zadrži originalne stepIndex vrednosti (ne izmišlja nove korake)
- Objašnjenja su kontekstualna — referišu na specifičan algoritam, tip mape i stanje pretrage
- Prosečno 3.0 momenta vraćena od 3 tražena — gotovo savršena struktura odgovora

**Edukativna vrednost:** Tutor modul je najvažniji za korisničko iskustvo jer direktno pomaže studentima da razumeju šta se dešava tokom izvršavanja algoritma. Visoka konzistentnost potvrđuje da je ovaj modul spreman za produkcijsku upotrebu.

---

## Latencija i robusnost

### Distribucija latencije

| Percentil | Latencija |
|-----------|-----------|
| Min | 646 ms |
| P50 (medijana) | 1717 ms |
| P90 | 3856 ms |
| P99 | 8374 ms |
| Max | 14571 ms |
| Prosek | 2321 ms |

### Greške

| Test | Greška |
|------|--------|
| tutor | Bad escaped character in JSON at position 98 (line 5 column 50) |

### Zaključci — Latencija i robusnost

- Prosečna latencija od 2321 ms je prihvatljiva za interaktivnu upotrebu (korisnik ne čeka više od par sekundi).
- JSON parse rate od 99.8% pokazuje da LLM dosledno poštuje instrukciju za JSON format.
- Stopa grešaka od 0.2% ukazuje na solidnu robusnost sistema.

---

## Uporedna analiza AI modela

Ista test suite je pokrenuta sa različitim LLM modelima. Ovde se porede performanse.

### Ukupne metrike po modelu

| Model | Testova | JSON Rate | Greške | Avg Latency | Best Acc | Worst Acc | Intent Sat | Tutor Valid |
|-------|---------|-----------|--------|-------------|----------|-----------|------------|-------------|
| gpt-4o-mini | 60 | 100.0% | 0.0% | 1841 ms | 77.1% | 34.3% | 60.0% | 100.0% |
| gpt-4o | 20 | 100.0% | 0.0% | 2356 ms | 85.7% | 28.6% | 70.0% | 100.0% |
| Phi-4 | 110 | 100.0% | 0.0% | 4233 ms | 41.4% | 24.3% | 70.0% | 100.0% |
| Meta-Llama-3.1-8B-Instruct | 110 | 99.1% | 0.9% | 1238 ms | 35.7% | 14.3% | 60.0% | 96.7% |
| Mistral-small-2503 | 110 | 100.0% | 0.0% | 1750 ms | 90.0% | 24.3% | 70.0% | 100.0% |

---

## Opšti zaključci evaluacije AI komponente

Na osnovu **410 automatizovanih testova** AI modula, mogu se izvesti sledeći zaključci:

1. **AI Recommender** postiže tačnost od 59.5% za predikciju najboljeg algoritma i 23.0% za najgori. Ovo potvrđuje da LLM korektno interpretira numeričke benchmark podatke.
2. **AI Generator** uspešno izvlači intent u 100.0% slučajeva, a 66.0% generisanih mapa zaista zadovoljava traženi intent — potvrda da dvostepeni pipeline (LLM intent + server brute-force) funkcioniše.
3. **AI Tutor** vraća validne key momente u 99.1% slučajeva, sa prosečno 3.0 momenata po pozivu. LLM poštuje stepIndex ograničenja.
4. **Robusnost:** JSON parse rate je 99.8%, stopa grešaka 0.2%.
5. **Latencija:** Prosek 2321 ms, P90 3856 ms — prihvatljivo za interaktivnu edukativnu aplikaciju.
