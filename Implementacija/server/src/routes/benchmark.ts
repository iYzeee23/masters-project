import { Router, Request, Response } from 'express';
import { BenchmarkResult } from '../models/BenchmarkResult';
import {
  buildAllScenarios,
  buildScenario,
  runScenario,
  toCSV,
  toJSON,
  SingleBenchmarkResult,
} from '../services/benchmark-runner';

const router = Router();

// ────────────────────────────────────────────────────────────
// POST /api/benchmark/run
// Body: { categories?: string[] }   — default: all (E1..E10)
// Runs the benchmark, saves every result to MongoDB, returns summary.
// ────────────────────────────────────────────────────────────
router.post('/run', async (req: Request, res: Response) => {
  try {
    const { categories } = req.body as { categories?: string[] };
    const batchId = generateBatchId();

    let scenarios;
    if (categories && categories.length > 0) {
      scenarios = categories
        .map(c => buildScenario(c))
        .filter(Boolean) as ReturnType<typeof buildScenario>[];
      if (scenarios.length === 0) {
        res.status(400).json({ error: 'No valid categories. Use E1, E6, E7, E8, E9, E10.' });
        return;
      }
    } else {
      scenarios = buildAllScenarios();
    }

    console.log(`[benchmark] Starting batch ${batchId} — ${scenarios.length} scenario(s)`);

    const allResults: SingleBenchmarkResult[] = [];
    const summaryPerCategory: Record<string, { total: number; withPath: number; avgExpanded: number; avgTimeMs: number }> = {};

    for (const scenario of scenarios) {
      const t0 = Date.now();
      console.log(`[benchmark] Running ${scenario!.evaluationCategory}…`);

      const results = runScenario(scenario!, (p) => {
        if (p.completed % 100 === 0 || p.completed === p.total) {
          console.log(`  [${p.category}] ${p.completed}/${p.total}`);
        }
      });

      // Bulk-insert into MongoDB
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

      const withPath = results.filter(r => r.result.foundPath).length;
      const avgExp = results.reduce((s, r) => s + r.result.expandedNodes, 0) / results.length;
      const avgT = results.reduce((s, r) => s + r.result.executionTimeMs, 0) / results.length;

      summaryPerCategory[scenario!.evaluationCategory] = {
        total: results.length,
        withPath,
        avgExpanded: Math.round(avgExp),
        avgTimeMs: parseFloat(avgT.toFixed(3)),
      };

      allResults.push(...results);
      console.log(`  [${scenario!.evaluationCategory}] Done — ${results.length} runs in ${Date.now() - t0}ms`);
    }

    res.json({
      batchId,
      totalSimulations: allResults.length,
      summary: summaryPerCategory,
    });
  } catch (err) {
    console.error('[benchmark:run]', err);
    res.status(500).json({ error: 'Benchmark failed', details: String(err) });
  }
});

