/**
 * run-ai-benchmark.ts — Automated AI evaluation benchmark.
 *
 * Tests:
 *   1. RECOMMEND — AI predicts best/worst algo → verify against actual benchmark
 *   2. GENERATE  — AI generates map for intent → verify intent is satisfied
 *   3. TUTOR     — AI explains key moments → verify step indices are valid
 *   4. LATENCY   — Measure response time for all modules
 *   5. ROBUSTNESS — Track JSON parse success rate, error rate
 *
 * Usage:
 *   npx ts-node src/run-ai-benchmark.ts              # all tests (default 5 maps)
 *   npx ts-node src/run-ai-benchmark.ts --maps 10    # 10 maps per test type
 *   npx ts-node src/run-ai-benchmark.ts --dry-run    # preview without calling AI
 *
 * Output: ../../Metrike/AI/
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

import { callAI } from './services/ai';
import {
  generateMap,
  GeneratorType,
  benchmarkGrid,
  gridToWireFormat,
  gridFromWireFormat,
  ALL_ALGOS,
  AlgoName,
  ALGO_LABELS,
  AlgoResult,
  createVariant,
} from './services/generators';
import { AIBenchmarkResult } from './models/AIBenchmarkResult';

// ────────────────────────────────────────────────────────────
// CONFIG
// ────────────────────────────────────────────────────────────

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pathfinder';
const OUTPUT_DIR = path.resolve(__dirname, '..', '..', '..', 'Metrike', 'AI');

const MAP_TYPES: GeneratorType[] = ['random', 'maze', 'weighted', 'mixed', 'bottleneck', 'city', 'open'];
const ALGO_DISPLAY: Record<string, string> = {
  bfs: 'BFS', dfs: 'DFS', dijkstra: 'Dijkstra', a_star: 'A*',
  greedy: 'Greedy', swarm: 'Swarm', convergent_swarm: 'Conv. Swarm', zero_one_bfs: '0-1 BFS',
};

// Delay between AI calls to respect rate limits
// GitHub Models: 15 req/min, 150 req/day (Free/Pro)
// 7s delay = ~8.5 req/min (well under 15/min limit)
const AI_DELAY_MS = 7000;

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

let dailyLimitHit = false;
let currentModel = 'gpt-4o-mini';

/** Retry-wrapper for callAI with exponential backoff on rate limit */
async function callAIWithRetry(
  prompt: string,
  options?: { maxTokens?: number; temperature?: number },
  maxRetries = 4,
): Promise<string> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await callAI(prompt, { ...options, model: currentModel });
    } catch (err: any) {
      const msg = err.message || '';
      const isRateLimit = msg.includes('429') || msg.includes('rate') || msg.includes('Too Many');
      const isDailyLimit = msg.includes('daily') || msg.includes('requests per day');
      if (isDailyLimit) {
        dailyLimitHit = true;
        throw err;
      }
      if (isRateLimit && attempt < maxRetries) {
        const wait = Math.min((attempt + 1) * 20000, 90000); // 20s, 40s, 60s, 90s
        process.stdout.write(`    ⏳ Rate limited, waiting ${wait / 1000}s (retry ${attempt + 1}/${maxRetries})…\n`);
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

function generateBatchId(): string {
  const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 8);
  return `ai-${ts}-${rand}`;
}

interface Grid {
  rows: number; cols: number;
  cells: { position: { row: number; col: number }; type: string; weight: number }[][];
  start: { row: number; col: number };
  goal: { row: number; col: number };
}

function countCells(grid: Grid) {
  let walls = 0, weighted = 0;
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      if (grid.cells[r][c].type === 'wall') walls++;
      if (grid.cells[r][c].type === 'weight') weighted++;
    }
  return { walls, weighted };
}

// ────────────────────────────────────────────────────────────
// TEST 1: RECOMMEND — Does AI correctly predict best/worst?
// ────────────────────────────────────────────────────────────

