/**
 * benchmark-runner.ts
 *
 * Enhanced algorithm runners for comprehensive evaluation.
 * Supports: configurable heuristic, 4/8 neighbors, custom swarm weights,
 * execution time measurement, path length tracking.
 *
 * Covers evaluation categories:
 *   E1  — Core algorithm benchmark (8 algos × 7 map types)
 *   E6  — Scalability by grid size
 *   E7  — Heuristic comparison (Manhattan/Euclidean/Chebyshev/Octile)
 *   E8  — 4-connected vs 8-connected
 *   E9  — Swarm weight sweep
 *   E10 — Unsolvable maps
 */

import {
  generateMap,
  GeneratorType,
  ALL_ALGOS,
  AlgoName,
} from './generators';

// ============================================================
// TYPES
// ============================================================

interface Position { row: number; col: number; }
interface Cell { position: Position; type: string; weight: number; }
interface Grid { rows: number; cols: number; cells: Cell[][]; start: Position; goal: Position; }

export type HeuristicName = 'manhattan' | 'euclidean' | 'chebyshev' | 'octile';

export interface BenchmarkAlgoConfig {
  algorithm: AlgoName;
  heuristic: HeuristicName;
  neighborMode: 4 | 8;
  swarmWeight?: number;           // only for swarm / convergent_swarm
}

export interface BenchmarkAlgoResult {
  expandedNodes: number;
  pathCost: number | null;
  pathLength: number | null;
  foundPath: boolean;
  executionTimeMs: number;
}

export interface BenchmarkMapConfig {
  generatorType: GeneratorType | 'unsolvable';
  rows: number;
  cols: number;
  density: number;
  seed: number;
}

export interface BenchmarkMapMeta {
  wallCount: number;
  weightedCount: number;
}

export interface SingleBenchmarkResult {
  map: BenchmarkMapConfig;
  mapMeta: BenchmarkMapMeta;
  algo: BenchmarkAlgoConfig;
  result: BenchmarkAlgoResult;
  evaluationCategory: string;
}

// ============================================================
// HEURISTIC FUNCTIONS
// ============================================================

function heuristic(name: HeuristicName, r1: number, c1: number, r2: number, c2: number): number {
  const dr = Math.abs(r1 - r2);
  const dc = Math.abs(c1 - c2);
  switch (name) {
    case 'manhattan':  return dr + dc;
    case 'euclidean':  return Math.sqrt(dr * dr + dc * dc);
    case 'chebyshev':  return Math.max(dr, dc);
    case 'octile': {
      const F = Math.SQRT2 - 1;   // ≈ 0.4142
      return dr > dc ? F * dc + dr : F * dr + dc;
    }
  }
}

// ============================================================
// NEIGHBOR GENERATION
// ============================================================

const DIRS4: [number, number][] = [[-1,0],[1,0],[0,-1],[0,1]];
const DIRS8: [number, number][] = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];

function neighbors(grid: Grid, r: number, c: number, mode: 4 | 8): [number, number, number][] {
  const dirs = mode === 8 ? DIRS8 : DIRS4;
  const res: [number, number, number][] = [];
  for (const [dr, dc] of dirs) {
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nr >= grid.rows || nc < 0 || nc >= grid.cols) continue;
    if (grid.cells[nr][nc].type === 'wall') continue;
    // For 8-connected diagonals, cost is weight * sqrt(2)
    const isDiag = dr !== 0 && dc !== 0;
    const w = grid.cells[nr][nc].weight * (isDiag ? Math.SQRT2 : 1);
    res.push([nr, nc, w]);
  }
  return res;
}

function pk(r: number, c: number): string { return `${r},${c}`; }

// ============================================================
// ENHANCED ALGORITHM IMPLEMENTATIONS
// ============================================================

function rebuildPathLength(parent: Map<string, string | null>, goalKey: string): number {
  let len = 0;
  let cur: string | null = goalKey;
  while (cur !== null) {
    len++;
    cur = parent.get(cur) ?? null;
  }
  return len;
}

