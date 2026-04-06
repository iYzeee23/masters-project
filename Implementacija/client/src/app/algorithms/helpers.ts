import { Position, HeuristicType } from '@shared/types';

export function heuristic(a: Position, b: Position, type: HeuristicType): number {
  const dx = Math.abs(a.col - b.col);
  const dy = Math.abs(a.row - b.row);

  switch (type) {
    case HeuristicType.MANHATTAN:
      return dx + dy;
    case HeuristicType.EUCLIDEAN:
      return Math.sqrt(dx * dx + dy * dy);
    case HeuristicType.CHEBYSHEV:
      return Math.max(dx, dy);
    case HeuristicType.OCTILE:
      return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy);
  }
}

export function posKey(pos: Position): string {
  return `${pos.row},${pos.col}`;
}

export function posEqual(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}