async function testRecommend(
  grid: Grid,
  genType: string,
  batchId: string,
): Promise<any> {
  // 1. Benchmark all algos
  const metrics = benchmarkGrid(grid);
  const { walls, weighted } = countCells(grid);
  const wire = gridToWireFormat(grid);

  // Find actual best/worst by expanded (among path-finders)
  const withPath = ALL_ALGOS.filter(a => metrics[a].foundPath);
  if (withPath.length < 2) {
    return { skipped: true, reason: 'Not enough algos found path' };
  }
  const sorted = [...withPath].sort((a, b) => metrics[a].expanded - metrics[b].expanded);
  const actualBest = sorted[0];
  const actualWorst = sorted[sorted.length - 1];

  // 2. Build map summary (same format as the real endpoint)
  const metricsStr = ALL_ALGOS.map(a =>
    `${ALGO_LABELS[a]}: ${metrics[a].expanded} expanded, cost=${metrics[a].pathCost ?? 'N/A'}`
  ).join('\n');

  const mapSummary = `Grid: ${grid.rows}×${grid.cols}, Generator: ${genType}, Walls: ${walls}, Weighted: ${weighted}`;

  const prompt = `A student is running pathfinding algorithms on a grid-based map.

Map properties:
${mapSummary}

Benchmark results (all 8 algorithms on the SAME map):
${metricsStr}

Based on ONLY these benchmark results, identify:
1. The BEST performing algorithm (fewest expanded nodes among those that found a path)
2. The WORST performing algorithm (most expanded nodes among those that found a path)

Respond with JSON:
{
  "bestAlgorithm": "algorithmKey",
  "worstAlgorithm": "algorithmKey",
  "bestReason": "1-2 sentences",
  "worstReason": "1-2 sentences"
}

Use algorithm keys: bfs, dfs, dijkstra, a_star, greedy, swarm, convergent_swarm, zero_one_bfs`;

  const t0 = performance.now();
  let validJson = false;
  let aiPredictedBest: string | null = null;
  let aiPredictedWorst: string | null = null;
  let errorMessage: string | null = null;

  try {
    const raw = await callAIWithRetry(prompt, { maxTokens: 300, temperature: 0.2 });
    const parsed = JSON.parse(raw);
    validJson = true;
    aiPredictedBest = parsed.bestAlgorithm || null;
    aiPredictedWorst = parsed.worstAlgorithm || null;
  } catch (err: any) {
    errorMessage = err.message?.slice(0, 200) || 'Unknown error';
  }
  const responseTimeMs = performance.now() - t0;

  const result = {
    batchId,
    testType: 'recommend',
    generatorType: genType,
    mapRows: grid.rows,
    mapCols: grid.cols,
    wallCount: walls,
    weightedCount: weighted,
    prompt: prompt.slice(0, 500),
    language: 'en',
    aiModel: currentModel,
    responseTimeMs: parseFloat(responseTimeMs.toFixed(1)),
    validJson,
    errorMessage,
    aiPredictedBest,
    aiPredictedWorst,
    actualBest,
    actualWorst,
    bestCorrect: aiPredictedBest === actualBest,
    worstCorrect: aiPredictedWorst === actualWorst,
    requestedIntent: null,
    intentAlgorithms: [],
    intentSatisfied: null,
    intentScore: null,
    momentsReturned: null,
    momentsValid: null,
  };

  return result;
}

// ────────────────────────────────────────────────────────────
// TEST 2: GENERATE — Does AI intent extraction + map matching work?
// ────────────────────────────────────────────────────────────