function runBFSEnhanced(grid: Grid, mode: 4 | 8): BenchmarkAlgoResult {
  const t0 = performance.now();
  const { start: s, goal: g } = grid;
  const sk = pk(s.row, s.col);
  const vis = new Set<string>([sk]);
  const par = new Map<string, string | null>([[sk, null]]);
  const q: [number, number, number][] = [[s.row, s.col, 0]];
  let exp = 0;
  while (q.length > 0) {
    const [r, c, d] = q.shift()!;
    const ck = pk(r, c);
    if (r === g.row && c === g.col) {
      return {
        expandedNodes: exp,
        pathCost: d,
        pathLength: rebuildPathLength(par, ck),
        foundPath: true,
        executionTimeMs: performance.now() - t0,
      };
    }
    exp++;
    for (const [nr, nc] of neighbors(grid, r, c, mode)) {
      const nk = pk(nr, nc);
      if (!vis.has(nk)) {
        vis.add(nk);
        par.set(nk, ck);
        q.push([nr, nc, d + 1]);
      }
    }
  }
  return {
    expandedNodes: exp,
    pathCost: null,
    pathLength: null,
    foundPath: false,
    executionTimeMs: performance.now() - t0,
  };
}

function runDFSEnhanced(grid: Grid, mode: 4 | 8): BenchmarkAlgoResult {
  const t0 = performance.now();
  const { start: s, goal: g } = grid;
  const vis = new Set<string>();
  const par = new Map<string, string | null>([[pk(s.row, s.col), null]]);
  const stk: [number, number][] = [[s.row, s.col]];
  let exp = 0;
  let cost = 0;
  while (stk.length > 0) {
    const [r, c] = stk.pop()!;
    const k = pk(r, c);
    if (vis.has(k)) continue;
    vis.add(k);
    if (r === g.row && c === g.col) {
      const pl = rebuildPathLength(par, k);
      return {
        expandedNodes: exp,
        pathCost: cost,
        pathLength: pl,
        foundPath: true,
        executionTimeMs: performance.now() - t0,
      };
    }
    exp++;
    cost++;
    for (const [nr, nc] of neighbors(grid, r, c, mode)) {
      const nk = pk(nr, nc);
      if (!vis.has(nk)) { par.set(nk, k); stk.push([nr, nc]); }
    }
  }
  return {
    expandedNodes: exp,
    pathCost: null,
    pathLength: null,
    foundPath: false,
    executionTimeMs: performance.now() - t0,
  };
}

function runPQEnhanced(
  grid: Grid,
  mode: 4 | 8,
  algoMode: 'dijkstra' | 'a_star' | 'greedy' | 'swarm' | 'convergent_swarm',
  hName: HeuristicName,
  swarmW?: number,
): BenchmarkAlgoResult {
  const t0 = performance.now();
  const { start: s, goal: g } = grid;
  const gs = new Map<string, number>();
  const cl = new Set<string>();
  const par = new Map<string, string | null>();
  const op: { r: number; c: number; f: number; g: number }[] = [];

  const sk = pk(s.row, s.col);
  gs.set(sk, 0);
  par.set(sk, null);

  let w: number;
  if (swarmW !== undefined) {
    w = swarmW;
  } else if (algoMode === 'swarm') {
    w = 2;
  } else if (algoMode === 'convergent_swarm') {
    w = 5;
  } else {
    w = 1;
  }

  const h0 = heuristic(hName, s.row, s.col, g.row, g.col);
  const f0 = algoMode === 'dijkstra' ? 0
           : algoMode === 'greedy' ? h0
           : w * h0;
  op.push({ r: s.row, c: s.col, f: f0, g: 0 });
  let exp = 0;

  while (op.length > 0) {
    // Linear scan for min — fine for benchmark (same as existing code)
    let mi = 0;
    for (let i = 1; i < op.length; i++) if (op[i].f < op[mi].f) mi = i;
    const cur = op[mi];
    op[mi] = op[op.length - 1];
    op.pop();

    const ck = pk(cur.r, cur.c);
    if (cl.has(ck)) continue;
    cl.add(ck);

    if (cur.r === g.row && cur.c === g.col) {
      return {
        expandedNodes: exp,
        pathCost: cur.g,
        pathLength: rebuildPathLength(par, ck),
        foundPath: true,
        executionTimeMs: performance.now() - t0,
      };
    }
    exp++;

    for (const [nr, nc, wt] of neighbors(grid, cur.r, cur.c, mode)) {
      const nk = pk(nr, nc);
      if (cl.has(nk)) continue;
      const ng = cur.g + wt;
      if (ng < (gs.get(nk) ?? Infinity)) {
        gs.set(nk, ng);
        par.set(nk, ck);
        const h = heuristic(hName, nr, nc, g.row, g.col);
        let f: number;
        if (algoMode === 'dijkstra') f = ng;
        else if (algoMode === 'greedy') f = h;
        else f = ng + w * h;
        op.push({ r: nr, c: nc, f, g: ng });
      }
    }
  }
  return {
    expandedNodes: exp,
    pathCost: null,
    pathLength: null,
    foundPath: false,
    executionTimeMs: performance.now() - t0,
  };
}

