/**
 * run-benchmark.ts — Standalone CLI benchmark runner.
 *
 * Usage:
 *   npx ts-node src/run-benchmark.ts                    # run ALL categories
 *   npx ts-node src/run-benchmark.ts E1 E6              # run specific categories
 *   npx ts-node src/run-benchmark.ts --dry-run           # preview without DB write
 *   npx ts-node src/run-benchmark.ts --export-only BATCH # re-export existing batch
 *
 * Results are saved to:
 *   - MongoDB (BenchmarkResult collection) — persistent, growing dataset
 *   - ../../Metrike/benchmark-<batchId>.csv              — CSV export
 *   - ../../Metrike/benchmark-<batchId>.json             — JSON export
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

import { BenchmarkResult } from './models/BenchmarkResult';
import {
  buildAllScenarios,
  buildScenario,
  runScenario,
  toCSV,
  toJSON,
  SingleBenchmarkResult,
  BenchmarkScenario,
} from './services/benchmark-runner';

// ────────────────────────────────────────────────────────────
// CONFIG
// ────────────────────────────────────────────────────────────

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pathfinder';
const METRIKE_DIR = path.resolve(__dirname, '..', '..', '..', 'Metrike', 'Algoritmi');

const VALID_CATEGORIES = ['E1', 'E6', 'E7', 'E8', 'E9', 'E10'];

// ────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────

function generateBatchId(): string {
  const now = new Date();
  const ts = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 8);
  return `bench-${ts}-${rand}`;
}

function printUsage() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           PATHFINDER BENCHMARK RUNNER                       ║
╚══════════════════════════════════════════════════════════════╝

Usage:
  npx ts-node src/run-benchmark.ts [categories...] [flags]

Categories: ${VALID_CATEGORIES.join(', ')} (default: all)

  E1  — Core: 7 map types × densities × seeds × 8 algos
  E6  — Scalability: grid sizes 10×20 → 100×200
  E7  — Heuristic comparison: 4 heuristics × algos
  E8  — 4-connected vs 8-connected neighbors
  E9  — Swarm weight sweep: w = 1.0 → 10.0
  E10 — Unsolvable maps (sealed start)

Flags:
  --dry-run           Preview scenario sizes, don't run
  --scale N           Multiply seed count by N (default: 1)
  --export-only ID    Re-export an existing batch to CSV/JSON

Examples:
  npx ts-node src/run-benchmark.ts                # all categories
  npx ts-node src/run-benchmark.ts E1 E6          # specific
  npx ts-node src/run-benchmark.ts --scale 10     # 10× more seeds
  npx ts-node src/run-benchmark.ts --dry-run      # preview
`);
}

function printSummaryTable(results: SingleBenchmarkResult[]) {
  // Group by category → algorithm → avg stats
  const groups = new Map<string, Map<string, { exp: number[]; cost: number[]; time: number[]; found: number }>>();

  for (const r of results) {
    if (!groups.has(r.evaluationCategory)) groups.set(r.evaluationCategory, new Map());
    const cat = groups.get(r.evaluationCategory)!;
    if (!cat.has(r.algo.algorithm)) cat.set(r.algo.algorithm, { exp: [], cost: [], time: [], found: 0 });
    const entry = cat.get(r.algo.algorithm)!;
    entry.exp.push(r.result.expandedNodes);
    if (r.result.pathCost !== null) entry.cost.push(r.result.pathCost);
    entry.time.push(r.result.executionTimeMs);
    if (r.result.foundPath) entry.found++;
  }

  for (const [cat, algos] of groups) {
    console.log(`\n┌─── ${cat} ${'─'.repeat(55 - cat.length)}┐`);
    console.log(`│ ${'Algorithm'.padEnd(18)} ${'Runs'.padStart(5)} ${'AvgExp'.padStart(8)} ${'AvgCost'.padStart(8)} ${'AvgMs'.padStart(8)} ${'Found%'.padStart(7)} │`);
    console.log(`│${'─'.repeat(60)}│`);

    for (const [algo, s] of algos) {
      const n = s.exp.length;
      const avgExp = Math.round(s.exp.reduce((a, b) => a + b, 0) / n);
      const avgCost = s.cost.length > 0
        ? (s.cost.reduce((a, b) => a + b, 0) / s.cost.length).toFixed(1)
        : 'N/A';
      const avgTime = (s.time.reduce((a, b) => a + b, 0) / n).toFixed(2);
      const foundPct = ((s.found / n) * 100).toFixed(0);

      console.log(
        `│ ${algo.padEnd(18)} ${String(n).padStart(5)} ${String(avgExp).padStart(8)} ${String(avgCost).padStart(8)} ${avgTime.padStart(8)} ${(foundPct + '%').padStart(7)} │`
      );
    }
    console.log(`└${'─'.repeat(60)}┘`);
  }
}

// ────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  // Parse --scale N
  const scaleIdx = args.indexOf('--scale');
  const scale = scaleIdx !== -1 ? Math.max(1, parseInt(args[scaleIdx + 1], 10) || 1) : 1;

  // --help
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  // --dry-run: preview scenario sizes
  if (args.includes('--dry-run')) {
    console.log(`\n📋 DRY RUN — Scenario preview (scale=${scale}):\n`);
    const categories = args.filter(a => VALID_CATEGORIES.includes(a));
    const scenarios = categories.length > 0
      ? categories.map(c => buildScenario(c, scale)).filter(Boolean) as BenchmarkScenario[]
      : buildAllScenarios(scale);

    let total = 0;
    for (const s of scenarios) {
      const count = s.maps.length * s.algoConfigs.length;
      total += count;
      console.log(`  ${s.evaluationCategory}: ${s.maps.length} maps × ${s.algoConfigs.length} algo configs = ${count} simulations`);
    }
    console.log(`\n  TOTAL: ${total} simulations\n`);
    process.exit(0);
  }

  // --export-only BATCH_ID
  const exportIdx = args.indexOf('--export-only');
  if (exportIdx !== -1) {
    const batchId = args[exportIdx + 1];
    if (!batchId) {
      console.error('ERROR: --export-only requires a batch ID');
      process.exit(1);
    }
    await mongoose.connect(MONGODB_URI);
    console.log(`Connected to MongoDB: ${MONGODB_URI}`);

    const docs = await BenchmarkResult.find({ batchId }).lean();
    if (docs.length === 0) {
      console.error(`No results found for batch "${batchId}"`);
      process.exit(1);
    }

    const mapped = docsToResults(docs);
    await exportFiles(batchId, mapped);

    await mongoose.disconnect();
    process.exit(0);
  }

  // Normal run
  const categories = args.filter(a => VALID_CATEGORIES.includes(a));
  const scenarios = categories.length > 0
    ? categories.map(c => buildScenario(c, scale)).filter(Boolean) as BenchmarkScenario[]
    : buildAllScenarios(scale);

  if (scenarios.length === 0) {
    console.error('No valid scenarios to run.');
    printUsage();
    process.exit(1);
  }

  // Connect to DB
  await mongoose.connect(MONGODB_URI);
  console.log(`Connected to MongoDB: ${MONGODB_URI}`);

  const batchId = generateBatchId();
  console.log(`\n🚀 Batch ID: ${batchId}`);
  console.log(`   Categories: ${scenarios.map(s => s.evaluationCategory).join(', ')}`);

  let totalSims = 0;
  for (const s of scenarios) totalSims += s.maps.length * s.algoConfigs.length;
  console.log(`   Total simulations: ${totalSims}\n`);

  const allResults: SingleBenchmarkResult[] = [];
  const t0 = Date.now();

  for (const scenario of scenarios) {
    const st = Date.now();
    const expected = scenario.maps.length * scenario.algoConfigs.length;
    console.log(`▶ ${scenario.evaluationCategory} — ${expected} simulations…`);

    const results = runScenario(scenario, (p) => {
      if (p.completed % 200 === 0 || p.completed === p.total) {
        const pct = ((p.completed / p.total) * 100).toFixed(0);
        process.stdout.write(`  ${p.category}: ${pct}% (${p.completed}/${p.total})\r`);
      }
    });

    console.log(`  ${scenario.evaluationCategory}: 100% — ${results.length} results in ${Date.now() - st}ms`);

    // Bulk insert into MongoDB
    const docs = results.map(r => ({
      batchId,
      evaluationCategory: r.evaluationCategory,
      generatorType: r.map.generatorType,
      generatorSeed: r.map.seed,
      mapRows: r.map.rows,
      mapCols: r.map.cols,
      density: r.map.density,
      wallCount: r.mapMeta.wallCount,
      weightedCount: r.mapMeta.weightedCount,
      algorithm: r.algo.algorithm,
      heuristic: r.algo.heuristic,
      neighborMode: r.algo.neighborMode,
      swarmWeight: r.algo.swarmWeight ?? null,
      expandedNodes: r.result.expandedNodes,
      pathCost: r.result.pathCost,
      pathLength: r.result.pathLength,
      foundPath: r.result.foundPath,
      executionTimeMs: parseFloat(r.result.executionTimeMs.toFixed(3)),
    }));

    await BenchmarkResult.insertMany(docs, { ordered: false });
    console.log(`  ✓ Saved ${docs.length} records to MongoDB`);

    allResults.push(...results);
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n✅ All done — ${allResults.length} simulations in ${elapsed}s`);

  // Export files
  await exportFiles(batchId, allResults);

  // Print summary table
  printSummaryTable(allResults);

  // DB stats
  const totalInDB = await BenchmarkResult.countDocuments();
  const batchCount = (await BenchmarkResult.distinct('batchId')).length;
  console.log(`\n📊 DB total: ${totalInDB} results across ${batchCount} batch(es)`);

  await mongoose.disconnect();
  process.exit(0);
}

// ────────────────────────────────────────────────────────────
// EXPORT HELPERS
// ────────────────────────────────────────────────────────────

function docsToResults(docs: any[]): SingleBenchmarkResult[] {
  return docs.map(d => ({
    evaluationCategory: d.evaluationCategory,
    map: {
      generatorType: d.generatorType,
      rows: d.mapRows,
      cols: d.mapCols,
      density: d.density,
      seed: d.generatorSeed,
    },
    mapMeta: {
      wallCount: d.wallCount,
      weightedCount: d.weightedCount,
    },
    algo: {
      algorithm: d.algorithm,
      heuristic: d.heuristic,
      neighborMode: d.neighborMode,
      swarmWeight: d.swarmWeight,
    },
    result: {
      expandedNodes: d.expandedNodes,
      pathCost: d.pathCost,
      pathLength: d.pathLength,
      foundPath: d.foundPath,
      executionTimeMs: d.executionTimeMs,
    },
  }));
}

async function exportFiles(batchId: string, results: SingleBenchmarkResult[]) {
  if (!fs.existsSync(METRIKE_DIR)) {
    fs.mkdirSync(METRIKE_DIR, { recursive: true });
  }

  const csvPath = path.join(METRIKE_DIR, `benchmark-${batchId}.csv`);
  const jsonPath = path.join(METRIKE_DIR, `benchmark-${batchId}.json`);

  fs.writeFileSync(csvPath, toCSV(results), 'utf-8');
  fs.writeFileSync(jsonPath, JSON.stringify(toJSON(results), null, 2), 'utf-8');

  console.log(`\n📁 Exported files:`);
  console.log(`   CSV:  ${csvPath}`);
  console.log(`   JSON: ${jsonPath}`);
}

// ────────────────────────────────────────────────────────────
// RUN
// ────────────────────────────────────────────────────────────
main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
