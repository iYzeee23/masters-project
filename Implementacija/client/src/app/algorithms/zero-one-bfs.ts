import {
  Position, Grid, AlgorithmOptions, AlgorithmType,
  AlgorithmEvent, EventType, AlgorithmResult, PathfindingAlgorithm,
} from '@shared/types';
import { posKey, posEqual } from './helpers';
import { getNeighbors } from './grid-utils';

/**
 * 0-1 BFS — Specialized for graphs with edge weights of only 0 or 1.
 * Uses a deque: weight 0 → push to front, weight 1 → push to back.
 * Faster than Dijkstra for this special case. Guarantees optimal path.
 */
export class ZeroOneBFS implements PathfindingAlgorithm {
  private grid!: Grid;
  private start!: Position;
  private goal!: Position;
  private options!: AlgorithmOptions;

  private deque: Position[] = [];
  private dist: Map<string, number> = new Map();
  private cameFrom: Map<string, Position> = new Map();
  private closedSet: Set<string> = new Set();

  private trace: AlgorithmEvent[] = [];
  private done = false;
  private expandedCount = 0;
  private maxFrontierSize = 0;
  private result: AlgorithmResult | null = null;

  init(grid: Grid, start: Position, goal: Position, options: AlgorithmOptions): void {
    this.grid = grid;
    this.start = start;
    this.goal = goal;
    this.options = { ...options, algorithm: AlgorithmType.ZERO_ONE_BFS };

    this.deque = [start];
    this.dist = new Map([[posKey(start), 0]]);
    this.cameFrom = new Map();
    this.closedSet = new Set();
    this.trace = [];
    this.done = false;
    this.expandedCount = 0;
    this.maxFrontierSize = 1;
    this.result = null;

    this.trace.push({
      type: EventType.INIT,
      start,
      goal,
      algorithm: AlgorithmType.ZERO_ONE_BFS,
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

    if (this.deque.length === 0) {
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

    const current = this.deque.shift()!;
    const currentKey = posKey(current);
    const currentDist = this.dist.get(currentKey)!;

    // Skip stale deque entries (node was already expanded at a better distance)
    if (this.closedSet.has(currentKey)) {
      return events;
    }
    this.closedSet.add(currentKey);

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
        totalCost: currentDist,
      };
      events.push(foundEvent);
      this.trace.push(foundEvent);
      this.result = {
        path,
        cost: currentDist,
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
      const cell = this.grid.cells[neighbor.row][neighbor.col];

      // In 0-1 BFS: weight=1 (empty) → cost 0, weight≥2 (weighted) → cost 1
      const edgeWeight = cell.weight <= 1 ? 0 : 1;
      const newDist = currentDist + edgeWeight;
      const oldDist = this.dist.get(neighborKey);

      if (oldDist === undefined || newDist < oldDist) {
        const isNew = oldDist === undefined;
        this.dist.set(neighborKey, newDist);
        this.cameFrom.set(neighborKey, current);

        // Key 0-1 BFS logic: weight 0 → front, weight 1 → back
        if (edgeWeight === 0) {
          this.deque.unshift(neighbor);
        } else {
          this.deque.push(neighbor);
        }

        if (isNew) {
          const openAddEvent: AlgorithmEvent = {
            type: EventType.OPEN_ADD,
            node: neighbor,
            g: newDist,
            h: 0,
            f: newDist,
            parent: current,
          };
          events.push(openAddEvent);
          this.trace.push(openAddEvent);
        } else {
          const relaxEvent: AlgorithmEvent = {
            type: EventType.RELAX_EDGE,
            from: current,
            to: neighbor,
            newG: newDist,
            oldG: oldDist!,
            parent: current,
          };
          events.push(relaxEvent);
          this.trace.push(relaxEvent);

          const openUpdateEvent: AlgorithmEvent = {
            type: EventType.OPEN_UPDATE,
            node: neighbor,
            g: newDist,
            h: 0,
            f: newDist,
            parent: current,
          };
          events.push(openUpdateEvent);
          this.trace.push(openUpdateEvent);
        }
      }
    }

    this.maxFrontierSize = Math.max(this.maxFrontierSize, this.deque.length);

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