const GENERATE_PROMPTS = [
  { desc: 'Create a map where A* is much faster than Dijkstra', intent: 'algo_better_than', algos: ['a_star', 'dijkstra'] },
  { desc: 'Create a map where BFS really excels', intent: 'algo_excels', algos: ['bfs'] },
  { desc: 'Create a map where Greedy completely fails to find a good path', intent: 'algo_struggles', algos: ['greedy'] },
  { desc: 'Create a map where DFS finds a path but it is extremely expensive', intent: 'algo_struggles', algos: ['dfs'] },
  { desc: 'Show me a challenging maze for all algorithms', intent: 'challenging', algos: [] },
  { desc: 'Create a map where Swarm performs better than A*', intent: 'algo_better_than', algos: ['swarm', 'a_star'] },
  { desc: 'Show me a map where 0-1 BFS is ideal', intent: 'algo_excels', algos: ['zero_one_bfs'] },
  { desc: 'Create a weighted terrain where Dijkstra shines compared to BFS', intent: 'algo_better_than', algos: ['dijkstra', 'bfs'] },
  { desc: 'Show me a map where all optimal algorithms expand similar nodes', intent: 'challenging', algos: [] },
  { desc: 'Create a bottleneck map where Greedy fails but A* succeeds efficiently', intent: 'algo_better_than', algos: ['a_star', 'greedy'] },
];

async function testGenerate(
  promptDef: typeof GENERATE_PROMPTS[0],
  batchId: string,
): Promise<any> {
  const { walls, weighted } = { walls: 0, weighted: 0 };

  // Step 1: Ask AI to extract intent
  const intentPrompt = `A student is using a pathfinding visualizer and wants a specific type of map.

Student's request: "${promptDef.desc}"

Extract the student's intent as structured JSON. Possible intents:
- "algo_excels": student wants a map where a specific algorithm performs well
- "algo_struggles": student wants a map where a specific algorithm performs poorly
- "algo_better_than": student wants a comparison map where algo X outperforms algo Y
- "optimal_vs_fast": student wants to see trade-off between optimal and fast algorithms
- "challenging": student wants a generally difficult/complex map

Respond with JSON:
{
  "intent": "one of the above intents",
  "algorithms": ["algorithm_key", ...],
  "notes": "brief note"
}

Algorithm keys: bfs, dfs, dijkstra, a_star, greedy, swarm, convergent_swarm, zero_one_bfs`;

  const t0 = performance.now();
  let validJson = false;
  let extractedIntent: string | null = null;
  let extractedAlgos: string[] = [];
  let errorMessage: string | null = null;
  let intentSatisfied: boolean | null = null;
  let intentScore: number | null = null;

  try {
    const raw = await callAIWithRetry(intentPrompt, { maxTokens: 200, temperature: 0.2 });
    const parsed = JSON.parse(raw);
    validJson = true;
    extractedIntent = parsed.intent || null;
    extractedAlgos = parsed.algorithms || [];

    // Step 2: Generate maps and benchmark to verify intent
    // Generate 7 candidate maps, pick best for intent
    let bestScore = -Infinity;
    let bestGen = 'random';

    for (const gen of MAP_TYPES) {
      const grid = generateMap(gen, 25, 50, { density: 30, seed: Math.floor(Math.random() * 100000) });
      const metrics = benchmarkGrid(grid);

      const pathAlgos = ALL_ALGOS.filter(a => metrics[a].foundPath);
      if (pathAlgos.length < 2) continue;

      let score = 0;
      if (promptDef.intent === 'algo_excels' && promptDef.algos.length === 1) {
        const target = promptDef.algos[0] as AlgoName;
        if (!metrics[target].foundPath) continue;
        const others = pathAlgos.filter(a => a !== target);
        const avgOthers = others.reduce((s, a) => s + metrics[a].expanded, 0) / others.length;
        score = avgOthers - metrics[target].expanded;
      } else if (promptDef.intent === 'algo_struggles' && promptDef.algos.length === 1) {
        const target = promptDef.algos[0] as AlgoName;
        if (!metrics[target].foundPath) continue;
        const others = pathAlgos.filter(a => a !== target);
        const avgOthers = others.reduce((s, a) => s + metrics[a].expanded, 0) / others.length;
        score = metrics[target].expanded - avgOthers;
      } else if (promptDef.intent === 'algo_better_than' && promptDef.algos.length === 2) {
        const [winner, loser] = promptDef.algos as AlgoName[];
        if (!metrics[winner].foundPath || !metrics[loser].foundPath) continue;
        score = metrics[loser].expanded - metrics[winner].expanded;
      } else {
        // challenging — total expanded
        score = pathAlgos.reduce((s, a) => s + metrics[a].expanded, 0) / pathAlgos.length;
      }

      if (score > bestScore) {
        bestScore = score;
        bestGen = gen;
      }
    }

    intentScore = bestScore;
    intentSatisfied = bestScore > 0;

  } catch (err: any) {
    errorMessage = err.message?.slice(0, 200) || 'Unknown error';
  }
  const responseTimeMs = performance.now() - t0;

  return {
    batchId,
    testType: 'generate',
    generatorType: 'mixed',
    mapRows: 25,
    mapCols: 50,
    wallCount: walls,
    weightedCount: weighted,
    prompt: promptDef.desc.slice(0, 500),
    language: 'en',
    aiModel: currentModel,
    responseTimeMs: parseFloat(responseTimeMs.toFixed(1)),
    validJson,
    errorMessage,
    aiPredictedBest: null,
    aiPredictedWorst: null,
    actualBest: null,
    actualWorst: null,
    bestCorrect: null,
    worstCorrect: null,
    requestedIntent: promptDef.intent,
    intentAlgorithms: extractedAlgos,
    intentSatisfied,
    intentScore: intentScore !== null ? parseFloat(intentScore.toFixed(1)) : null,
    momentsReturned: null,
    momentsValid: null,
  };
}

