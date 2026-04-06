// ============================================================
// GRID & NODE TYPES
// ============================================================

export interface Position {
  row: number;
  col: number;
}

export enum CellType {
  EMPTY = 'empty',
  WALL = 'wall',
  START = 'start',
  GOAL = 'goal',
  WEIGHT = 'weight',
}

export interface Cell {
  position: Position;
  type: CellType;
  weight: number; // 1 for normal, >1 for weighted terrain, 0 for 0-1 BFS
}

export interface Grid {
  rows: number;
  cols: number;
  cells: Cell[][];
  start: Position;
  goal: Position;
}

// ============================================================
// ALGORITHM TYPES
// ============================================================

export enum AlgorithmType {
  BFS = 'bfs',
  DFS = 'dfs',
  DIJKSTRA = 'dijkstra',
  A_STAR = 'a_star',
  GREEDY = 'greedy',
  SWARM = 'swarm',
  CONVERGENT_SWARM = 'convergent_swarm',
  ZERO_ONE_BFS = 'zero_one_bfs',
}

export enum HeuristicType {
  MANHATTAN = 'manhattan',
  EUCLIDEAN = 'euclidean',
  CHEBYSHEV = 'chebyshev',
  OCTILE = 'octile',
}

export enum NeighborMode {
  FOUR = 4,
  EIGHT = 8,
}

export interface AlgorithmOptions {
  algorithm: AlgorithmType;
  heuristic: HeuristicType;
  neighborMode: NeighborMode;
  swarmWeight?: number; // w parameter for Swarm/Convergent Swarm
  allowDiagonal?: boolean;
}

// ============================================================
// TRACE / EVENT SYSTEM
// ============================================================

export enum EventType {
  INIT = 'INIT',
  SET_CURRENT = 'SET_CURRENT',
  OPEN_ADD = 'OPEN_ADD',
  OPEN_UPDATE = 'OPEN_UPDATE',
  CLOSE_ADD = 'CLOSE_ADD',
  RELAX_EDGE = 'RELAX_EDGE',
  FOUND_PATH = 'FOUND_PATH',
  NO_PATH = 'NO_PATH',
}

export interface InitEvent {
  type: EventType.INIT;
  start: Position;
  goal: Position;
  algorithm: AlgorithmType;
  options: AlgorithmOptions;
}

export interface SetCurrentEvent {
  type: EventType.SET_CURRENT;
  node: Position;
}

export interface OpenAddEvent {
  type: EventType.OPEN_ADD;
  node: Position;
  g: number;
  h: number;
  f: number;
  parent: Position | null;
}

export interface OpenUpdateEvent {
  type: EventType.OPEN_UPDATE;
  node: Position;
  g: number;
  h: number;
  f: number;
  parent: Position | null;
}

export interface CloseAddEvent {
  type: EventType.CLOSE_ADD;
  node: Position;
}

export interface RelaxEdgeEvent {
  type: EventType.RELAX_EDGE;
  from: Position;
  to: Position;
  newG: number;
  oldG: number;
  parent: Position;
}

export interface FoundPathEvent {
  type: EventType.FOUND_PATH;
  path: Position[];
  totalCost: number;
}

export interface NoPathEvent {
  type: EventType.NO_PATH;
}

export type AlgorithmEvent =
  | InitEvent
  | SetCurrentEvent
  | OpenAddEvent
  | OpenUpdateEvent
  | CloseAddEvent
  | RelaxEdgeEvent
  | FoundPathEvent
  | NoPathEvent;

// ============================================================
// ALGORITHM INTERFACE (Step-based State Machine)
// ============================================================

export interface AlgorithmResult {
  path: Position[] | null;
  cost: number;
  expandedCount: number;
  maxFrontierSize: number;
  totalSteps: number;
}

export interface PathfindingAlgorithm {
  init(grid: Grid, start: Position, goal: Position, options: AlgorithmOptions): void;
  step(): AlgorithmEvent[];
  isDone(): boolean;
  getResult(): AlgorithmResult;
  getTrace(): AlgorithmEvent[];
}

// ============================================================
// RUN & METRICS
// ============================================================

export interface RunMetrics {
  algorithm: AlgorithmType;
  expandedNodes: number;
  maxFrontierSize: number;
  pathCost: number | null;
  pathLength: number | null;
  totalSteps: number;
  executionTimeMs: number;
  foundPath: boolean;
}

// ============================================================
// VISUALIZATION STATE
// ============================================================

export enum VisualizationState {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  FINISHED = 'finished',
  STEPPING = 'stepping',
}

export interface VisualizationConfig {
  speed: number; // ms per step
  showVisited: boolean;
  showFrontier: boolean;
  showPath: boolean;
  showWeights: boolean;
}
