import {
  AlgorithmType,
  AlgorithmOptions,
  PathfindingAlgorithm,
  Grid,
  Position,
} from '@shared/types';
export type { PathfindingAlgorithm } from '@shared/types';
import { BFS } from './bfs';
import { DFS } from './dfs';
import { BestFirstEngine } from './best-first-engine';
import { ZeroOneBFS } from './zero-one-bfs';

/**
 * Factory: creates and initializes the correct algorithm instance.
 */
export function createAlgorithm(
  grid: Grid,
  start: Position,
  goal: Position,
  options: AlgorithmOptions,
): PathfindingAlgorithm {
  let algorithm: PathfindingAlgorithm;

  switch (options.algorithm) {
    case AlgorithmType.BFS:
      algorithm = new BFS();
      break;

    case AlgorithmType.DFS:
      algorithm = new DFS();
      break;

    case AlgorithmType.ZERO_ONE_BFS:
      algorithm = new ZeroOneBFS();
      break;

    // All Best-First family members share the same engine
    case AlgorithmType.DIJKSTRA:
    case AlgorithmType.A_STAR:
    case AlgorithmType.GREEDY:
    case AlgorithmType.SWARM:
    case AlgorithmType.CONVERGENT_SWARM:
      algorithm = new BestFirstEngine();
      break;

    default:
      throw new Error(`Unknown algorithm: ${options.algorithm}`);
  }

  algorithm.init(grid, start, goal, options);
  return algorithm;
}

/**
 * Run algorithm to completion (all steps at once).
 * Returns the full trace and result.
 */
export function runAlgorithm(
  grid: Grid,
  start: Position,
  goal: Position,
  options: AlgorithmOptions,
) {
  const startTime = performance.now();
  const algo = createAlgorithm(grid, start, goal, options);

  while (!algo.isDone()) {
    algo.step();
  }

  const endTime = performance.now();
  const result = algo.getResult();
  const trace = algo.getTrace();

  return {
    result,
    trace,
    executionTimeMs: endTime - startTime,
  };
}

/**
 * Algorithm metadata for UI display.
 */
export const ALGORITHM_INFO: Record<AlgorithmType, {
  name: string;
  description: string;
  optimal: boolean;
  weighted: boolean;
  category: string;
}> = {
  [AlgorithmType.BFS]: {
    name: 'BFS',
    description: 'Breadth-First Search — širi se sloj po sloj, garantuje najkraći put po broju koraka',
    optimal: true,
    weighted: false,
    category: 'Neponderisani',
  },
  [AlgorithmType.DFS]: {
    name: 'DFS',
    description: 'Depth-First Search — ide u dubinu jednim putem, NE garantuje najkraći put',
    optimal: false,
    weighted: false,
    category: 'Neponderisani',
  },
  [AlgorithmType.DIJKSTRA]: {
    name: 'Dijkstra',
    description: 'Uzima čvor sa najmanjom ukupnom cenom g(n), garantuje optimalan put',
    optimal: true,
    weighted: true,
    category: 'Ponderisani',
  },
  [AlgorithmType.A_STAR]: {
    name: 'A*',
    description: 'f(n) = g(n) + h(n) — Dijkstra sa heuristikom, garantuje optimalan put',
    optimal: true,
    weighted: true,
    category: 'Ponderisani',
  },
  [AlgorithmType.GREEDY]: {
    name: 'Greedy Best-First',
    description: 'f(n) = h(n) — samo heuristika, najbrži ali često neoptimalan',
    optimal: false,
    weighted: true,
    category: 'Heuristički',
  },
  [AlgorithmType.SWARM]: {
    name: 'Swarm',
    description: 'f(n) = g(n) + w₁·h(n) — kompromis između A* i Greedy (w₁ > 1)',
    optimal: false,
    weighted: true,
    category: 'Weighted A*',
  },
  [AlgorithmType.CONVERGENT_SWARM]: {
    name: 'Convergent Swarm',
    description: 'f(n) = g(n) + w₂·h(n) — agresivnija varijanta Swarm (w₂ > w₁)',
    optimal: false,
    weighted: true,
    category: 'Weighted A*',
  },
  [AlgorithmType.ZERO_ONE_BFS]: {
    name: '0-1 BFS',
    description: 'Specijalizovan za težine {0, 1} — koristi deque, brži od Dijkstre',
    optimal: true,
    weighted: true,
    category: 'Specijalizovani',
  },
};
