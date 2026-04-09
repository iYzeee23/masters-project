import {
  Position, Grid, AlgorithmOptions, AlgorithmType,
  AlgorithmEvent, EventType, AlgorithmResult, PathfindingAlgorithm,
} from '@shared/types';
import { posKey, posEqual } from './helpers';
import { getNeighbors } from './grid-utils';

/**
 * BFS — Breadth-First Search.
 * Uses FIFO queue. Guarantees shortest path by number of steps (unweighted).
 */
export class BFS implements PathfindingAlgorithm {
  private grid!: Grid;
  private start!: Position;
  private goal!: Position;
  private options!: AlgorithmOptions;

  private queue: Position[] = [];
  private visited: Set<string> = new Set();
  private cameFrom: Map<string, Position> = new Map();
  private dist: Map<string, number> = new Map();

  private trace: AlgorithmEvent[] = [];
  private done = false;
  private expandedCount = 0;
  private maxFrontierSize = 0;
  private result: AlgorithmResult | null = null;

  init(grid: Grid, start: Position, goal: Position, options: AlgorithmOptions): void {
    this.grid = grid;
    this.start = start;
    this.goal = goal;
    this.options = { ...options, algorithm: AlgorithmType.BFS };

    this.queue = [start];
    this.visited = new Set([posKey(start)]);
    this.cameFrom = new Map();
    this.dist = new Map([[posKey(start), 0]]);
    this.trace = [];
    this.done = false;
    this.expandedCount = 0;
    this.maxFrontierSize = 1;
    this.result = null;

    this.trace.push({
      type: EventType.INIT,
      start,
      goal,
      algorithm: AlgorithmType.BFS,
      options: this.options,
    });

    this.trace.push({
      type: EventType.OPEN_ADD,
      node: start,
      g: 0, h: 0, f: 0,
      parent: null,
    });
  }

  step(): AlgorithmEvent[] {
    if (this.done) return [];
    const events: AlgorithmEvent[] = [];

    if (this.queue.length === 0) {
      this.done = true;
      const noPathEvent: AlgorithmEvent = { type: EventType.NO_PATH };
      events.push(noPathEvent);
      this.trace.push(noPathEvent);
      this.result = {
        path: null,
        cost: Infinity,
        expandedCount: this.expandedCount,
        maxFrontierSize: this.maxFrontierSize,
        totalSteps: this.trace.length,
      };
      return events;
    }

    const current = this.queue.shift()!;
    const currentKey = posKey(current);

    const setCurrentEvent: AlgorithmEvent = {
      type: EventType.SET_CURRENT,
      node: current,
    };
    events.push(setCurrentEvent);
    this.trace.push(setCurrentEvent);

    if (posEqual(current, this.goal)) {
      this.done = true;
      const path = this.reconstructPath(current);
      const foundEvent: AlgorithmEvent = {
        type: EventType.FOUND_PATH,
        path,
        totalCost: path.length - 1,
      };
      events.push(foundEvent);
      this.trace.push(foundEvent);
      this.result = {
        path,
        cost: path.length - 1,
        expandedCount: this.expandedCount,
        maxFrontierSize: this.maxFrontierSize,
        totalSteps: this.trace.length,
      };
      return events;
    }

    this.expandedCount++;
    const closeEvent: AlgorithmEvent = {
      type: EventType.CLOSE_ADD,
      node: current,
    };
    events.push(closeEvent);
    this.trace.push(closeEvent);

    const neighbors = getNeighbors(this.grid, current, this.options.neighborMode);
    for (const neighbor of neighbors) {
      const neighborKey = posKey(neighbor);
      if (this.visited.has(neighborKey)) continue;

      this.visited.add(neighborKey);
      this.cameFrom.set(neighborKey, current);
      this.queue.push(neighbor);

      const depth = (this.dist.get(currentKey) ?? 0) + 1;
      this.dist.set(neighborKey, depth);
      const openAddEvent: AlgorithmEvent = {
        type: EventType.OPEN_ADD,
        node: neighbor,
        g: depth,
        h: 0,
        f: depth,
        parent: current,
      };
      events.push(openAddEvent);
      this.trace.push(openAddEvent);
    }

    this.maxFrontierSize = Math.max(this.maxFrontierSize, this.queue.length);

    return events;
  }

  isDone(): boolean {
    return this.done;
  }

  getResult(): AlgorithmResult {
    if (this.result) return this.result;
    return {
      path: null,
      cost: Infinity,
      expandedCount: this.expandedCount,
      maxFrontierSize: this.maxFrontierSize,
      totalSteps: this.trace.length,
    };
  }

  getTrace(): AlgorithmEvent[] {
    return [...this.trace];
  }

  private reconstructPath(current: Position): Position[] {
    const path: Position[] = [current];
    let key = posKey(current);
    while (this.cameFrom.has(key)) {
      current = this.cameFrom.get(key)!;
      key = posKey(current);
      path.unshift(current);
    }
    return path;
  }
}