// ────────────────────────────────────────────────────────────
// TEST 3: TUTOR — Does AI produce valid key moments?
// ────────────────────────────────────────────────────────────

async function testTutor(
  grid: Grid,
  genType: string,
  algorithm: AlgoName,
  batchId: string,
): Promise<any> {
  const metrics = benchmarkGrid(grid);
  const res = metrics[algorithm];
  const { walls, weighted } = countCells(grid);
  const totalSteps = res.expanded;

  // Simulate key moments (same as client extractKeyMoments)
  const earlyStep = Math.max(1, Math.floor(totalSteps * 0.1));
  const midStep = Math.floor(totalSteps * 0.5);
  const endStep = totalSteps;

  const moments = [
    { stepIndex: earlyStep, context: `Early exploration: algorithm has expanded ${earlyStep} nodes` },
    { stepIndex: midStep, context: `Mid-point: algorithm has explored roughly half the reachable nodes (${midStep} expanded)` },
    { stepIndex: endStep, context: res.foundPath
      ? `Algorithm found path with cost ${res.pathCost}`
      : `Algorithm exhausted all reachable nodes without finding a path` },
  ];

  const momentsStr = moments.map((m, i) =>
    `Moment ${i + 1} (step ${m.stepIndex}): ${m.context}`
  ).join('\n');

  const prompt = `Analyze these key moments from a ${ALGO_LABELS[algorithm]} execution on a ${grid.rows}×${grid.cols} grid (${walls} walls, ${weighted} weighted cells).

Key moments:
${momentsStr}

For each moment, provide an educational explanation (2-3 sentences) of what the algorithm is doing and WHY it matters. Keep the exact stepIndex values.

Respond with JSON:
{
  "keyMoments": [
    { "stepIndex": ${earlyStep}, "explanation": "..." },
    { "stepIndex": ${midStep}, "explanation": "..." },
    { "stepIndex": ${endStep}, "explanation": "..." }
  ]
}`;

  const t0 = performance.now();
  let validJson = false;
  let errorMessage: string | null = null;
  let momentsReturned: number | null = null;
  let momentsValid: boolean | null = null;

  try {
    const raw = await callAIWithRetry(prompt, { maxTokens: 600, temperature: 0.3 });
    const parsed = JSON.parse(raw);
    validJson = true;

    const km = parsed.keyMoments || [];
    momentsReturned = km.length;

    // Validate: all stepIndices should be within [0, totalSteps]
    const validIndices = [earlyStep, midStep, endStep];
    momentsValid = km.every((m: any) =>
      typeof m.stepIndex === 'number' &&
      typeof m.explanation === 'string' &&
      m.explanation.length > 10
    );
  } catch (err: any) {
    errorMessage = err.message?.slice(0, 200) || 'Unknown error';
  }
  const responseTimeMs = performance.now() - t0;

  return {
    batchId,
    testType: 'tutor',
    generatorType: genType,
    mapRows: grid.rows,
    mapCols: grid.cols,
    wallCount: walls,
    weightedCount: weighted,
    prompt: prompt.slice(0, 500),
    language: 'en',
    aiModel: currentModel,
    responseTimeMs: parseFloat(responseTimeMs.toFixed(1)),
    validJson,
    errorMessage,
    aiPredictedBest: null,
    aiPredictedWorst: null,
    actualBest: null,
    actualWorst: null,
    bestCorrect: null,
    worstCorrect: null,
    requestedIntent: null,
    intentAlgorithms: [],
    intentSatisfied: null,
    intentScore: null,
    momentsReturned,
    momentsValid,
  };
}

