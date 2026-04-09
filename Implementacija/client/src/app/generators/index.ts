import { Grid, Cell, CellType, Position } from '@shared/types';

/**
 * Seedable pseudo-random number generator (mulberry32).
 */
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
      row.push({ position: { row: r, col: c }, type: CellType.EMPTY, weight: 1 });
    }
    cells.push(row);
  }
  cells[start.row][start.col].type = CellType.START;
  cells[goal.row][goal.col].type = CellType.GOAL;
  return { rows, cols, cells, start, goal };
}

function isStartOrGoal(r: number, c: number, start: Position, goal: Position): boolean {
  return (r === start.row && c === start.col) || (r === goal.row && c === goal.col);
}

// ============================================================
// 1. RANDOM OBSTACLES
// ============================================================
export function generateRandomObstacles(
  rows: number, cols: number, density: number, seed: number,
): Grid {
  const start: Position = { row: Math.floor(rows / 2), col: Math.floor(cols / 4) };
  const goal: Position = { row: Math.floor(rows / 2), col: Math.floor(3 * cols / 4) };
  const grid = createEmptyGrid(rows, cols, start, goal);
  const rng = createRNG(seed);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (isStartOrGoal(r, c, start, goal)) continue;
      if (rng() < density / 100) {
        grid.cells[r][c].type = CellType.WALL;
      }
    }
  }
  return grid;
}

// ============================================================
// 2. RECURSIVE DIVISION MAZE
// ============================================================
export function generateMaze(rows: number, cols: number, seed: number): Grid {
  const start: Position = { row: 1, col: 1 };
  const goal: Position = { row: rows - 2, col: cols - 2 };
  const grid = createEmptyGrid(rows, cols, start, goal);
  const rng = createRNG(seed);

  // Fill everything with walls
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      grid.cells[r][c].type = CellType.WALL;
    }
  }

  // Recursive division
  function carve(r: number, c: number) {
    grid.cells[r][c].type = CellType.EMPTY;
    const dirs = [[0, 2], [2, 0], [0, -2], [-2, 0]];
    // Shuffle
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1 &&
          grid.cells[nr][nc].type === CellType.WALL) {
        grid.cells[r + dr / 2][c + dc / 2].type = CellType.EMPTY;
        carve(nr, nc);
      }
    }
  }

  carve(1, 1);
  grid.cells[start.row][start.col].type = CellType.START;
  grid.cells[goal.row][goal.col].type = CellType.GOAL;
  // Ensure goal is reachable — carve around it
  if (goal.row > 0) grid.cells[goal.row - 1][goal.col].type = CellType.EMPTY;
  if (goal.col > 0) grid.cells[goal.row][goal.col - 1].type = CellType.EMPTY;
  return grid;
}

// ============================================================
// 3. WEIGHTED TERRAIN (zones)
// ============================================================
export function generateWeightedTerrain(
  rows: number, cols: number, seed: number,
): Grid {
  const start: Position = { row: Math.floor(rows / 2), col: Math.floor(cols / 4) };
  const goal: Position = { row: Math.floor(rows / 2), col: Math.floor(3 * cols / 4) };
  const grid = createEmptyGrid(rows, cols, start, goal);
  const rng = createRNG(seed);

  // Scatter random weights across the map (30-50% coverage)
  const coverage = 0.3 + rng() * 0.2;
  const totalCells = rows * cols;
  const weightedCount = Math.floor(totalCells * coverage);

  for (let i = 0; i < weightedCount; i++) {
    const r = Math.floor(rng() * rows);
    const c = Math.floor(rng() * cols);
    if (isStartOrGoal(r, c, start, goal)) continue;
    if (grid.cells[r][c].type === CellType.WALL) continue;
    grid.cells[r][c].type = CellType.WEIGHT;
    grid.cells[r][c].weight = 2 + Math.floor(rng() * 9); // 2-10
  }
  return grid;
}

