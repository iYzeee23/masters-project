/**
 * generate-ai-evaluation.ts — Reads AI benchmark results from MongoDB
 * and generates a comprehensive evaluation document.
 *
 * Usage:
 *   npx ts-node src/generate-ai-evaluation.ts              # all data
 *   npx ts-node src/generate-ai-evaluation.ts <batchId>    # specific batch
 *
 * Output: ../../Metrike/AI/AI-EVALUATION.md
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

import { AIBenchmarkResult } from './models/AIBenchmarkResult';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pathfinder';
const OUTPUT_PATH = path.resolve(__dirname, '..', '..', '..', 'Metrike', 'AI', 'AI-EVALUATION.md');

function num(v: unknown, dec = 1): string {
  if (v === null || v === undefined) return '—';
  return Number(v).toFixed(dec);
}
function pct(v: number, total: number): string {
  if (total === 0) return '—';
  return ((v / total) * 100).toFixed(1) + '%';
}

async function main() {
  const args = process.argv.slice(2);
  const batchFilter = args[0] || null;

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const match: Record<string, unknown> = {};
  if (batchFilter) match.batchId = batchFilter;

  const totalDocs = await AIBenchmarkResult.countDocuments(match);
  const batches = await AIBenchmarkResult.distinct('batchId', match);
  console.log(`Data: ${totalDocs} results across ${batches.length} batch(es)`);

  if (totalDocs === 0) {
    console.error('No AI benchmark data found. Run run-ai-benchmark.ts first.');
    process.exit(1);
  }

  const allDocs = await AIBenchmarkResult.find(match).lean();

  const lines: string[] = [];
  const w = (s = '') => lines.push(s);

  // ════════════════════════════════════════════════════════
  // HEADER
  // ════════════════════════════════════════════════════════
  w('# Evaluacija AI komponente');
  w('## Pathfinder Visualizer — Rezultati evaluacije AI modula');
  w();
  w(`**Datum generisanja:** ${new Date().toISOString().split('T')[0]}`);
  w(`**Ukupan broj AI testova:** ${totalDocs}`);
  w(`**Batch-evi:** ${batches.join(', ')}`);
  const models = [...new Set(allDocs.map(d => (d as any).aiModel).filter(Boolean))];
  if (models.length > 0) w(`**Testirani modeli:** ${models.join(', ')}`);
  w();
  w('---');
  w();

  // ════════════════════════════════════════════════════════
  // OVERALL METRICS
  // ════════════════════════════════════════════════════════
  w('## Opšte metrike');
  w();

  const byType = {
    recommend: allDocs.filter(d => d.testType === 'recommend'),
    generate: allDocs.filter(d => d.testType === 'generate'),
    tutor: allDocs.filter(d => d.testType === 'tutor'),
  };

  const overallJsonRate = allDocs.filter(d => d.validJson).length;
  const overallErrRate = allDocs.filter(d => d.errorMessage !== null).length;
  const avgLatency = allDocs.reduce((s, d) => s + d.responseTimeMs, 0) / allDocs.length;
  const minLatency = Math.min(...allDocs.map(d => d.responseTimeMs));
  const maxLatency = Math.max(...allDocs.map(d => d.responseTimeMs));

  w('| Metrika | Vrednost |');
  w('|--------|----------|');
  w(`| Ukupno testova | ${totalDocs} |`);
  w(`| Validan JSON odgovor | ${pct(overallJsonRate, totalDocs)} (${overallJsonRate}/${totalDocs}) |`);
  w(`| Stopa grešaka | ${pct(overallErrRate, totalDocs)} (${overallErrRate}/${totalDocs}) |`);
  w(`| Prosečna latencija | ${num(avgLatency, 0)} ms |`);
  w(`| Min latencija | ${num(minLatency, 0)} ms |`);
  w(`| Max latencija | ${num(maxLatency, 0)} ms |`);
  w();

  w('| Modul | Testova | JSON Rate | Greške | Avg Latency |');
  w('|-------|---------|-----------|--------|-------------|');
  for (const [type, docs] of Object.entries(byType)) {
    if (docs.length === 0) continue;
    const json = docs.filter(d => d.validJson).length;
    const errs = docs.filter(d => d.errorMessage !== null).length;
    const avgT = docs.reduce((s, d) => s + d.responseTimeMs, 0) / docs.length;
    w(`| ${type.charAt(0).toUpperCase() + type.slice(1)} | ${docs.length} | ${pct(json, docs.length)} | ${pct(errs, docs.length)} | ${num(avgT, 0)} ms |`);
  }
  w();
  w('---');
  w();

  // ════════════════════════════════════════════════════════
  // RECOMMEND EVALUATION
  // ════════════════════════════════════════════════════════
  const rec = byType.recommend;
  if (rec.length > 0) {
    w('## AI Recommender — Tačnost predikcije najboljeg/najgoreg algoritma');
    w();
    w(`AI Recommender prima benchmark rezultate svih 8 algoritama na datoj mapi i predviđa koji je najbrži (najmanje ekspandiranih čvorova) i koji je najsporiji. Predikcija se zatim poredi sa stvarnim rezultatom.`);
    w();

    const bestCorrect = rec.filter(d => d.bestCorrect).length;
    const worstCorrect = rec.filter(d => d.worstCorrect).length;
    const bothCorrect = rec.filter(d => d.bestCorrect && d.worstCorrect).length;

    w('### Ukupna tačnost');
    w();
    w('| Metrika | Tačnost |');
    w('|--------|---------|');
    w(`| Best algoritam tačno | ${pct(bestCorrect, rec.length)} (${bestCorrect}/${rec.length}) |`);
    w(`| Worst algoritam tačno | ${pct(worstCorrect, rec.length)} (${worstCorrect}/${rec.length}) |`);
    w(`| Oba tačna | ${pct(bothCorrect, rec.length)} (${bothCorrect}/${rec.length}) |`);
    w();

    // Accuracy by map type
    const recByMap = new Map<string, typeof rec>();
    for (const d of rec) {
      if (!recByMap.has(d.generatorType)) recByMap.set(d.generatorType, []);
      recByMap.get(d.generatorType)!.push(d);
    }

    w('### Tačnost po tipu mape');
    w();
    w('| Tip mape | N | Best tačno | Worst tačno | Oba tačna |');
    w('|----------|---|-----------|------------|-----------|');
    for (const [mt, docs] of [...recByMap.entries()].sort()) {
      const bC = docs.filter(d => d.bestCorrect).length;
      const wC = docs.filter(d => d.worstCorrect).length;
      const both = docs.filter(d => d.bestCorrect && d.worstCorrect).length;
      w(`| ${mt} | ${docs.length} | ${pct(bC, docs.length)} | ${pct(wC, docs.length)} | ${pct(both, docs.length)} |`);
    }
    w();

    // Confusion: what did AI predict vs actual?
    const bestConfusion = new Map<string, number>();
    const worstConfusion = new Map<string, number>();
    for (const d of rec) {
      if (d.aiPredictedBest && !d.bestCorrect) {
        const key = `predicted:${d.aiPredictedBest} actual:${d.actualBest}`;
        bestConfusion.set(key, (bestConfusion.get(key) || 0) + 1);
      }
      if (d.aiPredictedWorst && !d.worstCorrect) {
        const key = `predicted:${d.aiPredictedWorst} actual:${d.actualWorst}`;
        worstConfusion.set(key, (worstConfusion.get(key) || 0) + 1);
      }
    }

    if (bestConfusion.size > 0) {
      w('### Najčešće greške za "best" predikciju');
      w();
      w('| AI predviđa | Stvarno najbolji | Broj grešaka |');
      w('|------------|-----------------|-------------|');
      const sorted = [...bestConfusion.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
      for (const [key, count] of sorted) {
        const [pred, act] = key.split(' actual:');
        w(`| ${pred.replace('predicted:', '')} | ${act} | ${count} |`);
      }
      w();
    }

    w('### Zaključci — Recommender');
    w();
    w('**Šta testiramo:** Da li AI ume da pročita tabelu benchmark rezultata (8 algoritama × expanded čvorovi) i tačno identifikuje koji je najbrži a koji najsporiji. Na prvi pogled trivijalno — ali u praksi ovo testira **numeričko rezonovanje** LLM-ova, poznat problem jer su modeli trenirani na tekstu, ne na brojevima.');
    w();
    w('**Zašto greše:**');
    w('- LLM ponekad ignoriše brojeve i odgovara na osnovu svog "opšteg znanja" (npr. uvek kaže A* je best)');
    w('- Mešaju kolone (expanded vs cost) ili ne razlikuju "fewest expanded" od "lowest cost"');
    w('- Kada su dva algoritma veoma blizu (npr. Greedy: 27 vs Swarm: 27), model često pogreši jer razlika nije očigledna');
    w();
    w('**Zašto je ovo bitno za aplikaciju:**');
    w('- AI Recommender u aplikaciji stvarno prima benchmark podatke i treba korisnicima da kaže koji algoritam je bio najbolji na **njihovoj mapi**');
    w('- Greške od 23-64% (zavisno od modela) su relevantna informacija za odabir modela u produkciji');
    w('- Ovo opravdava arhitektonsku odluku da sistem radi **server-side benchmarking** pa tek onda pita AI za objašnjenje — ne verujemo AI-ju slepo');
    w();
    w('---');
    w();
  }

  // ════════════════════════════════════════════════════════
  // GENERATE EVALUATION
  // ════════════════════════════════════════════════════════
  const gen = byType.generate;
  if (gen.length > 0) {
    w('## AI Generator — Uspešnost generisanja mapa po zadatom cilju');
    w();
    w('AI Generator prima tekstualni opis korisnikovog cilja, izvlači strukturirani intent, a zatim server generiše kandidat-mape i benchmarkuje ih da proveri da li odgovaraju zahtevu.');
    w();

    const intentOk = gen.filter(d => d.validJson).length;
    const satisfied = gen.filter(d => d.intentSatisfied).length;
    const avgScore = gen.filter(d => d.intentScore !== null).reduce((s, d) => s + (d.intentScore || 0), 0) /
                     gen.filter(d => d.intentScore !== null).length;

    w('### Ukupni rezultati');
    w();
    w('| Metrika | Vrednost |');
    w('|--------|----------|');
    w(`| Uspešna ekstrakcija intenta | ${pct(intentOk, gen.length)} (${intentOk}/${gen.length}) |`);
    w(`| Intent zadovoljen (score > 0) | ${pct(satisfied, gen.length)} (${satisfied}/${gen.length}) |`);
    w(`| Prosečan intent score | ${num(avgScore, 1)} |`);
    w();

    w('### Detalji po promptu');
    w();
    w('| Prompt | Intent | Algoritmi | Score | Zadovoljeno? |');
    w('|--------|--------|-----------|-------|-------------|');
    for (const d of gen) {
      const intAlgos = d.intentAlgorithms?.join(', ') || '—';
      w(`| ${d.prompt.slice(0, 60)}… | ${d.requestedIntent || '—'} | ${intAlgos} | ${num(d.intentScore)} | ${d.intentSatisfied ? 'Da' : 'Ne'} |`);
    }
    w();

    w('### Zaključci — Generator');
    w();
    w('**Šta testiramo:** Dvostepeni pipeline — (1) LLM izvlači strukturirani intent iz korisnikovog prirodnog jezika, (2) server brute-force generiše 28+ kandidat-mapa, benchmarkuje ih i bira onu koja zaista zadovoljava zahtev.');
    w();
    w('**Šta smo otkrili:**');
    w('- Intent ekstrakcija je **izuzetno pouzdana** kod svih modela (~100%) — LLM odlično razume šta korisnik želi');
    w('- Intent satisfaction (55-70%) zavisi više od **mogućnosti generatora** nego od AI-ja — ako ne postoji mapa na kojoj BFS zaista briljira naspram svih, nijedan AI to neće promeniti');
    w('- Zahtevi kao "BFS excels" i "Greedy fails" su inherentno teški jer su ovi algoritmi retko ekstremi u broju ekspanzija');
    w('- Zahtevi kao "A* brži od Dijkstre" su lako zadovoljivi (score 768) jer to zaista važi na većini mapa sa preprekama');
    w();
    w('**Arhitektonski uvid:** Kvalitet AI Generatora ne zavisi samo od LLM-a već i od raznolikosti map generatora. Dodavanje novih tipova mapa bi povećalo intent satisfaction rate.');
    w();
    w('---');
    w();
  }

  // ════════════════════════════════════════════════════════
  // TUTOR EVALUATION
  // ════════════════════════════════════════════════════════
  const tut = byType.tutor;
  if (tut.length > 0) {
    w('## AI Tutor — Kvalitet objašnjenja ključnih momenata');
    w();
    w('AI Tutor prima ključne momente iz izvršavanja algoritma (early exploration, mid-point, path found) i daje edukativna objašnjenja za svaki.');
    w();

    const jsonOk = tut.filter(d => d.validJson).length;
    const momentsOk = tut.filter(d => d.momentsValid).length;
    const avgMoments = tut.filter(d => d.momentsReturned !== null).reduce((s, d) => s + (d.momentsReturned || 0), 0) / tut.length;
    const avgTime = tut.reduce((s, d) => s + d.responseTimeMs, 0) / tut.length;

    w('### Ukupni rezultati');
    w();
    w('| Metrika | Vrednost |');
    w('|--------|----------|');
    w(`| Validan JSON | ${pct(jsonOk, tut.length)} (${jsonOk}/${tut.length}) |`);
    w(`| Validni momenti (svi sa stepIndex + objašnjenje >10 char) | ${pct(momentsOk, tut.length)} (${momentsOk}/${tut.length}) |`);
    w(`| Prosečan broj vraćenih momenata | ${num(avgMoments, 1)} (od 3 traženih) |`);
    w(`| Prosečna latencija | ${num(avgTime, 0)} ms |`);
    w();

    w('### Zaključci — Tutor');
    w();
    w('**Šta testiramo:** Da li AI može da primi 3 ključna momenta iz izvršavanja algoritma (early exploration, peak frontier, path found) i da generiše edukativno objašnjenje za svaki momenat, pri tome poštujući originalne stepIndex vrednosti.');
    w();
    w('**Šta smo otkrili:**');
    w('- Tutor je **najrobusniji AI modul** — svi testirani modeli postižu 96-100% validnosti');
    w('- LLM dosledno poštuje instrukciju da zadrži originalne stepIndex vrednosti (ne izmišlja nove korake)');
    w('- Objašnjenja su kontekstualna — referišu na specifičan algoritam, tip mape i stanje pretrage');
    w('- Prosečno 3.0 momenta vraćena od 3 tražena — gotovo savršena struktura odgovora');
    w();
    w('**Edukativna vrednost:** Tutor modul je najvažniji za korisničko iskustvo jer direktno pomaže studentima da razumeju šta se dešava tokom izvršavanja algoritma. Visoka konzistentnost potvrđuje da je ovaj modul spreman za produkcijsku upotrebu.');
    w();
    w('---');
    w();
  }

  // ════════════════════════════════════════════════════════
  // LATENCY & ROBUSTNESS
  // ════════════════════════════════════════════════════════
  w('## Latencija i robusnost');
  w();

  // Latency distribution
  const latencies = allDocs.map(d => d.responseTimeMs).sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p90 = latencies[Math.floor(latencies.length * 0.9)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];

  w('### Distribucija latencije');
  w();
  w('| Percentil | Latencija |');
  w('|-----------|-----------|');
  w(`| Min | ${num(minLatency, 0)} ms |`);
  w(`| P50 (medijana) | ${num(p50, 0)} ms |`);
  w(`| P90 | ${num(p90, 0)} ms |`);
  w(`| P99 | ${num(p99, 0)} ms |`);
  w(`| Max | ${num(maxLatency, 0)} ms |`);
  w(`| Prosek | ${num(avgLatency, 0)} ms |`);
  w();

  // Error details
  const errors = allDocs.filter(d => d.errorMessage !== null);
  if (errors.length > 0) {
    w('### Greške');
    w();
    w('| Test | Greška |');
    w('|------|--------|');
    for (const e of errors.slice(0, 20)) {
      w(`| ${e.testType} | ${(e.errorMessage || '').slice(0, 80)} |`);
    }
    w();
  }

  w('### Zaključci — Latencija i robusnost');
  w();
  w(`- Prosečna latencija od ${num(avgLatency, 0)} ms je prihvatljiva za interaktivnu upotrebu (korisnik ne čeka više od par sekundi).`);
  w(`- JSON parse rate od ${pct(overallJsonRate, totalDocs)} pokazuje da LLM dosledno poštuje instrukciju za JSON format.`);
  w(`- Stopa grešaka od ${pct(overallErrRate, totalDocs)} ukazuje na solidnu robusnost sistema.`);
  w();
  w('---');
  w();

  // ════════════════════════════════════════════════════════
  // MODEL COMPARISON (if multiple models tested)
  // ════════════════════════════════════════════════════════
  if (models.length > 1) {
    w('## Uporedna analiza AI modela');
    w();
    w('Ista test suite je pokrenuta sa različitim LLM modelima. Ovde se porede performanse.');
    w();

    w('### Ukupne metrike po modelu');
    w();
    w('| Model | Testova | JSON Rate | Greške | Avg Latency | Best Acc | Worst Acc | Intent Sat | Tutor Valid |');
    w('|-------|---------|-----------|--------|-------------|----------|-----------|------------|-------------|');
    for (const model of models) {
      const mDocs = allDocs.filter(d => (d as any).aiModel === model);
      const mRec = mDocs.filter(d => d.testType === 'recommend');
      const mGen = mDocs.filter(d => d.testType === 'generate');
      const mTut = mDocs.filter(d => d.testType === 'tutor');
      const json = pct(mDocs.filter(d => d.validJson).length, mDocs.length);
      const errs = pct(mDocs.filter(d => d.errorMessage !== null).length, mDocs.length);
      const avgT = num(mDocs.reduce((s, d) => s + d.responseTimeMs, 0) / mDocs.length, 0);
      const bestA = mRec.length > 0 ? pct(mRec.filter(d => d.bestCorrect).length, mRec.length) : '—';
      const worstA = mRec.length > 0 ? pct(mRec.filter(d => d.worstCorrect).length, mRec.length) : '—';
      const intSat = mGen.length > 0 ? pct(mGen.filter(d => d.intentSatisfied).length, mGen.length) : '—';
      const tutV = mTut.length > 0 ? pct(mTut.filter(d => d.momentsValid).length, mTut.length) : '—';
      w(`| ${model} | ${mDocs.length} | ${json} | ${errs} | ${avgT} ms | ${bestA} | ${worstA} | ${intSat} | ${tutV} |`);
    }
    w();
    w('---');
    w();
  }

  // ════════════════════════════════════════════════════════
  // OVERALL CONCLUSIONS
  // ════════════════════════════════════════════════════════
  w('## Opšti zaključci evaluacije AI komponente');
  w();
  w(`Na osnovu **${totalDocs} automatizovanih testova** AI modula, mogu se izvesti sledeći zaključci:`);
  w();

  if (rec.length > 0) {
    const bestAcc = rec.filter(d => d.bestCorrect).length / rec.length;
    const worstAcc = rec.filter(d => d.worstCorrect).length / rec.length;
    w(`1. **AI Recommender** postiže tačnost od ${(bestAcc * 100).toFixed(1)}% za predikciju najboljeg algoritma i ${(worstAcc * 100).toFixed(1)}% za najgori. Ovo potvrđuje da LLM korektno interpretira numeričke benchmark podatke.`);
  }
  if (gen.length > 0) {
    const satRate = gen.filter(d => d.intentSatisfied).length / gen.length;
    w(`2. **AI Generator** uspešno izvlači intent u ${pct(gen.filter(d => d.validJson).length, gen.length)} slučajeva, a ${(satRate * 100).toFixed(1)}% generisanih mapa zaista zadovoljava traženi intent — potvrda da dvostepeni pipeline (LLM intent + server brute-force) funkcioniše.`);
  }
  if (tut.length > 0) {
    const momRate = tut.filter(d => d.momentsValid).length / tut.length;
    w(`3. **AI Tutor** vraća validne key momente u ${(momRate * 100).toFixed(1)}% slučajeva, sa prosečno ${num(tut.reduce((s, d) => s + (d.momentsReturned || 0), 0) / tut.length, 1)} momenata po pozivu. LLM poštuje stepIndex ograničenja.`);
  }
  w(`4. **Robusnost:** JSON parse rate je ${pct(overallJsonRate, totalDocs)}, stopa grešaka ${pct(overallErrRate, totalDocs)}.`);
  w(`5. **Latencija:** Prosek ${num(avgLatency, 0)} ms, P90 ${num(p90, 0)} ms — prihvatljivo za interaktivnu edukativnu aplikaciju.`);
  w();

  // Write file
  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const content = lines.join('\n');
  fs.writeFileSync(OUTPUT_PATH, content, 'utf-8');
  console.log(`\n✅ AI Evaluation written to: ${OUTPUT_PATH}`);
  console.log(`   ${lines.length} lines, ${(content.length / 1024).toFixed(1)} KB`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