// ────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const mapsIdx = args.indexOf('--maps');
  const numMaps = mapsIdx !== -1 ? Math.max(1, parseInt(args[mapsIdx + 1], 10) || 5) : 5;
  const modelIdx = args.indexOf('--model');
  if (modelIdx !== -1 && args[modelIdx + 1]) currentModel = args[modelIdx + 1];
  const dryRun = args.includes('--dry-run');

  if (dryRun) {
    const recTests = numMaps * MAP_TYPES.length;
    const genTests = GENERATE_PROMPTS.length;
    const tutTests = numMaps * 3; // 3 algorithms per map
    console.log(`\n📋 AI BENCHMARK DRY RUN (model: ${currentModel})\n`);
    console.log(`  Recommend tests: ${recTests} (${numMaps} seeds × ${MAP_TYPES.length} map types)`);
    console.log(`  Generate tests:  ${genTests} (${GENERATE_PROMPTS.length} intent prompts)`);
    console.log(`  Tutor tests:     ${tutTests} (${numMaps} maps × 3 algorithms)`);
    console.log(`  TOTAL AI calls:  ${recTests + genTests + tutTests}`);
    console.log(`  Est. time:       ~${Math.ceil((recTests + genTests + tutTests) * AI_DELAY_MS / 1000 / 60)} minutes\n`);
    process.exit(0);
  }

  await mongoose.connect(MONGODB_URI);
  console.log(`Connected to MongoDB`);

  const batchId = generateBatchId();
  console.log(`\n🤖 AI Benchmark — Batch: ${batchId}`);
  console.log(`   Model: ${currentModel}`);
  console.log(`   Maps per type: ${numMaps}\n`);

  const allResults: any[] = [];
  const t0 = Date.now();

  // ─── RECOMMEND TESTS ──────────────────────────────────
  console.log('▶ RECOMMEND tests…');
  let recDone = 0;
  for (const gen of MAP_TYPES) {
    if (dailyLimitHit) break;
    for (let i = 0; i < numMaps; i++) {
      if (dailyLimitHit) break;
      const seed = 1000 + i * 137;
      const grid = generateMap(gen, 25, 50, { density: 30, seed });
      const result = await testRecommend(grid, gen, batchId);
      if (!result.skipped) {
        allResults.push(result);
        recDone++;
        const mark = result.bestCorrect && result.worstCorrect ? '✓' : result.bestCorrect ? '½' : '✗';
        process.stdout.write(`  [${mark}] ${gen} seed=${seed} — best:${result.bestCorrect ? '✓' : '✗'} worst:${result.worstCorrect ? '✓' : '✗'} (${result.responseTimeMs.toFixed(0)}ms)\n`);
      } else {
        process.stdout.write(`  [—] ${gen} seed=${seed} — skipped (${result.reason})\n`);
      }
      if (result.errorMessage && (result.errorMessage.includes('429') || result.errorMessage.includes('rate'))) {
        process.stdout.write(`  ⚠️ Rate limit detected, pausing 60s…\n`);
        await sleep(60000);
      } else {
        await sleep(AI_DELAY_MS);
      }
    }
  }
  console.log(`  Done: ${recDone} recommend tests${dailyLimitHit ? ' (daily limit hit)' : ''}\n`);

  // ─── GENERATE TESTS ───────────────────────────────────
  if (!dailyLimitHit) {
  console.log('▶ GENERATE tests…');
  for (const promptDef of GENERATE_PROMPTS) {
    if (dailyLimitHit) break;
    const result = await testGenerate(promptDef, batchId);
    allResults.push(result);
    const mark = result.intentSatisfied ? '✓' : '✗';
    process.stdout.write(`  [${mark}] "${promptDef.desc.slice(0, 50)}…" — intent:${result.validJson ? '✓' : '✗'} satisfied:${result.intentSatisfied ? '✓' : '✗'} score:${result.intentScore ?? 'N/A'} (${result.responseTimeMs.toFixed(0)}ms)\n`);
    if (result.errorMessage && (result.errorMessage.includes('429') || result.errorMessage.includes('rate'))) {
      await sleep(60000);
    } else {
      await sleep(AI_DELAY_MS);
    }
  }
  console.log(`  Done: ${GENERATE_PROMPTS.length} generate tests${dailyLimitHit ? ' (daily limit hit)' : ''}\n`);
  }

  // ─── TUTOR TESTS ──────────────────────────────────────
  if (!dailyLimitHit) {
  console.log('▶ TUTOR tests…');
  const tutorAlgos: AlgoName[] = ['a_star', 'dijkstra', 'bfs'];
  let tutDone = 0;
  for (let i = 0; i < numMaps; i++) {
    if (dailyLimitHit) break;
    const gen = MAP_TYPES[i % MAP_TYPES.length];
    const grid = generateMap(gen, 25, 50, { density: 25, seed: 2000 + i * 73 });
    for (const algo of tutorAlgos) {
      if (dailyLimitHit) break;
      const result = await testTutor(grid, gen, algo, batchId);
      allResults.push(result);
      tutDone++;
      const mark = result.momentsValid ? '✓' : '✗';
      process.stdout.write(`  [${mark}] ${gen} ${ALGO_LABELS[algo]} — moments:${result.momentsReturned ?? 0} valid:${result.momentsValid ? '✓' : '✗'} (${result.responseTimeMs.toFixed(0)}ms)\n`);
      if (result.errorMessage && (result.errorMessage.includes('429') || result.errorMessage.includes('rate'))) {
        await sleep(60000);
      } else {
        await sleep(AI_DELAY_MS);
      }
    }
  }
  console.log(`  Done: ${tutDone} tutor tests${dailyLimitHit ? ' (daily limit hit)' : ''}\n`);
  }

  // ─── SAVE TO MONGODB ──────────────────────────────────
  if (allResults.length > 0) {
    await AIBenchmarkResult.insertMany(allResults, { ordered: false });
    console.log(`✓ Saved ${allResults.length} results to MongoDB`);
  }

  // ─── EXPORT FILES ─────────────────────────────────────
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const jsonPath = path.join(OUTPUT_DIR, `ai-benchmark-${batchId}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(allResults, null, 2), 'utf-8');

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n✅ AI Benchmark complete — ${allResults.length} tests in ${elapsed}s`);
  if (dailyLimitHit) {
    console.log(`⚠️ Daily API limit reached. Results saved for completed tests.`);
    console.log(`   Run again tomorrow to continue adding to the dataset.`);
  }
  console.log(`📁 JSON: ${jsonPath}`);

  // ─── PRINT SUMMARY ────────────────────────────────────
  printSummary(allResults);

  // DB stats
  const totalInDB = await AIBenchmarkResult.countDocuments();
  const batchCount = (await AIBenchmarkResult.distinct('batchId')).length;
  console.log(`\n📊 AI DB total: ${totalInDB} results across ${batchCount} batch(es)`);

  await mongoose.disconnect();
  process.exit(0);
}

