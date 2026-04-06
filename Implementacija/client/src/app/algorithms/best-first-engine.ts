import {
  Position, Grid, AlgorithmOptions, AlgorithmType,
  AlgorithmEvent, EventType, AlgorithmResult, PathfindingAlgorithm,
} from '@shared/types';
import { heuristic, posKey, posEqual } from './helpers';
import { getNeighbors, getMoveCost } from './grid-utils';
import { MinHeap } from './min-heap';

/**
 * Unified Best-First Search engine.
 * Dijkstra, A*, Greedy, Swarm, and Convergent Swarm all use this engine.
 * The only difference is the priority function f(n).
 */
export class BestFirstEngine implements PathfindingAlgorithm {
  private grid!: Grid;
  private start!: Position;
  private goal!: Position;
  private options!: AlgorithmOptions;

  private openSet!: MinHeap;
  private gScore!: Map<string, number>;
  private hScore!: Map<string, number>;
  private fScore!: Map<string, number>;
  private cameFrom!: Map<string, Position>;
  private closedSet!: Set<string>;

  private trace: AlgorithmEvent[] = [];
  private done = false;
  private expandedCount = 0;
  private maxFrontierSize = 0;
  private result: AlgorithmResult | null = null;

  init(grid: Grid, start: Position, goal: Position, options: AlgorithmOptions): void {
    this.grid = grid;
    this.start = start;
    this.goal = goal;
    this.options = options;

    this.openSet = new MinHeap();
    this.gScore = new Map();
    this.hScore = new Map();
    this.fScore = new Map();
    this.cameFrom = new Map();
    this.closedSet = new Set();
    this.trace = [];
    this.done = false;
    this.expandedCount = 0;
    this.maxFrontierSize = 0;
    this.result = null;

    const startKey = posKey(start);
    const h = this.computeH(start);
    const g = 0;
    const f = this.computeF(g, h);

    this.gScore.set(startKey, g);
    this.hScore.set(startKey, h);
    this.fScore.set(startKey, f);
    this.openSet.push(start, f);

    this.trace.push({
      type: EventType.INIT,
      start,
      goal,
      algorithm: options.algorithm,
      options,
    });

    this.trace.push({
      type: EventType.OPEN_ADD,
      node: start,
      g,
      h,
      f,
      parent: null,
    });

    this.maxFrontierSize = 1;
  }

  step(): AlgorithmEvent[] {
    if (this.done) return [];

    const events: AlgorithmEvent[] = [];

    if (this.openSet.isEmpty()) {
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

    const current = this.openSet.pop()!;
    const currentKey = posKey(current);

    // Set current
    const setCurrentEvent: AlgorithmEvent = {
      type: EventType.SET_CURRENT,
      node: current,
    };
    events.push(setCurrentEvent);
    this.trace.push(setCurrentEvent);

    // Check if goal reached
    if (posEqual(current, this.goal)) {
      this.done = true;
      const path = this.reconstructPath(current);
      const totalCost = this.gScore.get(currentKey)!;
      const foundEvent: AlgorithmEvent = {
        type: EventType.FOUND_PATH,
        path,
        totalCost,
      };
      events.push(foundEvent);
      this.trace.push(foundEvent);
      this.result = {
        path,
        cost: totalCost,
        expandedCount: this.expandedCount,
        maxFrontierSize: this.maxFrontierSize,
        totalSteps: this.trace.length,
      };
      return events;
    }

    // Add to closed set
    this.closedSet.add(currentKey);
    this.expandedCount++;
    const closeEvent: AlgorithmEvent = {
      type: EventType.CLOSE_ADD,
      node: current,
    };
    events.push(closeEvent);
    this.trace.push(closeEvent);

    // Explore neighbors
    const neighbors = getNeighbors(this.grid, current, this.options.neighborMode);
    for (const neighbor of neighbors) {
      const neighborKey = posKey(neighbor);
      if (this.closedSet.has(neighborKey)) continue;

      const moveCost = getMoveCost(this.grid, current, neighbor);
      const tentativeG = this.gScore.get(currentKey)! + moveCost;

      if (!this.openSet.has(neighbor) && !this.gScore.has(neighborKey)) {
        // New node discovered
        const h = this.computeH(neighbor);
        const f = this.computeF(tentativeG, h);

        this.gScore.set(neighborKey, tentativeG);
        this.hScore.set(neighborKey, h);
        this.fScore.set(neighborKey, f);
        this.cameFrom.set(neighborKey, current);
        this.openSet.push(neighbor, f);

        const openAddEvent: AlgorithmEvent = {
          type: EventType.OPEN_ADD,
          node: neighbor,
          g: tentativeG,
          h,
          f,
          parent: current,
        };
        events.push(openAddEvent);
        this.trace.push(openAddEvent);
      } else if (tentativeG < (this.gScore.get(neighborKey) ?? Infinity)) {
        // Better path found
        const oldG = this.gScore.get(neighborKey)!;
        const h = this.hScore.get(neighborKey)!;
        const f = this.computeF(tentativeG, h);

        this.gScore.set(neighborKey, tentativeG);
        this.fScore.set(neighborKey, f);
        this.cameFrom.set(neighborKey, current);

        if (this.openSet.has(neighbor)) {
          this.openSet.updatePriority(neighbor, f);
        }

        const relaxEvent: AlgorithmEvent = {
          type: EventType.RELAX_EDGE,
          from: current,
          to: neighbor,
          newG: tentativeG,
          oldG,
          parent: current,
        };
        events.push(relaxEvent);
        this.trace.push(relaxEvent);

        const openUpdateEvent: AlgorithmEvent = {
          type: EventType.OPEN_UPDATE,
          node: neighbor,
          g: tentativeG,
          h,
          f,
          parent: current,
        };
        events.push(openUpdateEvent);
        this.trace.push(openUpdateEvent);
      }
    }

    this.maxFrontierSize = Math.max(this.maxFrontierSize, this.openSet.size);

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

  // ============================================================
  // PRIORITY FUNCTION — the only difference between algorithms
  // ============================================================

  private computeH(pos: Position): number {
    switch (this.options.algorithm) {
      case AlgorithmType.DIJKSTRA:
        return 0; // Dijkstra: no heuristic
      case AlgorithmType.GREEDY:
      case AlgorithmType.A_STAR:
      case AlgorithmType.SWARM:
      case AlgorithmType.CONVERGENT_SWARM:
        return heuristic(pos, this.goal, this.options.heuristic);
      default:
        return 0;
    }
  }

  private computeF(g: number, h: number): number {
    switch (this.options.algorithm) {
      case AlgorithmType.DIJKSTRA:
        // f(n) = g(n)
        return g;
      case AlgorithmType.A_STAR:
        // f(n) = g(n) + h(n)
        return g + h;
      case AlgorithmType.GREEDY:
        // f(n) = h(n)
        return h;
      case AlgorithmType.SWARM:
        // f(n) = g(n) + w1 * h(n), w1 > 1
        return g + (this.options.swarmWeight ?? 2) * h;
      case AlgorithmType.CONVERGENT_SWARM:
        // f(n) = g(n) + w2 * h(n), w2 > w1
        return g + (this.options.swarmWeight ?? 5) * h;
      default:
        return g + h;
    }
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
