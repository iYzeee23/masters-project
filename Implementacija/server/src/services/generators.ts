/**
 * Server-side map generators — identical to client/src/app/generators/index.ts.
 * Copied here so the AI generate endpoint can produce maps server-side.
 */

interface Position { row: number; col: number; }
interface Cell { position: Position; type: string; weight: number; }
interface Grid { rows: number; cols: number; cells: Cell[][]; start: Position; goal: Position; }

function createRNG(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createEmptyGrid(rows: number, cols: number, start: Position, goal: Position): Grid {
  const cells: Cell[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({ position: { row: r, col: c }, type: 'empty', weight: 1 });
    }
    cells.push(row);
  }
  cells[start.row][start.col].type = 'start';
  cells[goal.row][goal.col].type = 'goal';
  return { rows, cols, cells, start, goal };
}

function isStartOrGoal(r: number, c: number, start: Position, goal: Position): boolean {
  return (r === start.row && c === start.col) || (r === goal.row && c === goal.col);
}

function generateRandomObstacles(rows: number, cols: number, density: number, seed: number): Grid {
  const start: Position = { row: Math.floor(rows / 2), col: Math.floor(cols / 4) };
  const goal: Position = { row: Math.floor(rows / 2), col: Math.floor(3 * cols / 4) };
  const grid = createEmptyGrid(rows, cols, start, goal);
  const rng = createRNG(seed);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (isStartOrGoal(r, c, start, goal)) continue;
      if (rng() < density / 100) grid.cells[r][c].type = 'wall';
    }
  return grid;
}

function generateMaze(rows: number, cols: number, seed: number): Grid {
  const start: Position = { row: 1, col: 1 };
  const goal: Position = { row: rows - 2, col: cols - 2 };
  const grid = createEmptyGrid(rows, cols, start, goal);
  const rng = createRNG(seed);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) grid.cells[r][c].type = 'wall';
  function carve(r: number, c: number) {
    grid.cells[r][c].type = 'empty';
    const dirs = [[0, 2], [2, 0], [0, -2], [-2, 0]];
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1 && grid.cells[nr][nc].type === 'wall') {
        grid.cells[r + dr / 2][c + dc / 2].type = 'empty';
        carve(nr, nc);
      }
    }
  }
  carve(1, 1);
  grid.cells[start.row][start.col].type = 'start';
  grid.cells[goal.row][goal.col].type = 'goal';
  if (goal.row > 0) grid.cells[goal.row - 1][goal.col].type = 'empty';
  if (goal.col > 0) grid.cells[goal.row][goal.col - 1].type = 'empty';
  return grid;
}

function generateWeightedTerrain(rows: number, cols: number, seed: number): Grid {
  const start: Position = { row: Math.floor(rows / 2), col: Math.floor(cols / 4) };
  const goal: Position = { row: Math.floor(rows / 2), col: Math.floor(3 * cols / 4) };
  const grid = createEmptyGrid(rows, cols, start, goal);
  const rng = createRNG(seed);
  const coverage = 0.3 + rng() * 0.2;
  const weightedCount = Math.floor(rows * cols * coverage);
  for (let i = 0; i < weightedCount; i++) {
    const r = Math.floor(rng() * rows), c = Math.floor(rng() * cols);
    if (isStartOrGoal(r, c, start, goal)) continue;
    if (grid.cells[r][c].type === 'wall') continue;
    grid.cells[r][c].type = 'weight';
    grid.cells[r][c].weight = 2 + Math.floor(rng() * 9);
  }
  return grid;
}

function generateBottleneck(rows: number, cols: number, seed: number): Grid {
  const start: Position = { row: Math.floor(rows / 2), col: 1 };
  const goal: Position = { row: Math.floor(rows / 2), col: cols - 2 };
  const grid = createEmptyGrid(rows, cols, start, goal);
  const rng = createRNG(seed);
  const wallCol = Math.floor(cols / 2);
  const passageRow = Math.floor(rng() * (rows - 4)) + 2;
  for (let r = 0; r < rows; r++) {
    if (Math.abs(r - passageRow) > 1) {
      grid.cells[r][wallCol].type = 'wall';
      if (wallCol > 0) grid.cells[r][wallCol - 1].type = 'wall';
      if (wallCol < cols - 1) grid.cells[r][wallCol + 1].type = 'wall';
    }
  }
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (isStartOrGoal(r, c, start, goal)) continue;
      if (grid.cells[r][c].type !== 'empty') continue;
      if (rng() < 0.08) grid.cells[r][c].type = 'wall';
    }
  return grid;
}