// ============================================================
// 4. BOTTLENECK / NARROW PASSAGE
// ============================================================
export function generateBottleneck(rows: number, cols: number, seed: number): Grid {
  const start: Position = { row: Math.floor(rows / 2), col: 1 };
  const goal: Position = { row: Math.floor(rows / 2), col: cols - 2 };
  const grid = createEmptyGrid(rows, cols, start, goal);
  const rng = createRNG(seed);

  // Vertical wall in the middle with one narrow passage
  const wallCol = Math.floor(cols / 2);
  const passageRow = Math.floor(rng() * (rows - 4)) + 2;

  for (let r = 0; r < rows; r++) {
    if (Math.abs(r - passageRow) > 1) {
      grid.cells[r][wallCol].type = CellType.WALL;
      if (wallCol > 0) grid.cells[r][wallCol - 1].type = CellType.WALL;
      if (wallCol < cols - 1) grid.cells[r][wallCol + 1].type = CellType.WALL;
    }
  }

  // Add some random obstacles
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (isStartOrGoal(r, c, start, goal)) continue;
      if (grid.cells[r][c].type !== CellType.EMPTY) continue;
      if (rng() < 0.08) {
        grid.cells[r][c].type = CellType.WALL;
      }
    }
  }
  return grid;
}

// ============================================================
// 5. CITY BLOCKS (orthogonal corridors)
// ============================================================
export function generateCityBlocks(rows: number, cols: number, seed: number): Grid {
  const start: Position = { row: 1, col: 1 };
  const goal: Position = { row: rows - 2, col: cols - 2 };
  const grid = createEmptyGrid(rows, cols, start, goal);
  const rng = createRNG(seed);

  const blockSizeR = 4 + Math.floor(rng() * 3);
  const blockSizeC = 4 + Math.floor(rng() * 3);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (isStartOrGoal(r, c, start, goal)) continue;
      const isStreetR = r % blockSizeR === 0;
      const isStreetC = c % blockSizeC === 0;
      if (!isStreetR && !isStreetC) {
        grid.cells[r][c].type = CellType.WALL;
      }
    }
  }
  return grid;
}

// ============================================================
// 6. OPEN FIELD (empty — baseline)
// ============================================================
export function generateOpenField(rows: number, cols: number): Grid {
  const start: Position = { row: Math.floor(rows / 2), col: Math.floor(cols / 4) };
  const goal: Position = { row: Math.floor(rows / 2), col: Math.floor(3 * cols / 4) };
  return createEmptyGrid(rows, cols, start, goal);
}

// ============================================================
// FACTORY
// ============================================================
export type GeneratorType = 'random' | 'maze' | 'weighted' | 'mixed' | 'bottleneck' | 'city' | 'open';

export function generateMixed(rows: number, cols: number, density: number, seed: number): Grid {
  const start: Position = { row: Math.floor(rows / 2), col: Math.floor(cols / 4) };
  const goal: Position = { row: Math.floor(rows / 2), col: Math.floor(3 * cols / 4) };
  const grid = createEmptyGrid(rows, cols, start, goal);
  const rng = createRNG(seed);

  // Random walls (~density%)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (isStartOrGoal(r, c, start, goal)) continue;
      if (rng() * 100 < density) {
        grid.cells[r][c].type = CellType.WALL;
        grid.cells[r][c].weight = 1;
      }
    }
  }
  // Random weights on empty cells (~30%)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (isStartOrGoal(r, c, start, goal)) continue;
      if (grid.cells[r][c].type !== CellType.EMPTY) continue;
      if (rng() < 0.3) {
        grid.cells[r][c].type = CellType.WEIGHT;
        grid.cells[r][c].weight = 2 + Math.floor(rng() * 9);
      }
    }
  }
  return grid;
}

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

export const GENERATOR_INFO: Record<GeneratorType, { name: string; nameEn: string; short: string; description: string }> = {
  maze: { name: 'Lavirint', nameEn: 'Maze', short: 'Maze', description: 'Rekurzivna podela prostora, garantovana rešivost' },
  random: { name: 'Nasumične prepreke', nameEn: 'Random Obstacles', short: 'Random', description: 'Nasumično raspoređene prepreke (podešava se gustina %)' },
  weighted: { name: 'Težinski teren', nameEn: 'Weighted Terrain', short: 'Weight', description: 'Zone sa različitim težinama na terenu' },
  mixed: { name: 'Mešovito', nameEn: 'Mixed', short: 'Mixed', description: 'Nasumične prepreke + težinski teren' },
  bottleneck: { name: 'Usko grlo', nameEn: 'Bottleneck', short: 'Bottle', description: 'Zid sa jednim uskim prolazom' },
  city: { name: 'Gradski blokovi', nameEn: 'City Blocks', short: 'City', description: 'Ortogonalni koridori (mreža ulica)' },
  open: { name: 'Otvoreno polje', nameEn: 'Open Field', short: 'Open', description: 'Prazan grid bez prepreka (bazna referenca)' },
};