function runZeroOneBFSEnhanced(grid: Grid, mode: 4 | 8): BenchmarkAlgoResult {
  const t0 = performance.now();
  const { start: s, goal: g } = grid;
  const dist = new Map<string, number>();
  const cl = new Set<string>();
  const par = new Map<string, string | null>();
  const dq: [number, number][] = [[s.row, s.col]];
  const sk = pk(s.row, s.col);
  dist.set(sk, 0);
  par.set(sk, null);
  let exp = 0;

  while (dq.length > 0) {
    const [r, c] = dq.shift()!;
    const ck = pk(r, c);
    if (cl.has(ck)) continue;
    cl.add(ck);
    const d = dist.get(ck)!;
    if (r === g.row && c === g.col) {
      return {
        expandedNodes: exp,
        pathCost: d,
        pathLength: rebuildPathLength(par, ck),
        foundPath: true,
        executionTimeMs: performance.now() - t0,
      };
    }
    exp++;
    for (const [nr, nc, wt] of neighbors(grid, r, c, mode)) {
      const nk = pk(nr, nc);
      const ew = wt <= 1 ? 0 : 1;
      const nd = d + ew;
      if (nd < (dist.get(nk) ?? Infinity)) {
        dist.set(nk, nd);
        par.set(nk, ck);
        if (ew === 0) dq.unshift([nr, nc]); else dq.push([nr, nc]);
      }
    }
  }
  return {
    expandedNodes: exp,
    pathCost: null,
    pathLength: null,
    foundPath: false,
    executionTimeMs: performance.now() - t0,
  };
}

// ============================================================
// PUBLIC: Run a single algorithm with full config
// ============================================================

export function runBenchmarkAlgo(
  grid: Grid,
  config: BenchmarkAlgoConfig,
): BenchmarkAlgoResult {
  const { algorithm, heuristic: h, neighborMode: m, swarmWeight: sw } = config;
  switch (algorithm) {
    case 'bfs':               return runBFSEnhanced(grid, m);
    case 'dfs':               return runDFSEnhanced(grid, m);
    case 'dijkstra':          return runPQEnhanced(grid, m, 'dijkstra',          h, sw);
    case 'a_star':            return runPQEnhanced(grid, m, 'a_star',            h, sw);
    case 'greedy':            return runPQEnhanced(grid, m, 'greedy',            h, sw);
    case 'swarm':             return runPQEnhanced(grid, m, 'swarm',             h, sw);
    case 'convergent_swarm':  return runPQEnhanced(grid, m, 'convergent_swarm',  h, sw);
    case 'zero_one_bfs':      return runZeroOneBFSEnhanced(grid, m);
  }
}

// ============================================================
// MAP HELPERS
// ============================================================