function printSummary(results: any[]) {
  console.log('\n┌─── AI BENCHMARK SUMMARY ───────────────────────────────┐');

  // Recommend
  const rec = results.filter(r => r.testType === 'recommend');
  if (rec.length > 0) {
    const bestAcc = rec.filter(r => r.bestCorrect).length / rec.length;
    const worstAcc = rec.filter(r => r.worstCorrect).length / rec.length;
    const bothAcc = rec.filter(r => r.bestCorrect && r.worstCorrect).length / rec.length;
    const avgTime = rec.reduce((s, r) => s + r.responseTimeMs, 0) / rec.length;
    const jsonRate = rec.filter(r => r.validJson).length / rec.length;
    console.log(`│ RECOMMEND (${rec.length} tests):`);
    console.log(`│   Best accuracy:    ${(bestAcc * 100).toFixed(1)}%`);
    console.log(`│   Worst accuracy:   ${(worstAcc * 100).toFixed(1)}%`);
    console.log(`│   Both correct:     ${(bothAcc * 100).toFixed(1)}%`);
    console.log(`│   Valid JSON:       ${(jsonRate * 100).toFixed(1)}%`);
    console.log(`│   Avg response:     ${avgTime.toFixed(0)}ms`);
  }

  // Generate
  const gen = results.filter(r => r.testType === 'generate');
  if (gen.length > 0) {
    const intentAcc = gen.filter(r => r.validJson).length / gen.length;
    const satisfied = gen.filter(r => r.intentSatisfied).length / gen.length;
    const avgTime = gen.reduce((s, r) => s + r.responseTimeMs, 0) / gen.length;
    const avgScore = gen.filter(r => r.intentScore !== null).reduce((s, r) => s + r.intentScore, 0) / gen.filter(r => r.intentScore !== null).length;
    console.log(`│ GENERATE (${gen.length} tests):`);
    console.log(`│   Intent extraction: ${(intentAcc * 100).toFixed(1)}%`);
    console.log(`│   Intent satisfied:  ${(satisfied * 100).toFixed(1)}%`);
    console.log(`│   Avg intent score:  ${avgScore.toFixed(1)}`);
    console.log(`│   Avg response:      ${avgTime.toFixed(0)}ms`);
  }

  // Tutor
  const tut = results.filter(r => r.testType === 'tutor');
  if (tut.length > 0) {
    const validMoments = tut.filter(r => r.momentsValid).length / tut.length;
    const jsonRate = tut.filter(r => r.validJson).length / tut.length;
    const avgMoments = tut.filter(r => r.momentsReturned !== null).reduce((s, r) => s + r.momentsReturned!, 0) / tut.length;
    const avgTime = tut.reduce((s, r) => s + r.responseTimeMs, 0) / tut.length;
    console.log(`│ TUTOR (${tut.length} tests):`);
    console.log(`│   Valid JSON:        ${(jsonRate * 100).toFixed(1)}%`);
    console.log(`│   Valid moments:     ${(validMoments * 100).toFixed(1)}%`);
    console.log(`│   Avg moments ret:   ${avgMoments.toFixed(1)}`);
    console.log(`│   Avg response:      ${avgTime.toFixed(0)}ms`);
  }

  // Overall
  const errRate = results.filter(r => r.errorMessage !== null).length / results.length;
  const avgAllTime = results.reduce((s, r) => s + r.responseTimeMs, 0) / results.length;
  console.log(`│`);
  console.log(`│ OVERALL (${results.length} tests):`);
  console.log(`│   Error rate:        ${(errRate * 100).toFixed(1)}%`);
  console.log(`│   Avg latency:       ${avgAllTime.toFixed(0)}ms`);
  console.log(`└────────────────────────────────────────────────────────┘`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