function generateCityBlocks(rows: number, cols: number, seed: number): Grid {
  const start: Position = { row: 1, col: 1 };
  const goal: Position = { row: rows - 2, col: cols - 2 };
  const grid = createEmptyGrid(rows, cols, start, goal);
  const rng = createRNG(seed);
  const bR = 4 + Math.floor(rng() * 3), bC = 4 + Math.floor(rng() * 3);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (isStartOrGoal(r, c, start, goal)) continue;
      if (r % bR !== 0 && c % bC !== 0) grid.cells[r][c].type = 'wall';
    }
  return grid;
}

function generateOpenField(rows: number, cols: number): Grid {
  const start: Position = { row: Math.floor(rows / 2), col: Math.floor(cols / 4) };
  const goal: Position = { row: Math.floor(rows / 2), col: Math.floor(3 * cols / 4) };
  return createEmptyGrid(rows, cols, start, goal);
}

function generateMixed(rows: number, cols: number, density: number, seed: number): Grid {
  const start: Position = { row: Math.floor(rows / 2), col: Math.floor(cols / 4) };
  const goal: Position = { row: Math.floor(rows / 2), col: Math.floor(3 * cols / 4) };
  const grid = createEmptyGrid(rows, cols, start, goal);
  const rng = createRNG(seed);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (isStartOrGoal(r, c, start, goal)) continue;
      if (rng() * 100 < density) { grid.cells[r][c].type = 'wall'; grid.cells[r][c].weight = 1; }
    }
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (isStartOrGoal(r, c, start, goal)) continue;
      if (grid.cells[r][c].type !== 'empty') continue;
      if (rng() < 0.3) { grid.cells[r][c].type = 'weight'; grid.cells[r][c].weight = 2 + Math.floor(rng() * 9); }
    }
  return grid;
}

// ============================================================
// PUBLIC API
// ============================================================

export type GeneratorType = 'random' | 'maze' | 'weighted' | 'mixed' | 'bottleneck' | 'city' | 'open';

export function generateMap(
  type: GeneratorType,
  rows = 25,
  cols = 50,
  params?: { density?: number; seed?: number },
): Grid {
  const seed = params?.seed ?? Math.floor(Math.random() * 1000000);
  const density = params?.density ?? 30;
  switch (type) {
    case 'random': return generateRandomObstacles(rows, cols, density, seed);
    case 'maze': return generateMaze(rows, cols, seed);
    case 'weighted': return generateWeightedTerrain(rows, cols, seed);
    case 'mixed': return generateMixed(rows, cols, density, seed);
    case 'bottleneck': return generateBottleneck(rows, cols, seed);
    case 'city': return generateCityBlocks(rows, cols, seed);
    case 'open': return generateOpenField(rows, cols);
  }
}

/**
 * Convert a Grid object to the wire format expected by the client.
 */
export function gridToWireFormat(grid: Grid) {
  const walls: [number, number][] = [];
  const weights: { pos: [number, number]; weight: number }[] = [];
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c];
      if (cell.type === 'wall') walls.push([r, c]);
      if (cell.type === 'weight') weights.push({ pos: [r, c], weight: cell.weight });
    }
  }
  return {
    rows: grid.rows,
    cols: grid.cols,
    start: [grid.start.row, grid.start.col] as [number, number],
    goal: [grid.goal.row, grid.goal.col] as [number, number],
    walls,
    weights,
  };
}

// ============================================================
// LIGHTWEIGHT ALGORITHM RUNNER (server-side map evaluation)
// ============================================================

export interface AlgoResult {
  expanded: number;
  pathCost: number | null;
  foundPath: boolean;
}

export type AlgoName = 'bfs' | 'dfs' | 'dijkstra' | 'a_star' | 'greedy' | 'swarm' | 'convergent_swarm' | 'zero_one_bfs';
export const ALL_ALGOS: AlgoName[] = ['bfs', 'dfs', 'dijkstra', 'a_star', 'greedy', 'swarm', 'convergent_swarm', 'zero_one_bfs'];

const ALGO_LABELS: Record<AlgoName, string> = {
  bfs: 'BFS', dfs: 'DFS', dijkstra: 'Dijkstra', a_star: 'A*',
  greedy: 'Greedy', swarm: 'Swarm', convergent_swarm: 'Conv. Swarm', zero_one_bfs: '0-1 BFS',
};
export { ALGO_LABELS };