function countWalls(grid: Grid): number {
  let c = 0;
  for (let r = 0; r < grid.rows; r++)
    for (let co = 0; co < grid.cols; co++)
      if (grid.cells[r][co].type === 'wall') c++;
  return c;
}

function countWeighted(grid: Grid): number {
  let c = 0;
  for (let r = 0; r < grid.rows; r++)
    for (let co = 0; co < grid.cols; co++)
      if (grid.cells[r][co].type === 'weight') c++;
  return c;
}

/** Generate an unsolvable map: start is fully enclosed by walls. */
function generateUnsolvableMap(rows: number, cols: number, seed: number): Grid {
  const grid = generateMap('random', rows, cols, { density: 15, seed });
  // Wall off every neighbor of start
  const { start: s } = grid;
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]) {
    const nr = s.row + dr, nc = s.col + dc;
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
      if (grid.cells[nr][nc].type !== 'start' && grid.cells[nr][nc].type !== 'goal') {
        grid.cells[nr][nc].type = 'wall';
        grid.cells[nr][nc].weight = 1;
      }
    }
  }
  return grid;
}

// ============================================================
// BENCHMARK SCENARIO DEFINITIONS
// ============================================================

export interface BenchmarkScenario {
  evaluationCategory: string;
  maps: BenchmarkMapConfig[];
  algoConfigs: BenchmarkAlgoConfig[];
}

const SEEDS = [42, 137, 256, 500, 789];
const SEEDS_3 = [42, 137, 256];

/** Generate N deterministic seeds from a base set by expanding with offsets */
function expandSeeds(base: number[], scale: number): number[] {
  if (scale <= 1) return base;
  const result: number[] = [...base];
  for (let i = 1; i < scale; i++) {
    for (const s of base) {
      result.push(s + i * 1000 + i * 7);
    }
  }
  return result;
}

const DEFAULT_HEURISTIC: HeuristicName = 'manhattan';
const ALL_HEURISTICS: HeuristicName[] = ['manhattan', 'euclidean', 'chebyshev', 'octile'];

const MAP_TYPES: GeneratorType[] = ['random', 'maze', 'weighted', 'mixed', 'bottleneck', 'city', 'open'];
const DENSITIES = [15, 30, 45];

function defaultAlgoConfigs(hName: HeuristicName = 'manhattan', nMode: 4 | 8 = 4): BenchmarkAlgoConfig[] {
  return ALL_ALGOS.map(a => ({
    algorithm: a,
    heuristic: hName,
    neighborMode: nMode,
  }));
}

/** E1 — Core algorithm benchmark: 7 map types × densities × seeds × 8 algos */
function buildE1(scale = 1): BenchmarkScenario {
  const seeds = expandSeeds(SEEDS, scale);
  const maps: BenchmarkMapConfig[] = [];
  for (const gen of MAP_TYPES) {
    const useDensity = gen === 'random' || gen === 'mixed';
    const densities = useDensity ? DENSITIES : [0];
    for (const d of densities) {
      for (const seed of seeds) {
        maps.push({ generatorType: gen, rows: 25, cols: 50, density: d, seed });
      }
    }
  }
  return {
    evaluationCategory: 'E1',
    maps,
    algoConfigs: defaultAlgoConfigs(),
  };
}

/** E6 — Scalability: varying grid sizes */
function buildE6(scale = 1): BenchmarkScenario {
  const seeds = expandSeeds(SEEDS_3, scale);
  const sizes: [number, number][] = [[10,20],[25,50],[50,100],[75,150],[100,200]];
  const gens: GeneratorType[] = ['random', 'maze', 'open'];
  const maps: BenchmarkMapConfig[] = [];
  for (const [r, c] of sizes) {
    for (const gen of gens) {
      for (const seed of seeds) {
        maps.push({ generatorType: gen, rows: r, cols: c, density: 30, seed });
      }
    }
  }
  return {
    evaluationCategory: 'E6',
    maps,
    algoConfigs: defaultAlgoConfigs(),
  };
}

