import { Position, Grid, CellType, NeighborMode } from '@shared/types';

const FOUR_DIRS: [number, number][] = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
];

const EIGHT_DIRS: [number, number][] = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [-1, 1], [1, -1], [1, 1],
];

export function getNeighbors(
  grid: Grid,
  pos: Position,
  mode: NeighborMode,
): Position[] {
  const dirs = mode === NeighborMode.FOUR ? FOUR_DIRS : EIGHT_DIRS;
  const neighbors: Position[] = [];

  for (const [dr, dc] of dirs) {
    const row = pos.row + dr;
    const col = pos.col + dc;

    if (row < 0 || row >= grid.rows || col < 0 || col >= grid.cols) continue;
    if (grid.cells[row][col].type === CellType.WALL) continue;

    // For diagonal movement, prevent cutting corners through walls
    if (dr !== 0 && dc !== 0) {
      if (grid.cells[pos.row + dr][pos.col].type === CellType.WALL) continue;
      if (grid.cells[pos.row][pos.col + dc].type === CellType.WALL) continue;
    }

    neighbors.push({ row, col });
  }

  return neighbors;
}

export function getMoveCost(
  grid: Grid,
  from: Position,
  to: Position,
): number {
  const cell = grid.cells[to.row][to.col];
  const isDiagonal = from.row !== to.row && from.col !== to.col;
  const baseCost = isDiagonal ? Math.SQRT2 : 1;
  return baseCost * cell.weight;
}