// ────────────────────────────────────────────────────────────
// GET /api/benchmark/results
// Query: ?batchId=xxx  or  ?category=E1  or both
// Returns all stored results (paginated).
// ────────────────────────────────────────────────────────────
router.get('/results', async (req: Request, res: Response) => {
  try {
    const { batchId, category, algorithm, limit = '5000', skip = '0' } = req.query;
    const filter: Record<string, unknown> = {};
    if (batchId) filter.batchId = String(batchId);
    if (category) filter.evaluationCategory = String(category);
    if (algorithm) filter.algorithm = String(algorithm);

    const parsedLimit = Math.min(parseInt(limit as string, 10) || 5000, 50000);
    const parsedSkip = parseInt(skip as string, 10) || 0;

    const results = await BenchmarkResult.find(filter)
      .sort({ createdAt: -1 })
      .skip(parsedSkip)
      .limit(parsedLimit)
      .lean();

    const count = await BenchmarkResult.countDocuments(filter);

    res.json({ count, results });
  } catch (err) {
    console.error('[benchmark:results]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ────────────────────────────────────────────────────────────
// GET /api/benchmark/export?format=csv|json&batchId=xxx&category=E1
// Exports results as downloadable CSV or JSON.
// ────────────────────────────────────────────────────────────
router.get('/export', async (req: Request, res: Response) => {
  try {
    const { format = 'csv', batchId, category } = req.query;
    const filter: Record<string, unknown> = {};
    if (batchId) filter.batchId = String(batchId);
    if (category) filter.evaluationCategory = String(category);

    const docs = await BenchmarkResult.find(filter).sort({ createdAt: 1 }).lean();

    if (docs.length === 0) {
      res.status(404).json({ error: 'No results found for given filters.' });
      return;
    }

    // Convert docs to SingleBenchmarkResult shape for export helpers
    const mapped: SingleBenchmarkResult[] = docs.map((d: any) => ({
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

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="benchmark-results.json"');
      res.json(toJSON(mapped));
    } else {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="benchmark-results.csv"');
      res.send(toCSV(mapped));
    }
  } catch (err) {
    console.error('[benchmark:export]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ────────────────────────────────────────────────────────────
// GET /api/benchmark/summary
// Aggregated stats across all stored benchmark data.
// ────────────────────────────────────────────────────────────
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const { batchId } = req.query;
    const match: Record<string, unknown> = {};
    if (batchId) match.batchId = String(batchId);

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: {
            category: '$evaluationCategory',
            algorithm: '$algorithm',
          },
          count: { $sum: 1 },
          avgExpanded: { $avg: '$expandedNodes' },
          avgPathCost: { $avg: '$pathCost' },
          avgPathLength: { $avg: '$pathLength' },
          avgTimeMs: { $avg: '$executionTimeMs' },
          pathFoundRate: {
            $avg: { $cond: ['$foundPath', 1, 0] },
          },
        },
      },
      { $sort: { '_id.category': 1 as 1, '_id.algorithm': 1 as 1 } },
    ];

    const agg = await BenchmarkResult.aggregate(pipeline);

    // Also get batch list
    const batches = await BenchmarkResult.distinct('batchId');
    const totalDocs = await BenchmarkResult.countDocuments(match);

    res.json({
      totalResults: totalDocs,
      batches,
      aggregated: agg.map((a: any) => ({
        category: a._id.category,
        algorithm: a._id.algorithm,
        count: a.count,
        avgExpanded: Math.round(a.avgExpanded),
        avgPathCost: a.avgPathCost !== null ? parseFloat(a.avgPathCost.toFixed(2)) : null,
        avgPathLength: a.avgPathLength !== null ? parseFloat(a.avgPathLength.toFixed(2)) : null,
        avgTimeMs: parseFloat(a.avgTimeMs.toFixed(3)),
        pathFoundRate: parseFloat((a.pathFoundRate * 100).toFixed(1)),
      })),
    });
  } catch (err) {
    console.error('[benchmark:summary]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ────────────────────────────────────────────────────────────
// GET /api/benchmark/batches
// List all batch IDs with their creation date and count.
// ────────────────────────────────────────────────────────────
router.get('/batches', async (_req: Request, res: Response) => {
  try {
    const pipeline = [
      {
        $group: {
          _id: '$batchId',
          count: { $sum: 1 },
          categories: { $addToSet: '$evaluationCategory' },
          firstRun: { $min: '$createdAt' },
          lastRun: { $max: '$createdAt' },
        },
      },
      { $sort: { firstRun: -1 as -1 } },
    ];
    const batches = await BenchmarkResult.aggregate(pipeline);
    res.json(batches.map((b: any) => ({
      batchId: b._id,
      count: b.count,
      categories: b.categories.sort(),
      firstRun: b.firstRun,
      lastRun: b.lastRun,
    })));
  } catch (err) {
    console.error('[benchmark:batches]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ────────────────────────────────────────────────────────────
// Helper: generate a short batch ID
// ────────────────────────────────────────────────────────────
function generateBatchId(): string {
  const now = new Date();
  const ts = now.toISOString().replace(/[-:T]/g, '').slice(0, 14); // 20260410120000
  const rand = Math.random().toString(36).slice(2, 8);
  return `bench-${ts}-${rand}`;
}

export default router;