/** E7 — Heuristic comparison: 4 heuristics × heuristic-sensitive algos */
function buildE7(scale = 1): BenchmarkScenario {
  const seeds = expandSeeds(SEEDS_3, scale);
  const gens: GeneratorType[] = ['random', 'maze', 'weighted', 'bottleneck', 'open'];
  const maps: BenchmarkMapConfig[] = [];
  for (const gen of gens) {
    for (const seed of seeds) {
      maps.push({ generatorType: gen, rows: 25, cols: 50, density: 30, seed });
    }
  }
  // For each heuristic, run heuristic-sensitive algos + dijkstra/bfs as baseline
  const algoConfigs: BenchmarkAlgoConfig[] = [];
  const heuristicAlgos: AlgoName[] = ['a_star', 'greedy', 'swarm', 'convergent_swarm'];
  for (const h of ALL_HEURISTICS) {
    for (const a of heuristicAlgos) {
      algoConfigs.push({ algorithm: a, heuristic: h, neighborMode: 4 });
    }
  }
  // Baselines (not affected by heuristic, run once)
  for (const a of ['bfs', 'dfs', 'dijkstra', 'zero_one_bfs'] as AlgoName[]) {
    algoConfigs.push({ algorithm: a, heuristic: 'manhattan', neighborMode: 4 });
  }
  return {
    evaluationCategory: 'E7',
    maps,
    algoConfigs,
  };
}

/** E8 — 4-connected vs 8-connected */
function buildE8(scale = 1): BenchmarkScenario {
  const seeds = expandSeeds(SEEDS_3, scale);
  const gens: GeneratorType[] = ['random', 'maze', 'weighted', 'bottleneck', 'open'];
  const maps: BenchmarkMapConfig[] = [];
  for (const gen of gens) {
    for (const seed of seeds) {
      maps.push({ generatorType: gen, rows: 25, cols: 50, density: 30, seed });
    }
  }
  const algoConfigs: BenchmarkAlgoConfig[] = [];
  for (const mode of [4, 8] as (4|8)[]) {
    for (const a of ALL_ALGOS) {
      algoConfigs.push({ algorithm: a, heuristic: 'manhattan', neighborMode: mode });
    }
  }
  return {
    evaluationCategory: 'E8',
    maps,
    algoConfigs,
  };
}

/** E9 — Swarm weight sweep: w from 1.0 to 10.0 */
function buildE9(scale = 1): BenchmarkScenario {
  const seeds = expandSeeds(SEEDS_3, scale);
  const gens: GeneratorType[] = ['random', 'weighted', 'maze'];
  const maps: BenchmarkMapConfig[] = [];
  for (const gen of gens) {
    for (const seed of seeds) {
      maps.push({ generatorType: gen, rows: 25, cols: 50, density: 30, seed });
    }
  }
  const weights = [1.0, 1.5, 2.0, 3.0, 5.0, 7.0, 10.0];
  const algoConfigs: BenchmarkAlgoConfig[] = [];
  // Sweep swarm weight for Swarm and Convergent Swarm
  for (const w of weights) {
    algoConfigs.push({ algorithm: 'swarm', heuristic: 'manhattan', neighborMode: 4, swarmWeight: w });
    algoConfigs.push({ algorithm: 'convergent_swarm', heuristic: 'manhattan', neighborMode: 4, swarmWeight: w });
  }
  // Baselines for comparison
  for (const a of ['bfs', 'dijkstra', 'a_star', 'greedy'] as AlgoName[]) {
    algoConfigs.push({ algorithm: a, heuristic: 'manhattan', neighborMode: 4 });
  }
  return {
    evaluationCategory: 'E9',
    maps,
    algoConfigs,
  };
}

/** E10 — Unsolvable maps: sealed start */
function buildE10(scale = 1): BenchmarkScenario {
  const seeds = expandSeeds(SEEDS_3, scale);
  const sizes: [number, number][] = [[10,20],[25,50],[50,100]];
  const maps: BenchmarkMapConfig[] = [];
  for (const [r, c] of sizes) {
    for (const seed of seeds) {
      maps.push({ generatorType: 'unsolvable' as any, rows: r, cols: c, density: 15, seed });
    }
  }
  return {
    evaluationCategory: 'E10',
    maps,
    algoConfigs: defaultAlgoConfigs(),
  };
}