const DIRS: [number, number][] = [[-1,0],[1,0],[0,-1],[0,1]];
function pk(r: number, c: number) { return `${r},${c}`; }

function nbrs(grid: Grid, r: number, c: number): [number, number, number][] {
  const res: [number, number, number][] = [];
  for (const [dr, dc] of DIRS) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < grid.rows && nc >= 0 && nc < grid.cols && grid.cells[nr][nc].type !== 'wall')
      res.push([nr, nc, grid.cells[nr][nc].weight]);
  }
  return res;
}

function mh(r1: number, c1: number, r2: number, c2: number) {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

function runBFS(grid: Grid): AlgoResult {
  const { start: s, goal: g } = grid;
  const vis = new Set<string>([pk(s.row, s.col)]);
  const q: [number, number, number][] = [[s.row, s.col, 0]];
  let exp = 0;
  while (q.length > 0) {
    const [r, c, d] = q.shift()!;
    if (r === g.row && c === g.col) return { expanded: exp, pathCost: d, foundPath: true };
    exp++;
    for (const [nr, nc] of nbrs(grid, r, c)) {
      const nk = pk(nr, nc);
      if (!vis.has(nk)) { vis.add(nk); q.push([nr, nc, d + 1]); }
    }
  }
  return { expanded: exp, pathCost: null, foundPath: false };
}

function runDFS(grid: Grid): AlgoResult {
  const { start: s, goal: g } = grid;
  const vis = new Set<string>();
  const stk: [number, number][] = [[s.row, s.col]];
  let exp = 0;
  while (stk.length > 0) {
    const [r, c] = stk.pop()!;
    const k = pk(r, c);
    if (vis.has(k)) continue;
    vis.add(k);
    if (r === g.row && c === g.col) return { expanded: exp, pathCost: exp, foundPath: true };
    exp++;
    for (const [nr, nc] of nbrs(grid, r, c)) if (!vis.has(pk(nr, nc))) stk.push([nr, nc]);
  }
  return { expanded: exp, pathCost: null, foundPath: false };
}

function runPQ(grid: Grid, mode: 'dijkstra'|'a_star'|'greedy'|'swarm'|'convergent_swarm'): AlgoResult {
  const { start: s, goal: g } = grid;
  const gs = new Map<string, number>();
  const cl = new Set<string>();
  const op: { r: number; c: number; f: number; g: number }[] = [];
  const sk = pk(s.row, s.col);
  gs.set(sk, 0);
  const h0 = mh(s.row, s.col, g.row, g.col);
  const w = mode === 'swarm' ? 2 : mode === 'convergent_swarm' ? 5 : 1;
  const f0 = mode === 'dijkstra' ? 0 : mode === 'greedy' ? h0 : w * h0;
  op.push({ r: s.row, c: s.col, f: f0, g: 0 });
  let exp = 0;
  while (op.length > 0) {
    let mi = 0;
    for (let i = 1; i < op.length; i++) if (op[i].f < op[mi].f) mi = i;
    const cur = op[mi]; op.splice(mi, 1);
    const ck = pk(cur.r, cur.c);
    if (cl.has(ck)) continue;
    cl.add(ck);
    if (cur.r === g.row && cur.c === g.col) return { expanded: exp, pathCost: cur.g, foundPath: true };
    exp++;
    for (const [nr, nc, wt] of nbrs(grid, cur.r, cur.c)) {
      const nk = pk(nr, nc);
      if (cl.has(nk)) continue;
      const ng = cur.g + wt;
      if (ng < (gs.get(nk) ?? Infinity)) {
        gs.set(nk, ng);
        const h = mh(nr, nc, g.row, g.col);
        let f: number;
        if (mode === 'dijkstra') f = ng;
        else if (mode === 'greedy') f = h;
        else f = ng + w * h;
        op.push({ r: nr, c: nc, f, g: ng });
      }
    }
  }
  return { expanded: exp, pathCost: null, foundPath: false };
}

function runZeroOneBFS(grid: Grid): AlgoResult {
  const { start: s, goal: g } = grid;
  const dist = new Map<string, number>();
  const cl = new Set<string>();
  const dq: [number, number][] = [[s.row, s.col]];
  dist.set(pk(s.row, s.col), 0);
  let exp = 0;
  while (dq.length > 0) {
    const [r, c] = dq.shift()!;
    const ck = pk(r, c);
    if (cl.has(ck)) continue;
    cl.add(ck);
    const d = dist.get(ck)!;
    if (r === g.row && c === g.col) return { expanded: exp, pathCost: d, foundPath: true };
    exp++;
    for (const [nr, nc, wt] of nbrs(grid, r, c)) {
      const nk = pk(nr, nc);
      const ew = wt <= 1 ? 0 : 1;
      const nd = d + ew;
      if (nd < (dist.get(nk) ?? Infinity)) {
        dist.set(nk, nd);
        if (ew === 0) dq.unshift([nr, nc]); else dq.push([nr, nc]);
      }
    }
  }
  return { expanded: exp, pathCost: null, foundPath: false };
}

export function runAlgorithm(grid: Grid, algo: AlgoName): AlgoResult {
  switch (algo) {
    case 'bfs': return runBFS(grid);
    case 'dfs': return runDFS(grid);
    case 'dijkstra': return runPQ(grid, 'dijkstra');
    case 'a_star': return runPQ(grid, 'a_star');
    case 'greedy': return runPQ(grid, 'greedy');
    case 'swarm': return runPQ(grid, 'swarm');
    case 'convergent_swarm': return runPQ(grid, 'convergent_swarm');
    case 'zero_one_bfs': return runZeroOneBFS(grid);
  }
}

/**
 * Run all 8 algorithms on a grid, return results map.
 */
export function benchmarkGrid(grid: Grid): Record<AlgoName, AlgoResult> {
  const results = {} as Record<AlgoName, AlgoResult>;
  for (const algo of ALL_ALGOS) results[algo] = runAlgorithm(grid, algo);
  return results;
}

/**
 * Reconstruct a Grid from wire format (as sent by client).
 */
export function gridFromWireFormat(data: {
  rows: number; cols: number;
  walls: number[][]; weights: { pos: number[]; weight: number }[];
  start: number[]; goal: number[];
}): Grid {
  const { rows, cols } = data;
  const start: Position = { row: data.start[0], col: data.start[1] };
  const goal: Position = { row: data.goal[0], col: data.goal[1] };
  const cells: Cell[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({ position: { row: r, col: c }, type: 'empty', weight: 1 });
    }
    cells.push(row);
  }
  cells[start.row][start.col].type = 'start';
  cells[goal.row][goal.col].type = 'goal';
  for (const [r, c] of data.walls) {
    if (r >= 0 && r < rows && c >= 0 && c < cols && cells[r][c].type === 'empty')
      cells[r][c].type = 'wall';
  }
  for (const w of data.weights) {
    const [r, c] = w.pos;
    if (r >= 0 && r < rows && c >= 0 && c < cols && cells[r][c].type === 'empty') {
      cells[r][c].type = 'weight';
      cells[r][c].weight = w.weight;
    }
  }
  return { rows, cols, cells, start, goal };
}

/**
 * Create a modified variant of a grid for "what if" analysis.
 * Removes ~20% of walls to open up paths.
 */
export function createVariant(grid: Grid): { grid: Grid; description: string } {
  // Deep copy
  const cells: Cell[][] = grid.cells.map(row => row.map(c => ({ ...c, position: { ...c.position } })));
  const variant: Grid = { rows: grid.rows, cols: grid.cols, cells, start: { ...grid.start }, goal: { ...grid.goal } };

  // Collect walls
  const walls: [number, number][] = [];
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++)
      if (cells[r][c].type === 'wall') walls.push([r, c]);

  if (walls.length === 0) {
    // No walls → add some weights instead
    let added = 0;
    for (let r = 0; r < grid.rows && added < 30; r++)
      for (let c = 0; c < grid.cols && added < 30; c++) {
        if (cells[r][c].type === 'empty' && Math.random() < 0.12) {
          cells[r][c].type = 'weight';
          cells[r][c].weight = 3 + Math.floor(Math.random() * 7);
          added++;
        }
      }
    return { grid: variant, description: 'added_weights' };
  }

  // Remove ~25% of walls randomly
  const toRemove = Math.max(1, Math.floor(walls.length * 0.25));
  const shuffled = walls.sort(() => Math.random() - 0.5);
  for (let i = 0; i < toRemove; i++) {
    const [r, c] = shuffled[i];
    cells[r][c].type = 'empty';
    cells[r][c].weight = 1;
  }
  return { grid: variant, description: 'removed_walls' };
}