export function buildAllScenarios(scale = 1): BenchmarkScenario[] {
  return [buildE1(scale), buildE6(scale), buildE7(scale), buildE8(scale), buildE9(scale), buildE10(scale)];
}

export function buildScenario(category: string, scale = 1): BenchmarkScenario | null {
  switch (category) {
    case 'E1':  return buildE1(scale);
    case 'E6':  return buildE6(scale);
    case 'E7':  return buildE7(scale);
    case 'E8':  return buildE8(scale);
    case 'E9':  return buildE9(scale);
    case 'E10': return buildE10(scale);
    default:    return null;
  }
}

// ============================================================
// BENCHMARK EXECUTOR
// ============================================================

export interface BenchmarkProgress {
  total: number;
  completed: number;
  category: string;
  currentMap: string;
  currentAlgo: string;
}

export function runScenario(
  scenario: BenchmarkScenario,
  onProgress?: (p: BenchmarkProgress) => void,
): SingleBenchmarkResult[] {
  const results: SingleBenchmarkResult[] = [];
  const total = scenario.maps.length * scenario.algoConfigs.length;
  let completed = 0;

  for (const mapCfg of scenario.maps) {
    // Generate the grid
    const grid = mapCfg.generatorType === 'unsolvable'
      ? generateUnsolvableMap(mapCfg.rows, mapCfg.cols, mapCfg.seed)
      : generateMap(mapCfg.generatorType as GeneratorType, mapCfg.rows, mapCfg.cols, {
          density: mapCfg.density,
          seed: mapCfg.seed,
        });

    const wallCount = countWalls(grid);
    const weightedCount = countWeighted(grid);
    const mapMeta: BenchmarkMapMeta = { wallCount, weightedCount };

    for (const algoCfg of scenario.algoConfigs) {
      const result = runBenchmarkAlgo(grid, algoCfg);
      results.push({
        map: mapCfg,
        mapMeta,
        algo: algoCfg,
        result,
        evaluationCategory: scenario.evaluationCategory,
      });
      completed++;
      if (onProgress) {
        onProgress({
          total,
          completed,
          category: scenario.evaluationCategory,
          currentMap: `${mapCfg.generatorType} ${mapCfg.rows}×${mapCfg.cols} seed=${mapCfg.seed}`,
          currentAlgo: algoCfg.algorithm,
        });
      }
    }
  }

  return results;
}

// ============================================================
// CSV EXPORT
// ============================================================

const CSV_HEADER = [
  'evaluationCategory',
  'generatorType', 'generatorSeed', 'mapRows', 'mapCols', 'density', 'wallCount', 'weightedCount',
  'algorithm', 'heuristic', 'neighborMode', 'swarmWeight',
  'expandedNodes', 'pathCost', 'pathLength', 'foundPath', 'executionTimeMs',
].join(',');

function csvRow(r: SingleBenchmarkResult): string {
  return [
    r.evaluationCategory,
    r.map.generatorType,
    r.map.seed,
    r.map.rows,
    r.map.cols,
    r.map.density,
    r.mapMeta.wallCount,
    r.mapMeta.weightedCount,
    r.algo.algorithm,
    r.algo.heuristic,
    r.algo.neighborMode,
    r.algo.swarmWeight ?? '',
    r.result.expandedNodes,
    r.result.pathCost ?? '',
    r.result.pathLength ?? '',
    r.result.foundPath,
    r.result.executionTimeMs.toFixed(3),
  ].join(',');
}

export function toCSV(results: SingleBenchmarkResult[]): string {
  return CSV_HEADER + '\n' + results.map(csvRow).join('\n');
}

export function toJSON(results: SingleBenchmarkResult[]): object[] {
  return results.map(r => ({
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
}
